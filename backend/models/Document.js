/**
 * ProofNest Document Model
 * 
 * Stores file metadata (URL, mime type, title, type classification) referencing users and products.
 * Large binary assets are stored in object storage / disk, NOT directly in MongoDB.
 * 
 * NOTE ON OWNERSHIP CONSISTENCY:
 * Mongoose ObjectId references do not independently enforce ownership consistency between
 * users and products. For instance, Mongoose will not automatically prevent User A from setting
 * `product: ProductB._id` (owned by User B). The backend service layer must explicitly verify
 * that any associated product belongs to the same user (`product.user.equals(req.session.userId)`).
 */

const mongoose = require("mongoose");

const DOCUMENT_TYPES = [
  "receipt",
  "invoice",
  "warranty",
  "manual",
  "repair",
  "other",
];

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      // Standalone index: true removed to avoid redundancy; covered by compound index prefix { user: 1, ... }
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true, // Retained: allows direct lookup of all documents attached to a product
    },
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      maxlength: [200, "Document title cannot exceed 200 characters"],
    },
    type: {
      type: String,
      required: [true, "Document type is required"],
      enum: {
        values: DOCUMENT_TYPES,
        message: "Document type must be one of: " + DOCUMENT_TYPES.join(", "),
      },
      lowercase: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
      default: "application/pdf",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Query indexes — user: 1 leading prefix covers queries filtering solely by user
documentSchema.index({ user: 1, product: 1 });
documentSchema.index({ user: 1, type: 1 });
documentSchema.index({ user: 1, uploadedAt: -1 });

const Document = mongoose.models.Document || mongoose.model("Document", documentSchema);

module.exports = Document;
