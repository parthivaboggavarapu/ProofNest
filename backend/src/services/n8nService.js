const axios = require('axios');
const crypto = require('crypto');
const { ProcessingJob, Document, User } = require('../models');
const { signPayload, generateDocumentAccessToken } = require('../middleware/n8nAuthMiddleware');
const ocrService = require('./ocrService');
const aiService = require('./aiService');

class N8nService {
  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.docWebhook = process.env.N8N_DOCUMENT_PROCESSING_WEBHOOK || '';
    this.aiChatWebhook = process.env.N8N_AI_CHAT_WEBHOOK || '';
    this.secret = process.env.N8N_WEBHOOK_SECRET || 'n8n_default_shared_secret_2026';
    this.backendPublicUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  }

  /**
   * Dispatches an HTTP request to an n8n webhook with HMAC signature headers
   */
  async dispatchToN8n(webhookUrl, data, timeoutMs = 25000) {
    const timestamp = Date.now().toString();
    const signature = signPayload({ ...data, timestamp }, this.secret);

    return await axios.post(webhookUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': signature,
        'X-N8N-Timestamp': timestamp,
        'Authorization': `Bearer ${this.secret}`
      },
      timeout: timeoutMs
    });
  }

  /**
   * Initiates document OCR processing via n8n workflow
   * If n8n is unavailable or unconfigured, falls back gracefully to internal OCR
   */
  async triggerDocumentProcessing(userId, documentId) {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) {
      throw new Error('Document not found or unauthorized');
    }

    const jobId = `job_ocr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const token = generateDocumentAccessToken(documentId);
    const secureDownloadUrl = `${this.backendPublicUrl}/api/integrations/n8n/documents/${documentId}/download?token=${token}`;

    const job = await ProcessingJob.create({
      jobId,
      user: userId,
      document: documentId,
      type: 'ocr_extraction',
      status: 'processing',
      payload: {
        documentId,
        fileName: document.originalFileName || document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType
      }
    });

    // Check if n8n webhook is configured
    if (this.docWebhook && this.docWebhook.startsWith('http')) {
      // Asynchronously trigger n8n without blocking Express response
      this.dispatchToN8n(this.docWebhook, {
        jobId,
        userId: userId.toString(),
        documentId: documentId.toString(),
        fileName: document.fileName,
        mimeType: document.mimeType,
        downloadUrl: secureDownloadUrl,
        callbackUrl: `${this.backendPublicUrl}/api/integrations/n8n/document-processing/callback`
      }).catch(async (err) => {
        console.warn(`[n8n] Webhook dispatch error: ${err.message}. Falling back to internal OCR.`);
        await this.fallbackInternalOcr(job, document);
      });
    } else {
      // Standalone dev mode: execute fallback internal OCR immediately
      this.fallbackInternalOcr(job, document);
    }

    return {
      jobId,
      status: job.status,
      documentId
    };
  }

  /**
   * Fallback runner: executes local tesseract/pdf-parse when n8n is not running
   */
  async fallbackInternalOcr(job, document) {
    try {
      const db = require('../config/db');
      const bucket = db.getGridFSBucket();
      const chunks = [];

      const downloadStream = bucket.openDownloadStream(document.gridFsFileId);
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      
      downloadStream.on('end', async () => {
        try {
          const fileBuffer = Buffer.concat(chunks);
          const ocrResult = await ocrService.processAndExtract(fileBuffer, document.mimeType);

          job.status = 'completed';
          job.result = {
            rawText: ocrResult.rawText,
            extractedData: ocrResult.suggestedFields
          };
          job.completedAt = new Date();
          await job.save();

          // Auto-index document chunks for RAG
          try {
            await aiService.ingestDocumentText({
              userId: job.user,
              documentId: job.document,
              text: ocrResult.rawText
            });
          } catch (chunkErr) {
            console.warn('[n8n fallback] Warning: ingestDocumentText skipped:', chunkErr.message);
          }
        } catch (innerErr) {
          job.status = 'failed';
          job.error = innerErr.message;
          await job.save();
        }
      });

      downloadStream.on('error', async (err) => {
        job.status = 'failed';
        job.error = err.message;
        await job.save();
      });
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
      await job.save();
    }
  }

  /**
   * Handles callback from n8n after OCR workflow finishes
   */
  async handleOcrCallback(data) {
    const { jobId, extractedData, rawText, status, error } = data;

    const job = await ProcessingJob.findOne({ jobId });
    if (!job) {
      throw new Error(`ProcessingJob with ID ${jobId} not found`);
    }

    if (status === 'failed') {
      job.status = 'failed';
      job.error = error || 'n8n OCR extraction failed';
      await job.save();
      return job;
    }

    job.status = 'completed';
    job.result = {
      extractedData: extractedData || {},
      rawText: rawText || ''
    };
    job.completedAt = new Date();
    await job.save();

    // Index text chunks for RAG vector search
    if (rawText && job.document) {
      const document = await Document.findById(job.document);
      await aiService.indexDocumentChunks(
        job.user,
        job.document,
        rawText,
        { title: document?.title || 'Document', type: document?.type || 'invoice' }
      );
    }

    return job;
  }

  /**
   * Dispatches AI chat query to n8n AI workflow or falls back to internal OpenRouter/RAG
   */
  async queryAiAssistant(userId, query, conversationId = null) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const jobId = `job_ai_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // If n8n AI chat webhook is configured, call n8n
    if (this.aiChatWebhook && this.aiChatWebhook.startsWith('http')) {
      try {
        const response = await this.dispatchToN8n(this.aiChatWebhook, {
          jobId,
          userId: userId.toString(),
          userEmail: user.email,
          query,
          conversationId
        }, 30000);

        if (response.data && response.data.answer) {
          return response.data;
        }
      } catch (err) {
        console.warn(`[n8n AI] Dispatch error: ${err.message}. Using internal RAG pipeline.`);
      }
    }

    // Default authoritative pipeline: internal RAG with user-scoped isolation
    return await aiService.askAssistant(userId, query, conversationId);
  }
}

module.exports = new N8nService();
