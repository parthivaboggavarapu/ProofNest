const { Repair, Product } = require('../models');

class RepairService {
  async getRepairs(userId, query = {}) {
    const filter = { userId };

    if (query.productId) {
      filter.productId = query.productId;
    }

    if (query.repairStatus && query.repairStatus !== 'All') {
      filter.repairStatus = query.repairStatus;
    }

    const repairs = await Repair.find(filter)
      .populate('productId', 'productName brand category modelNumber')
      .populate('repairBillDocumentId', 'originalFileName mimeType fileSize')
      .sort({ repairDate: -1 });

    // Aggregate statistics
    const totalRepairCost = repairs.reduce((acc, curr) => acc + (curr.repairCost || 0), 0);
    const activeRepairsCount = repairs.filter((r) => ['requested', 'approved', 'in_progress'].includes(r.repairStatus)).length;
    const completedRepairsCount = repairs.filter((r) => r.repairStatus === 'completed').length;

    return {
      repairs,
      analytics: {
        totalCost: totalRepairCost,
        activeCount: activeRepairsCount,
        completedCount: completedRepairsCount,
        totalCount: repairs.length
      }
    };
  }

  async getRepairById(userId, repairId) {
    const repair = await Repair.findOne({ _id: repairId, userId })
      .populate('productId', 'productName brand category modelNumber')
      .populate('repairBillDocumentId', 'originalFileName mimeType fileSize');

    if (!repair) {
      const err = new Error('Repair record not found or access denied.');
      err.status = 404;
      throw err;
    }
    return repair;
  }

  async createRepair(userId, data) {
    if (!data.productId) {
      const err = new Error('Associated product ID is required.');
      err.status = 400;
      throw err;
    }

    if (!data.issueDescription) {
      const err = new Error('Issue description is required.');
      err.status = 400;
      throw err;
    }

    const product = await Product.findOne({ _id: data.productId, userId });
    if (!product) {
      const err = new Error('Associated product not found or access denied.');
      err.status = 404;
      throw err;
    }

    const repair = await Repair.create({
      userId,
      productId: data.productId,
      repairDate: data.repairDate ? new Date(data.repairDate) : new Date(),
      issueDescription: data.issueDescription.trim(),
      serviceCenter: data.serviceCenter ? data.serviceCenter.trim() : '',
      repairCost: data.repairCost !== undefined ? Number(data.repairCost) : 0,
      repairStatus: data.repairStatus || 'requested',
      repairBillDocumentId: data.repairBillDocumentId || null
    });

    return repair.populate('productId', 'productName brand category');
  }

  async updateRepair(userId, repairId, updates) {
    const repair = await Repair.findOne({ _id: repairId, userId });
    if (!repair) {
      const err = new Error('Repair record not found or access denied.');
      err.status = 404;
      throw err;
    }

    const allowed = [
      'repairDate',
      'issueDescription',
      'serviceCenter',
      'repairCost',
      'repairStatus',
      'repairBillDocumentId'
    ];

    allowed.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === 'repairDate') {
          repair[field] = updates[field] ? new Date(updates[field]) : repair[field];
        } else if (field === 'repairCost') {
          repair[field] = Number(updates[field]);
        } else {
          repair[field] = updates[field];
        }
      }
    });

    await repair.save();
    return repair.populate('productId', 'productName brand category');
  }

  async deleteRepair(userId, repairId) {
    const repair = await Repair.findOne({ _id: repairId, userId });
    if (!repair) {
      const err = new Error('Repair record not found or access denied.');
      err.status = 404;
      throw err;
    }

    await Repair.deleteOne({ _id: repairId, userId });
    return { success: true, message: 'Repair record deleted successfully.' };
  }
}

module.exports = new RepairService();
