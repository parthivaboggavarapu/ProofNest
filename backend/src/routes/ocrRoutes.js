const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const { requireAuth } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

router.post('/extract', upload.single('file'), ocrController.extractInvoiceData);
router.post('/confirm', upload.single('file'), ocrController.confirmExtractedData);

module.exports = router;
