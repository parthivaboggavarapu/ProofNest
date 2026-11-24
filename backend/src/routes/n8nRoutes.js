const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { verifyN8nWebhookSecret } = require('../middleware/n8nAuthMiddleware');
const n8nController = require('../controllers/n8nController');

// 0. Protected test endpoint for n8n Header Auth verification
router.get('/test', verifyN8nWebhookSecret, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'n8n authentication successful'
  });
});

// 1. User-authenticated: Initiate asynchronous OCR/document processing
router.post('/document-processing', requireAuth, n8nController.triggerDocumentProcessing);

// 2. n8n-authenticated callback: Secure callback invoked by n8n when OCR completes
router.post('/document-processing/callback', verifyN8nWebhookSecret, n8nController.handleDocumentProcessingCallback);

// 3. User-authenticated: Poll status of an asynchronous processing job
router.get('/jobs/:jobId', requireAuth, n8nController.getJobStatus);

// 3b. User-authenticated: Review and confirm OCR result to persist into Product record
router.post('/confirm-ocr', requireAuth, n8nController.confirmOcrResult);

// 4. n8n-authenticated: Retrieve user-scoped context for a document/product
router.get('/context/:documentId', verifyN8nWebhookSecret, n8nController.getDocumentContext);

// 5. n8n-authenticated: Submit generated embeddings into MongoDB Atlas
router.post('/embeddings', verifyN8nWebhookSecret, n8nController.submitEmbeddings);

// 6. User-authenticated: Send AI query to n8n AI workflow
router.post('/ai-chat', requireAuth, n8nController.queryAiChat);

// 7. n8n-authenticated: Webhook for n8n scheduled cron to trigger warranty milestone evaluation
router.post('/notifications', verifyN8nWebhookSecret, n8nController.triggerScheduledNotifications);

// 8. Token-scoped download: Short-lived secure download for n8n workers
router.get('/documents/:id/download', n8nController.downloadDocumentForN8n);

module.exports = router;
