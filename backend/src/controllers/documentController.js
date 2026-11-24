const documentService = require('../services/documentService');
const { validateFileSignature } = require('../middleware/uploadMiddleware');

class DocumentController {
  async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file provided for upload.' });
      }

      // Check file magic numbers / signature
      const isSignatureValid = validateFileSignature(req.file.buffer, req.file.mimetype);
      if (!isSignatureValid) {
        return res.status(400).json({
          success: false,
          error: 'File contents do not match the declared MIME type header.'
        });
      }

      const { productId, documentType, extractedText } = req.body;
      const document = await documentService.uploadDocument({
        userId: req.user._id,
        productId,
        documentType,
        file: req.file,
        extractedText
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded to GridFS successfully.',
        data: {
          document
        },
        document
      });
    } catch (error) {
      next(error);
    }
  }

  async getDocuments(req, res, next) {
    try {
      const documents = await documentService.getDocuments(req.user._id, req.query);
      res.status(200).json({
        success: true,
        count: documents.length,
        documents
      });
    } catch (error) {
      next(error);
    }
  }

  async getDocumentById(req, res, next) {
    try {
      const document = await documentService.getDocumentById(req.user._id, req.params.id);
      res.status(200).json({
        success: true,
        document
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadDocument(req, res, next) {
    try {
      const isPreview = req.query.preview === 'true';
      const { document, downloadStream } = await documentService.getDownloadStream(
        req.user._id,
        req.params.id
      );

      res.setHeader('Content-Type', document.mimeType);
      const disposition = isPreview ? 'inline' : 'attachment';
      res.setHeader(
        'Content-Disposition',
        `${disposition}; filename="${encodeURIComponent(document.originalFileName)}"`
      );

      downloadStream.on('error', (err) => {
        return next(err);
      });

      downloadStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req, res, next) {
    try {
      const result = await documentService.deleteDocument(req.user._id, req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DocumentController();
