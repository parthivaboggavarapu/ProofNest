const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const { requireAuth } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

// Text extraction: supports multipart upload or JSON body with { documentId }
router.post('/extract', upload.single('file'), (req, res, next) => ocrController.extractText(req, res, next));

// Retrieve previously extracted OCR text for a document
router.get('/:documentId', (req, res, next) => ocrController.getOcrByDocumentId(req, res, next));

module.exports = router;
