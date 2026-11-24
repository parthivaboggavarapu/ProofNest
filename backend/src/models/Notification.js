const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../constants/statusEnums');

const notificationSchema = new mongoose.Schema(
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
    notificationType: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: 'system'
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    scheduledDate: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    milestone: {
      type: Number,
      default: 0
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

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, productId: 1, notificationType: 1, milestone: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
module.exports = Notification;
