const mongoose = require('mongoose');

/**
 * MongoDB Atlas Vector Search Index Definition
 * Collection: documentchunks
 * Index Name: vector_index
 * 
 * Atlas Vector Search JSON definition:
 * {
 *   "fields": [
 *     {
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 384,
 *       "similarity": "cosine"
 *     },
 *     {
 *       "type": "filter",
 *       "path": "userId"
 *     },
 *     {
 *       "type": "filter",
 *       "path": "productId"
 *     }
 *   ]
 * }
 */
const VECTOR_INDEX_DEFINITION = {
  name: 'vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 384,
        similarity: 'cosine'
      },
      {
        type: 'filter',
        path: 'userId'
      },
      {
        type: 'filter',
        path: 'productId'
      }
    ]
  }
};

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
DocumentChunk.VECTOR_INDEX_DEFINITION = VECTOR_INDEX_DEFINITION;

module.exports = DocumentChunk;
