const aiService = require('../services/aiService');

class AiController {
  async chat(req, res, next) {
    try {
      const { message, query, conversationId } = req.body;
      const userText = (message || query || '').trim();

      if (!userText) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required.'
        });
      }

      const result = await aiService.askQuestion({
        userId: req.user._id,
        userMessage: userText,
        conversationId
      });

      res.status(200).json({
        success: true,
        conversationId: result.conversationId,
        message: result.message,
        answer: result.message?.content || '',
        sources: result.sources || [],
        data: {
          conversationId: result.conversationId,
          message: result.message,
          answer: result.message?.content || '',
          sources: result.sources || []
        }
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
        conversations,
        data: {
          conversations
        }
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
        messages,
        data: {
          messages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteConversation(req, res, next) {
    try {
      const { Conversation, Message } = require('../models');
      const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
      if (!conv) {
        return res.status(404).json({ success: false, error: 'Conversation not found or unauthorized' });
      }
      await Message.deleteMany({ conversationId: conv._id, userId: req.user._id });
      await Conversation.deleteOne({ _id: conv._id });
      res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AiController();
