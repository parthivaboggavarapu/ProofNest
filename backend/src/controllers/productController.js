const productService = require('../services/productService');

class ProductController {
  async getProducts(req, res, next) {
    try {
      const products = await productService.getProducts(req.user._id, req.query);
      res.status(200).json({
        success: true,
        count: products.length,
        products
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req, res, next) {
    try {
      const data = await productService.getProductById(req.user._id, req.params.id);
      res.status(200).json({
        success: true,
        ...data
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const product = await productService.createProduct(req.user._id, req.body);
      res.status(201).json({
        success: true,
        message: 'Product added successfully.',
        product
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const product = await productService.updateProduct(req.user._id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Product updated successfully.',
        product
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const result = await productService.deleteProduct(req.user._id, req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
