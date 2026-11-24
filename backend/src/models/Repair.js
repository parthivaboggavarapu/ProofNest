const mongoose = require('mongoose');
const { REPAIR_STATUSES } = require('../constants/statusEnums');

const repairSchema = new mongoose.Schema(
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
      required: [true, 'Product reference is required'],
      index: true
    },
    repairDate: {
      type: Date,
      default: Date.now
    },
    issueDescription: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      maxlength: [500, 'Issue description cannot exceed 500 characters']
    },
    serviceCenter: {
      type: String,
      trim: true,
      default: ''
    },
    repairCost: {
      type: Number,
      min: [0, 'Repair cost cannot be negative'],
      default: 0
    },
    repairStatus: {
      type: String,
      enum: {
        values: REPAIR_STATUSES,
        message: 'Invalid repair status'
      },
      default: 'requested'
    },
    repairBillDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null
    },
    createdAt: {
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

repairSchema.index({ userId: 1, productId: 1 });
repairSchema.index({ userId: 1, repairStatus: 1 });
repairSchema.index({ productId: 1, repairDate: -1 });

const Repair = mongoose.models.Repair || mongoose.model('Repair', repairSchema);
module.exports = Repair;
