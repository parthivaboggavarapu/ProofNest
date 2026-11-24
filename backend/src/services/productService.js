const { Product, Document, Repair } = require('../models');

class ProductService {
  async getProducts(userId, query = {}) {
    const filter = { userId };

    if (query.category && query.category !== 'All') {
      filter.category = query.category;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { productName: searchRegex },
        { brand: searchRegex },
        { modelNumber: searchRegex },
        { serialNumber: searchRegex },
        { seller: searchRegex }
      ];
    }

    if (query.status) {
      const now = new Date();
      if (query.status === 'active') {
        filter.warrantyEndDate = { $gte: now };
      } else if (query.status === 'expired') {
        filter.warrantyEndDate = { $lt: now };
      }
    }

    return Product.find(filter).sort({ createdAt: -1 });
  }

  async getProductById(userId, productId) {
    const product = await Product.findOne({ _id: productId, userId });
    if (!product) {
      const err = new Error('Product not found or access denied.');
      err.status = 404;
      throw err;
    }

    // Retrieve associated documents and repairs
    const [documents, repairs] = await Promise.all([
      Document.find({ productId, userId }).sort({ uploadedAt: -1 }),
      Repair.find({ productId, userId }).sort({ repairDate: -1 })
    ]);

    return {
      product,
      documents,
      repairs
    };
  }

  async createProduct(userId, data) {
    if (!data.productName) {
      const err = new Error('Product name is required.');
      err.status = 400;
      throw err;
    }

    const payload = {
      userId,
      productName: data.productName.trim(),
      brand: data.brand ? data.brand.trim() : '',
      category: data.category ? data.category.trim() : 'Electronics',
      modelNumber: data.modelNumber ? data.modelNumber.trim() : '',
      serialNumber: data.serialNumber && data.serialNumber.trim() ? data.serialNumber.trim() : null,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : 0,
      seller: data.seller ? data.seller.trim() : '',
      warrantyStartDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : null,
      warrantyEndDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : null,
      returnDeadline: data.returnDeadline ? new Date(data.returnDeadline) : null,
      productImage: data.productImage || '',
      notes: data.notes ? data.notes.trim() : ''
    };

    return Product.create(payload);
  }

  async updateProduct(userId, productId, updates) {
    const product = await Product.findOne({ _id: productId, userId });
    if (!product) {
      const err = new Error('Product not found or access denied.');
      err.status = 404;
      throw err;
    }

    const allowedFields = [
      'productName',
      'brand',
      'category',
      'modelNumber',
      'serialNumber',
      'purchaseDate',
      'purchasePrice',
      'seller',
      'warrantyStartDate',
      'warrantyEndDate',
      'returnDeadline',
      'productImage',
      'notes'
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === 'serialNumber') {
          product[field] = updates[field] && updates[field].trim() ? updates[field].trim() : null;
        } else if (['purchaseDate', 'warrantyStartDate', 'warrantyEndDate', 'returnDeadline'].includes(field)) {
          product[field] = updates[field] ? new Date(updates[field]) : null;
        } else if (field === 'purchasePrice') {
          product[field] = Number(updates[field]);
        } else {
          product[field] = updates[field];
        }
      }
    });

    return product.save();
  }

  async deleteProduct(userId, productId) {
    const product = await Product.findOne({ _id: productId, userId });
    if (!product) {
      const err = new Error('Product not found or access denied.');
      err.status = 404;
      throw err;
    }

    // Unlink documents (or delete) and repairs
    await Promise.all([
      Product.deleteOne({ _id: productId, userId }),
      Document.updateMany({ productId, userId }, { productId: null }),
      Repair.deleteMany({ productId, userId })
    ]);

    return { success: true, message: 'Product deleted successfully.' };
  }
}

module.exports = new ProductService();
