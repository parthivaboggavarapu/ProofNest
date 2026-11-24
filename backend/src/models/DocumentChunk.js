const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    chunkText: {
      type: String,
      required: true
    },
    embedding: {
      type: [Number],
      default: []
    },
    chunkIndex: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

documentChunkSchema.index({ userId: 1, documentId: 1 });
documentChunkSchema.index({ userId: 1, productId: 1 });

const DocumentChunk = mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', documentChunkSchema);
module.exports = DocumentChunk;
