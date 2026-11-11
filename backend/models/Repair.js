/**
 * ProofNest Repair Model
 * 
 * Tracks maintenance, warranty claims, service tickets, and repairs for user products.
 * 
 * NOTE ON OWNERSHIP CONSISTENCY:
 * Mongoose ObjectId references do not independently enforce ownership consistency between
 * users and products. For instance, Mongoose will not automatically prevent User A from logging
 * a repair for Product B (owned by User B). The backend service layer must explicitly verify
 * that any product referenced in a repair request belongs to the authenticated user.
 */

const mongoose = require("mongoose");

const REPAIR_STATUSES = [
  "requested",
  "approved",
  "in_progress",
  "completed",
  "rejected",
];

const repairSchema = new mongoose.Schema(
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
      required: [true, "Product reference is required"],
      // Standalone index: true removed to avoid redundancy; covered by compound index prefix { product: 1, ... }
    },
    issue: {
      type: String,
      required: [true, "Repair issue is required"],
      trim: true,
      maxlength: [300, "Issue description cannot exceed 300 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: REPAIR_STATUSES,
        message: "Status must be one of: " + REPAIR_STATUSES.join(", "),
      },
      default: "requested",
    },
    repairCost: {
      type: Number,
      min: [0, "Repair cost cannot be negative"],
      default: 0,
    },
    repairDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
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

// Query indexes — notice leading prefixes cover single-field user and product lookups
repairSchema.index({ user: 1, product: 1 });
repairSchema.index({ user: 1, status: 1 });
repairSchema.index({ product: 1, repairDate: -1 });

const Repair = mongoose.models.Repair || mongoose.model("Repair", repairSchema);

module.exports = Repair;
