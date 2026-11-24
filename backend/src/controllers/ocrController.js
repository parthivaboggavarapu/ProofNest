const ocrService = require('../services/ocrService');
const documentService = require('../services/documentService');
const { Document } = require('../models');
const { validateFileSignature } = require('../middleware/uploadMiddleware');

class OcrController {
  /**
   * POST /api/ocr/extract
   * Supports two modes:
   * 1. Multi-part file upload with `file`: uploads to GridFS (as an Invoice/Receipt) and extracts text.
   * 2. JSON body with `{ documentId }`: extracts text from an already uploaded Document in GridFS.
   * Returns: { success: true, rawText: "...", document: { ... } }
   * Strictly NO automatic field extraction or product creation.
   */
  async extractText(req, res, next) {
    try {
      let targetDocument = null;
      let fileBuffer = null;
      let mimeType = null;

      // Mode 1: Directly provided documentId in JSON or multipart body
      const documentId = req.body?.documentId;
      if (documentId) {
        targetDocument = await Document.findOne({ _id: documentId, userId: req.user._id });
        if (!targetDocument) {
          return res.status(404).json({
            success: false,
            error: 'Document not found or unauthorized.'
          });
        }
        mimeType = targetDocument.mimeType;

        // Fetch buffer from GridFS
        const { downloadStream } = await documentService.getDownloadStream(
          req.user._id,
          targetDocument._id
        );
        const chunks = [];
        await new Promise((resolve, reject) => {
          downloadStream.on('data', (chunk) => chunks.push(chunk));
          downloadStream.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
            resolve();
          });
          downloadStream.on('error', (err) => reject(err));
        });
      } else if (req.file) {
        // Mode 2: Multi-part file upload
        fileBuffer = req.file.buffer;
        mimeType = req.file.mimetype;

        const isSignatureValid = validateFileSignature(fileBuffer, mimeType);
        if (!isSignatureValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file signature for uploaded document.'
          });
        }

        // Store original document in GridFS
        targetDocument = await documentService.uploadDocument({
          userId: req.user._id,
          productId: req.body?.productId || null,
          documentType: req.body?.documentType || 'Receipt',
          file: req.file,
          extractedText: ''
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Please provide an invoice file (PDF or Image) or an existing documentId.'
        });
      }

      // Perform text extraction using internal OCR engine
      const rawText = await ocrService.extractTextFromFile(fileBuffer, mimeType);

      // Persist extractedText to Document record
      if (targetDocument) {
        targetDocument.extractedText = rawText || '';
        await targetDocument.save();
      }

      return res.status(200).json({
        success: true,
        message: rawText && rawText.trim().length > 0 
          ? 'Text extraction completed.' 
          : 'No readable text found. Please try a clearer scan.',
        rawText: rawText || '',
        document: targetDocument,
        documentId: targetDocument ? targetDocument._id : null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ocr/:documentId
   * Returns previously extracted OCR text for authenticated document owner.
   */
  async getOcrByDocumentId(req, res, next) {
    try {
      const { documentId } = req.params;
      const document = await Document.findOne({ _id: documentId, userId: req.user._id });
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found or unauthorized.'
        });
      }

      return res.status(200).json({
        success: true,
        documentId: document._id,
        rawText: document.extractedText || '',
        document: {
          _id: document._id,
          originalFileName: document.originalFileName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          uploadedAt: document.uploadedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Legacy alias: extractInvoiceData
   */
  async extractInvoiceData(req, res, next) {
    return this.extractText(req, res, next);
  }
}

module.exports = new OcrController();
