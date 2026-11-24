const ocrService = require('../services/ocrService');
const { validateFileSignature } = require('../middleware/uploadMiddleware');

class OcrController {
  async extractInvoiceData(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Invoice file (PDF or Image) is required for extraction.'
        });
      }

      const isSignatureValid = validateFileSignature(req.file.buffer, req.file.mimetype);
      if (!isSignatureValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file signature for uploaded document.'
        });
      }

      const { rawText, suggestedFields } = await ocrService.processAndExtract(
        req.file.buffer,
        req.file.mimetype
      );

      res.status(200).json({
        success: true,
        message: 'Invoice parsed successfully. Please review and confirm fields.',
        rawText,
        suggestedFields,
        fileMeta: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmExtractedData(req, res, next) {
    try {
      const {
        productName,
        brand,
        category,
        modelNumber,
        serialNumber,
        purchaseDate,
        purchasePrice,
        seller,
        warrantyStartDate,
        warrantyEndDate,
        returnDeadline,
        notes,
        extractedText
      } = req.body;

      const productPayload = {
        productName,
        brand,
        category,
        modelNumber,
        serialNumber,
        purchaseDate,
        purchasePrice,
        seller,
        warrantyStartDate,
        warrantyEndDate,
        returnDeadline,
        notes
      };

      const result = await ocrService.confirmAndSave(req.user._id, {
        productData: productPayload,
        fileData: req.file || null,
        extractedText
      });

      res.status(201).json({
        success: true,
        message: 'Product and invoice successfully confirmed and saved.',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OcrController();
