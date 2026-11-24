const n8nService = require('../services/n8nService');
const { ProcessingJob, Document, Product, DocumentChunk } = require('../models');
const notificationService = require('../services/notificationService');
const { verifyDocumentAccessToken } = require('../middleware/n8nAuthMiddleware');
const db = require('../config/db');

/**
 * Trigger asynchronous document processing via n8n
 * POST /api/integrations/n8n/document-processing
 */
const triggerDocumentProcessing = async (req, res, next) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ success: false, message: 'documentId is required' });
    }

    const job = await n8nService.triggerDocumentProcessing(req.user._id, documentId);

    return res.status(202).json({
      success: true,
      message: 'Document processing initiated',
      data: job
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Webhook callback invoked by n8n when OCR extraction finishes
 * POST /api/integrations/n8n/document-processing/callback
 * Includes duplicate callback protection
 */
const handleDocumentProcessingCallback = async (req, res, next) => {
  try {
    const { jobId, extractedData, rawText, status, error } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'jobId is required in callback payload' });
    }

    // Check for existing job and guard against duplicate callbacks
    const existingJob = await ProcessingJob.findOne({ jobId });
    if (!existingJob) {
      return res.status(404).json({ success: false, message: `ProcessingJob with ID ${jobId} not found` });
    }

    if (existingJob.status === 'completed' && existingJob.callbackReceivedAt) {
      return res.status(200).json({
        success: true,
        message: 'Callback already processed previously (Idempotent)',
        data: {
          jobId: existingJob.jobId,
          status: existingJob.status
        }
      });
    }

    const updatedJob = await n8nService.handleOcrCallback({
      jobId,
      extractedData,
      rawText,
      status: status || 'completed',
      error
    });

    return res.status(200).json({
      success: true,
      message: 'Callback received and processing job updated',
      data: {
        jobId: updatedJob.jobId,
        status: updatedJob.status
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Check the status of an asynchronous processing job
 * GET /api/integrations/n8n/jobs/:jobId
 */
const getJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await ProcessingJob.findOne({
      jobId,
      $or: [{ userId: req.user._id }, { user: req.user._id }]
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found or access denied' });
    }

    return res.status(200).json({
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        type: job.type,
        result: job.result,
        error: job.error,
        completedAt: job.completedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm and save extracted OCR results into a Product record.
 * Requires user confirmation - does NOT automatically overwrite or invent product details.
 * POST /api/integrations/n8n/confirm-ocr
 */
const confirmOcrResult = async (req, res, next) => {
  try {
    const { jobId, confirmedProductData } = req.body;
    if (!jobId || !confirmedProductData) {
      return res.status(400).json({
        success: false,
        message: 'jobId and confirmedProductData are required'
      });
    }

    const job = await ProcessingJob.findOne({
      jobId,
      $or: [{ userId: req.user._id }, { user: req.user._id }]
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Processing job not found or access denied' });
    }

    if (job.status !== 'completed' || !job.result) {
      return res.status(400).json({ success: false, message: 'OCR processing is not completed yet' });
    }

    const documentId = job.documentId || job.document;
    const document = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Associated invoice document not found or unauthorized' });
    }

    // Create or update Product with confirmed user data
    const productService = require('../services/productService');
    let product;

    if (confirmedProductData.productId || job.productId) {
      const prodId = confirmedProductData.productId || job.productId;
      product = await productService.updateProduct(req.user._id, prodId, confirmedProductData);
    } else {
      product = await productService.createProduct(req.user._id, {
        productName: confirmedProductData.productName || confirmedProductData.name || 'Purchased Product',
        brand: confirmedProductData.brand || '',
        modelNumber: confirmedProductData.modelNumber || confirmedProductData.model || '',
        category: confirmedProductData.category || 'Electronics',
        serialNumber: confirmedProductData.serialNumber || null,
        purchaseDate: confirmedProductData.purchaseDate || null,
        purchasePrice: confirmedProductData.purchasePrice !== undefined ? Number(confirmedProductData.purchasePrice) : 0,
        seller: confirmedProductData.seller || '',
        warrantyStartDate: confirmedProductData.purchaseDate || confirmedProductData.warrantyStartDate || null,
        warrantyEndDate: confirmedProductData.warrantyExpiry || confirmedProductData.warrantyEndDate || null,
        notes: confirmedProductData.notes || ''
      });
    }

    // Attach Document to the confirmed Product
    document.productId = product._id;
    await document.save();

    // Mark job confirmed
    job.result.awaitingUserConfirmation = false;
    job.result.confirmedProductId = product._id;
    job.productId = product._id;
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Product confirmed and saved successfully from OCR extraction',
      data: {
        product,
        documentId: document._id,
        jobId: job.jobId
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Endpoint for n8n to retrieve user-scoped context for a document/product
 * GET /api/integrations/n8n/context/:documentId
 */
const getDocumentContext = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId).populate('productId');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Retrieve existing text chunks if already embedded
    const chunks = await DocumentChunk.find({ documentId }).select('chunkText chunkIndex');

    return res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        fileName: document.originalFileName || document.fileName,
        documentType: document.documentType || document.type,
        productId: document.productId?._id || null,
        productName: document.productId?.name || null,
        brand: document.productId?.brand || null,
        category: document.productId?.category || null,
        existingChunksCount: chunks.length,
        chunks: chunks.map(c => c.chunkText)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Endpoint for n8n to submit generated embeddings into MongoDB Atlas
 * POST /api/integrations/n8n/embeddings
 */
const submitEmbeddings = async (req, res, next) => {
  try {
    const { documentId, chunks } = req.body;
    if (!documentId || !Array.isArray(chunks)) {
      return res.status(400).json({
        success: false,
        message: 'documentId and chunks array are required'
      });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Upsert chunks with embeddings
    const chunkDocs = chunks.map((chunk, idx) => ({
      userId: document.userId || document.user,
      documentId,
      productId: document.productId || null,
      chunkText: chunk.text || chunk.chunkText,
      chunkIndex: idx,
      embedding: chunk.embedding || []
    }));

    await DocumentChunk.deleteMany({ documentId });
    const inserted = await DocumentChunk.insertMany(chunkDocs);

    return res.status(200).json({
      success: true,
      message: 'Embeddings indexed successfully in MongoDB',
      data: {
        count: inserted.length
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * AI Chat query routed through n8n / Express
 * POST /api/integrations/n8n/ai-chat
 */
const queryAiChat = async (req, res, next) => {
  try {
    const { query, conversationId } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }

    const result = await n8nService.queryAiAssistant(req.user._id, query, conversationId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Scheduled workflow trigger for warranty deadline reminders
 * POST /api/integrations/n8n/notifications
 */
const triggerScheduledNotifications = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const result = await notificationService.evaluateUpcomingMilestones(targetUserId || null);

    return res.status(200).json({
      success: true,
      message: 'Automated milestone check processed',
      data: {
        notificationsCreated: result.length,
        milestonesChecked: [30, 7, 4, 1, 0],
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Short-lived scoped download endpoint for n8n workers
 * GET /api/integrations/n8n/documents/:id/download
 */
const downloadDocumentForN8n = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const isValid = verifyDocumentAccessToken(id, token);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired document access token'
      });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const bucket = db.getGridFSBucket();
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.originalFileName || document.fileName}"`);

    const downloadStream = bucket.openDownloadStream(document.gridFsFileId);
    downloadStream.on('error', () => {
      res.status(404).json({ success: false, message: 'Binary file stream failed' });
    });
    downloadStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  triggerDocumentProcessing,
  handleDocumentProcessingCallback,
  getJobStatus,
  confirmOcrResult,
  getDocumentContext,
  submitEmbeddings,
  queryAiChat,
  triggerScheduledNotifications,
  downloadDocumentForN8n
};
