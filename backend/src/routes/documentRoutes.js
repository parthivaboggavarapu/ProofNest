const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { requireAuth } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocumentById);
router.get('/:id/download', documentController.downloadDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
