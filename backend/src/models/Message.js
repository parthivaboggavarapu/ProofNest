const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    sources: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        originalFileName: String,
        documentType: String,
        snippet: String
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
module.exports = Message;
