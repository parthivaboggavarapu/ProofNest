const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { verifyN8nSignature } = require('../middleware/n8nAuthMiddleware');
const n8nController = require('../controllers/n8nController');

// 1. User-authenticated: Initiate asynchronous OCR/document processing
router.post('/document-processing', authenticate, n8nController.triggerDocumentProcessing);

// 2. n8n-authenticated callback: Secure callback invoked by n8n when OCR completes
router.post('/document-processing/callback', verifyN8nSignature, n8nController.handleDocumentProcessingCallback);

// 3. User-authenticated: Poll status of an asynchronous processing job
router.get('/jobs/:jobId', authenticate, n8nController.getJobStatus);

// 4. User-authenticated: Send AI query to n8n AI workflow
router.post('/ai-chat', authenticate, n8nController.queryAiChat);

// 5. n8n-authenticated: Webhook for n8n scheduled cron to trigger warranty milestone evaluation
router.post('/notifications', verifyN8nSignature, n8nController.triggerScheduledNotifications);

// 6. Token-scoped download: Short-lived secure download for n8n workers
router.get('/documents/:id/download', n8nController.downloadDocumentForN8n);

module.exports = router;
