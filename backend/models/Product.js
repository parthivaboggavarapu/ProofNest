/**
 * ProofNest Product Model
 * 
 * Represents an item/asset owned by a user, including warranty and purchase metadata.
 * 
 * NOTE ON OWNERSHIP CONSISTENCY:
 * Mongoose ObjectId references (ref: 'User') are logical schema associations, NOT database-level
 * foreign keys. Mongoose does not independently enforce ownership consistency between collections.
 * The backend application layer is responsible for verifying that a product is owned by the
 * currently authenticated user before performing read, update, or delete operations.
 */

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      // Standalone index: true removed to avoid redundancy; covered by compound index prefix { user: 1, ... }
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [150, "Product name cannot exceed 150 characters"],
    },
    brand: {
      type: String,
      trim: true,
      default: "",
    },
    model: {
      type: String,
      trim: true,
      default: "",
    },
    serialNumber: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    purchaseDate: {
      type: Date,
    },
    warrantyExpiry: {
      type: Date,
    },
    purchasePrice: {
      type: Number,
      min: [0, "Purchase price cannot be negative"],
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "repair", "expired"],
        message: "Status must be active, repair, or expired",
      },
      default: "active",
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

/**
 * Compound partial unique index:
 * Ensures serial numbers are unique per user ONLY when serialNumber is a non-empty string.
 * Users can have multiple products with null, undefined, or empty serial numbers without collision.
 * Separate users may have products with the same serial number without conflict.
 */
productSchema.index(
  { user: 1, serialNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      serialNumber: { $type: "string", $gt: "" },
    },
    name: "user_serialNumber_unique_non_empty",
  }
);

// Query indexes — notice user: 1 is the leading prefix, also serving single-field queries on { user: ObjectId }
productSchema.index({ user: 1, status: 1 });
productSchema.index({ user: 1, category: 1 });
productSchema.index({ user: 1, warrantyExpiry: 1 });
productSchema.index({ user: 1, createdAt: -1 });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

module.exports = Product;
