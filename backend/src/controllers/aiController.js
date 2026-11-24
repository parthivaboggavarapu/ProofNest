const aiService = require('../services/aiService');

class AiController {
  async chat(req, res, next) {
    try {
      const { message, conversationId } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required.'
        });
      }

      const result = await aiService.askQuestion({
        userId: req.user._id,
        userMessage: message.trim(),
        conversationId
      });

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversations(req, res, next) {
    try {
      const conversations = await aiService.getConversations(req.user._id);
      res.status(200).json({
        success: true,
        count: conversations.length,
        conversations
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const messages = await aiService.getMessages(req.user._id, req.params.id);
      res.status(200).json({
        success: true,
        count: messages.length,
        messages
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AiController();
