const repairService = require('../services/repairService');

class RepairController {
  async getRepairs(req, res, next) {
    try {
      const result = await repairService.getRepairs(req.user._id, req.query);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  async getRepairById(req, res, next) {
    try {
      const repair = await repairService.getRepairById(req.user._id, req.params.id);
      res.status(200).json({
        success: true,
        repair
      });
    } catch (error) {
      next(error);
    }
  }

  async createRepair(req, res, next) {
    try {
      const repair = await repairService.createRepair(req.user._id, req.body);
      res.status(201).json({
        success: true,
        message: 'Repair logged successfully.',
        repair
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRepair(req, res, next) {
    try {
      const repair = await repairService.updateRepair(req.user._id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Repair updated successfully.',
        repair
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRepair(req, res, next) {
    try {
      const result = await repairService.deleteRepair(req.user._id, req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RepairController();
