const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES } = require('../constants/statusEnums');

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters']
    },
    brand: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'Electronics'
    },
    modelNumber: {
      type: String,
      trim: true,
      default: ''
    },
    serialNumber: {
      type: String,
      trim: true,
      default: null
    },
    purchaseDate: {
      type: Date,
      default: null
    },
    purchasePrice: {
      type: Number,
      min: [0, 'Purchase price cannot be negative'],
      default: 0
    },
    seller: {
      type: String,
      trim: true,
      default: ''
    },
    warrantyStartDate: {
      type: Date,
      default: null
    },
    warrantyEndDate: {
      type: Date,
      default: null
    },
    returnDeadline: {
      type: Date,
      default: null
    },
    productImage: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
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

productSchema.index({ userId: 1, warrantyEndDate: 1 });
productSchema.index({ userId: 1, returnDeadline: 1 });
productSchema.index({ userId: 1, category: 1 });
productSchema.index({ userId: 1, createdAt: -1 });

productSchema.index(
  { userId: 1, serialNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      serialNumber: { $type: 'string', $gt: '' }
    },
    name: 'user_serialNumber_unique_non_empty'
  }
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
module.exports = Product;
