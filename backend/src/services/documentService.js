const stream = require('stream');
const mongoose = require('mongoose');
const { Document, Product } = require('../models');
const { getGridFSBucket } = require('../config/db');

class DocumentService {
  async uploadDocument({ userId, productId, documentType, file, extractedText = '' }) {
    if (!file) {
      const err = new Error('No file uploaded.');
      err.status = 400;
      throw err;
    }

    if (productId) {
      const product = await Product.findOne({ _id: productId, userId });
      if (!product) {
        const err = new Error('Associated product not found or access denied.');
        err.status = 404;
        throw err;
      }
    }

    const bucket = getGridFSBucket();
    const sanitizedFileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload buffer to GridFS
    const uploadStream = bucket.openUploadStream(sanitizedFileName, {
      contentType: file.mimetype,
      metadata: {
        userId: userId.toString(),
        productId: productId ? productId.toString() : null,
        originalName: file.originalname
      }
    });

    const readable = new stream.Readable();
    readable.push(file.buffer);
    readable.push(null);

    const gridFsFileId = await new Promise((resolve, reject) => {
      readable
        .pipe(uploadStream)
        .on('finish', () => resolve(uploadStream.id))
        .on('error', (err) => reject(err));
    });

    // Create Document metadata record
    const document = await Document.create({
      userId,
      productId: productId || null,
      documentType: documentType || 'Receipt',
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      gridFsFileId,
      extractedText
    });

    return document;
  }

  async getDocuments(userId, query = {}) {
    const filter = { userId };
    if (query.productId) {
      filter.productId = query.productId;
    }
    if (query.documentType && query.documentType !== 'All') {
      filter.documentType = query.documentType;
    }

    return Document.find(filter)
      .populate('productId', 'productName brand category')
      .sort({ uploadedAt: -1 });
  }

  async getDocumentById(userId, documentId) {
    const document = await Document.findOne({ _id: documentId, userId }).populate(
      'productId',
      'productName brand category'
    );
    if (!document) {
      const err = new Error('Document not found or access denied.');
      err.status = 404;
      throw err;
    }
    return document;
  }

  async getDownloadStream(userId, documentId) {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) {
      const err = new Error('Document not found or access denied.');
      err.status = 404;
      throw err;
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(document.gridFsFileId);

    return {
      document,
      downloadStream
    };
  }

  async deleteDocument(userId, documentId) {
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) {
      const err = new Error('Document not found or access denied.');
      err.status = 404;
      throw err;
    }

    const bucket = getGridFSBucket();
    try {
      await bucket.delete(document.gridFsFileId);
    } catch (e) {
      console.warn(`[GridFS Warning] Could not delete chunk for fileId ${document.gridFsFileId}:`, e.message);
    }

    await Document.deleteOne({ _id: documentId, userId });
    return { success: true, message: 'Document and file deleted successfully.' };
  }
}

module.exports = new DocumentService();
