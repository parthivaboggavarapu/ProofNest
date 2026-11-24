const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/chat', aiController.chat);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id/messages', aiController.getMessages);

module.exports = router;
