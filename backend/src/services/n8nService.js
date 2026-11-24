const axios = require('axios');
const crypto = require('crypto');
const { ProcessingJob, Document, User } = require('../models');
const { generateDocumentAccessToken } = require('../middleware/n8nAuthMiddleware');
const ocrService = require('./ocrService');
const aiService = require('./aiService');

class N8nService {
  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.docWebhook = process.env.N8N_DOCUMENT_PROCESSING_WEBHOOK || '';
    this.aiChatWebhook = process.env.N8N_AI_CHAT_WEBHOOK || '';
    this.secret = process.env.N8N_WEBHOOK_SECRET;
    // URL that n8n running in Docker uses to reach Express on host
    this.backendDockerUrl = process.env.BACKEND_DOCKER_URL || 'http://host.docker.internal:5000';
    this.backendPublicUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  }

  getDocWebhookUrl() {
    return process.env.N8N_DOCUMENT_PROCESSING_WEBHOOK || this.docWebhook || '';
  }

  getSecret() {
    const rawSecret = process.env.N8N_WEBHOOK_SECRET || this.secret || '';
    return rawSecret;
  }

  /**
   * Health check to test whether Express can reach the local n8n instance
   * Uses N8N_BASE_URL (http://localhost:5678)
   */
  async checkN8nHealth(timeoutMs = 5000) {
    const baseUrl = process.env.N8N_BASE_URL || this.baseUrl || 'http://localhost:5678';
    try {
      const response = await axios.get(`${baseUrl}/healthz`, {
        timeout: timeoutMs
      });
      return {
        reachable: true,
        status: response.status,
        data: response.data
      };
    } catch (err) {
      return {
        reachable: false,
        error: err.message
      };
    }
  }

  /**
   * Dispatches an HTTP request to an n8n webhook with Header Auth
   * Uses X-ProofNest-Webhook-Secret header matching n8n credential configuration.
   * Sends both exact and trimmed header variations to ensure exact match against
   * n8n credential regardless of whitespace differences.
   */
  async dispatchToN8n(webhookUrl, data, timeoutMs = 25000) {
    if (!webhookUrl) {
      throw new Error('n8n webhook URL is not configured');
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    const secret = this.getSecret();
    if (secret) {
      // Set the configured secret as X-ProofNest-Webhook-Secret
      headers['X-ProofNest-Webhook-Secret'] = secret;
    }

    try {
      return await axios.post(webhookUrl, data, {
        headers,
        timeout: timeoutMs
      });
    } catch (err) {
      // If we received 403 and the secret had whitespace, retry with trimmed secret
      if (err.response && err.response.status === 403 && secret && secret !== secret.trim()) {
        try {
          const retryHeaders = {
            ...headers,
            'X-ProofNest-Webhook-Secret': secret.trim()
          };
          return await axios.post(webhookUrl, data, {
            headers: retryHeaders,
            timeout: timeoutMs
          });
        } catch (retryErr) {
          throw retryErr;
        }
      }
      throw err;
    }
  }

  /**
   * Initiates document OCR processing via n8n workflow
   * Creates/updates job in 'pending' status, constructs payload with product context,
   * generates short-lived tokenized download URL, and triggers n8n webhook.
   */
  async triggerDocumentProcessing(userId, documentId, optionalProductContext = {}) {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) {
      throw new Error('Document not found or unauthorized');
    }

    const jobId = `job_ocr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const token = generateDocumentAccessToken(documentId, 600); // 10 minutes short-lived access
    
    // Scoped download URL using host.docker.internal for n8n in Docker
    const secureDownloadUrl = `${this.backendDockerUrl}/api/integrations/n8n/documents/${documentId}/download?token=${token}`;
    const callbackUrl = `${this.backendDockerUrl}/api/integrations/n8n/document-processing/callback`;

    // Fetch existing product context if document is already associated with a product
    let productContext = { ...optionalProductContext };
    if (document.productId) {
      const product = await Product.findOne({ _id: document.productId, userId });
      if (product) {
        productContext = {
          productId: product._id.toString(),
          productName: product.productName,
          brand: product.brand,
          modelNumber: product.modelNumber,
          category: product.category,
          ...productContext
        };
      }
    }

    // Step 3: Create ProcessingJob record with 'pending' status
    const job = await ProcessingJob.create({
      jobId,
      userId,
      user: userId,
      documentId,
      document: documentId,
      productId: document.productId || optionalProductContext.productId || null,
      type: 'ocr_extraction',
      status: 'pending',
      payload: {
        documentId: document._id.toString(),
        fileName: document.originalFileName || document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        productContext
      }
    });

    const webhookPayload = {
      jobId,
      documentId: documentId.toString(),
      fileName: document.originalFileName || document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      downloadUrl: secureDownloadUrl,
      callbackUrl,
      productContext: Object.keys(productContext).length > 0 ? productContext : null
    };

    const docWebhook = this.getDocWebhookUrl();
    if (docWebhook && docWebhook.startsWith('http')) {
      job.status = 'processing';
      job.attempts = (job.attempts || 0) + 1;
      await job.save();

      this.dispatchToN8n(docWebhook, webhookPayload).catch(async (err) => {
        const isAuthError = err.response && (err.response.status === 403 || err.response.status === 401);
        const statusCode = err.response?.status;
        const statusText = err.response?.statusText || '';
        
        let detailedError = `n8n webhook dispatch error: ${err.message}`;
        if (isAuthError) {
          detailedError = `n8n Webhook Authentication Error (${statusCode} ${statusText}): Header Auth mismatch on 'X-ProofNest-Webhook-Secret'. Check that n8n Header Auth credential matches backend N8N_WEBHOOK_SECRET.`;
        }

        console.warn(`[n8n] ${detailedError}. Marking job as failed (retryable).`);
        job.status = 'failed';
        job.error = detailedError;
        // Keep job retryable
        job.retryCount = (job.retryCount || 0);
        await job.save();
      });
    }

    return {
      jobId,
      status: job.status,
      documentId,
      webhookPayload
    };
  }

  /**
   * Fallback runner: executes local tesseract/pdf-parse when n8n webhook is not active
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
   * Sanitizes and validates extracted invoice fields from n8n OCR callback
   * Only stores real fields where available; does not invent missing data.
   */
  sanitizeExtractedInvoiceData(raw = {}) {
    const sanitized = {};

    if (raw.productName && typeof raw.productName === 'string') {
      sanitized.productName = raw.productName.trim();
    }
    if (raw.brand && typeof raw.brand === 'string') {
      sanitized.brand = raw.brand.trim();
    }
    if (raw.modelNumber && typeof raw.modelNumber === 'string') {
      sanitized.modelNumber = raw.modelNumber.trim();
    }
    if (raw.purchaseDate) {
      const d = new Date(raw.purchaseDate);
      if (!isNaN(d.getTime())) {
        sanitized.purchaseDate = d.toISOString().split('T')[0];
      }
    }
    if (raw.purchasePrice !== undefined && raw.purchasePrice !== null && raw.purchasePrice !== '') {
      const priceNum = typeof raw.purchasePrice === 'number' ? raw.purchasePrice : parseFloat(String(raw.purchasePrice).replace(/[^0-9.]/g, ''));
      if (!isNaN(priceNum) && priceNum >= 0) {
        sanitized.purchasePrice = priceNum;
      }
    }
    if (raw.seller && typeof raw.seller === 'string') {
      sanitized.seller = raw.seller.trim();
    }
    if (raw.invoiceNumber && typeof raw.invoiceNumber === 'string') {
      sanitized.invoiceNumber = raw.invoiceNumber.trim();
    }
    if (raw.warrantyExpiry) {
      const d = new Date(raw.warrantyExpiry);
      if (!isNaN(d.getTime())) {
        sanitized.warrantyExpiry = d.toISOString().split('T')[0];
      }
    } else if (raw.warrantyDuration) {
      sanitized.warrantyDuration = String(raw.warrantyDuration).trim();
    }
    if (raw.serialNumber && typeof raw.serialNumber === 'string') {
      sanitized.serialNumber = raw.serialNumber.trim();
    }

    return sanitized;
  }

  /**
   * Handles callback from n8n after OCR workflow finishes
   * Validates and stores extracted information as a pending result awaiting user confirmation.
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

    const validatedExtractedData = this.sanitizeExtractedInvoiceData(extractedData || {});

    job.status = 'completed';
    job.result = {
      extractedData: validatedExtractedData,
      rawText: rawText || '',
      awaitingUserConfirmation: true
    };
    job.callbackReceivedAt = new Date();
    job.completedAt = new Date();
    await job.save();

    if (rawText && (job.documentId || job.document)) {
      const docId = job.documentId || job.document;
      try {
        await aiService.ingestDocumentText({
          userId: job.userId || job.user,
          documentId: docId,
          text: rawText
        });
      } catch (chunkErr) {
        console.warn('[n8n callback] Chunk ingestion skipped:', chunkErr.message);
      }
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

    return await aiService.askAssistant(userId, query, conversationId);
  }
}

module.exports = new N8nService();
