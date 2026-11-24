const mongoose = require('mongoose');

const processingJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Also aliased as 'user' for backwards compatibility
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
      index: true
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
      default: null,
      index: true
    },
    type: {
      type: String,
      enum: ['ocr_extraction', 'embedding_indexing', 'ai_rag_query', 'warranty_scan'],
      default: 'ocr_extraction'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    error: {
      type: String,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0
    },
    attempts: {
      type: Number,
      default: 0
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    callbackReceivedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure userId <-> user and documentId <-> document consistency
processingJobSchema.pre('save', function () {
  if (this.userId && !this.user) this.user = this.userId;
  if (this.user && !this.userId) this.userId = this.user;
  if (this.documentId && !this.document) this.document = this.documentId;
  if (this.document && !this.documentId) this.documentId = this.document;
});

// TTL index to automatically prune old completed jobs after 7 days
processingJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const ProcessingJob = mongoose.model('ProcessingJob', processingJobSchema);

module.exports = ProcessingJob;
