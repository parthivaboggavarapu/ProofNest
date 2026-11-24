const mongoose = require('mongoose');
const { DOCUMENT_TYPES } = require('../constants/statusEnums');

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: {
        values: DOCUMENT_TYPES,
        message: 'Invalid document type'
      },
      default: 'Receipt'
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required']
    },
    gridFsFileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'GridFS file ID is required'],
      index: true
    },
    extractedText: {
      type: String,
      default: ''
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

documentSchema.index({ userId: 1, productId: 1 });
documentSchema.index({ userId: 1, documentType: 1 });
documentSchema.index({ userId: 1, uploadedAt: -1 });

const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
module.exports = Document;
