const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', repairController.getRepairs);
router.post('/', repairController.createRepair);
router.get('/:id', repairController.getRepairById);
router.put('/:id', repairController.updateRepair);
router.delete('/:id', repairController.deleteRepair);

module.exports = router;
