const n8nService = require('../services/n8nService');
const { ProcessingJob, Document } = require('../models');
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

    const job = await n8nService.triggerDocumentProcessing(req.user.id, documentId);

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
 */
const handleDocumentProcessingCallback = async (req, res, next) => {
  try {
    const { jobId, extractedData, rawText, status, error } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'jobId is required in callback payload' });
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
    const job = await ProcessingJob.findOne({ jobId, user: req.user.id });

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
 * AI Chat query routed through n8n / Express
 * POST /api/integrations/n8n/ai-chat
 */
const queryAiChat = async (req, res, next) => {
  try {
    const { query, conversationId } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }

    const result = await n8nService.queryAiAssistant(req.user.id, query, conversationId);

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
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);

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
  queryAiChat,
  triggerScheduledNotifications,
  downloadDocumentForN8n
};
