const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const { User, Conversation, Message, Product } = require('../src/models');
const aiService = require('../src/services/aiService');
const aiController = require('../src/controllers/aiController');

async function runAiTests() {
  console.log('\n===================================================================');
  console.log('  ProofNest: Internal AI Assistant Chatbot Tests');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    await connectDB();

    const timestamp = Date.now();
    const testUser = await User.create({
      name: 'AI Test User',
      email: `ai_user_${timestamp}@example.com`,
      passwordHash: 'hashed_pw_for_tests'
    });

    const otherUser = await User.create({
      name: 'Other AI User',
      email: `other_ai_${timestamp}@example.com`,
      passwordHash: 'hashed_pw_for_tests'
    });

    // Seed test product for context
    const testProduct = await Product.create({
      userId: testUser._id,
      productName: 'Sony WH-1000XM5 Headphones',
      brand: 'Sony',
      modelNumber: 'WH-1000XM5',
      category: 'Electronics',
      purchaseDate: new Date('2025-01-15'),
      purchasePrice: 399.99,
      seller: 'Best Buy',
      warrantyEndDate: new Date('2026-01-15')
    });

    console.log('[1/7] Testing Authenticated Chat Request & Conversation Creation...');
    let activeConversationId;
    try {
      const response = await aiService.askQuestion({
        userId: testUser._id,
        userMessage: 'What is the warranty on my Sony headphones?',
        conversationId: null
      });

      assert(response && response.conversationId, 'Must create or return conversationId');
      assert(response.message && response.message.content, 'Must return assistant message content');
      activeConversationId = response.conversationId;
      console.log('  [PASS] Created conversation and received assistant response');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Chat request failed:', err.message);
      failed++;
    }

    console.log('[2/7] Testing Message Persistence in MongoDB Atlas...');
    try {
      const messages = await Message.find({ conversationId: activeConversationId });
      assert(messages.length >= 2, 'Should persist user message and assistant reply');
      const userMsg = messages.find(m => m.role === 'user');
      const assistantMsg = messages.find(m => m.role === 'assistant');
      assert(userMsg && userMsg.content.includes('Sony headphones'), 'User message saved correctly');
      assert(assistantMsg && assistantMsg.content.length > 0, 'Assistant message saved correctly');
      console.log('  [PASS] Persisted user & assistant messages into Message collection');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Message persistence failed:', err.message);
      failed++;
    }

    console.log('[3/7] Testing Conversation Ownership Enforcement...');
    try {
      let threw = false;
      try {
        await aiService.getMessages(otherUser._id, activeConversationId);
      } catch (err) {
        threw = true;
        assert(err.status === 404, 'Must throw 404 for accessing other user conversation');
      }
      assert(threw, 'Should reject other user from viewing conversation messages');
      console.log('  [PASS] Conversation ownership enforced; unauthorized access rejected with 404');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Ownership enforcement failed:', err.message);
      failed++;
    }

    console.log('[4/7] Testing Missing / Empty Message Content Validation...');
    try {
      let statusCode = 200;
      let errorResponse = null;
      const mockReq = {
        user: { _id: testUser._id },
        body: { message: '   ' } // Empty string
      };
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        json: (data) => {
          errorResponse = data;
          return mockRes;
        }
      };
      const mockNext = (err) => { throw err; };

      await aiController.chat(mockReq, mockRes, mockNext);

      assert(statusCode === 400, `Expected 400 for empty message, got ${statusCode}`);
      assert(errorResponse && errorResponse.success === false, 'Response must indicate failure');
      console.log('  [PASS] Empty message rejected with 400 Bad Request');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Empty message validation failed:', err.message);
      failed++;
    }

    console.log('[5/7] Testing Grounded Inventory Answer Generation without API Credits...');
    try {
      // Test fallback local reasoning engine with user inventory
      const fallbackAnswer = aiService.generateLocalAnswer(
        'When does my warranty expire?',
        [testProduct],
        [],
        []
      );
      assert(fallbackAnswer && fallbackAnswer.includes('Sony WH-1000XM5'), 'Answer must reference product');
      assert(fallbackAnswer.includes('2026'), 'Answer must mention warranty year');
      console.log('  [PASS] Grounded response generated with accurate product context');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Grounded answer generation failed:', err.message);
      failed++;
    }

    console.log('[6/7] Testing Conversation Retrieval for User...');
    try {
      const convList = await aiService.getConversations(testUser._id);
      assert(convList.length > 0, 'User should have at least 1 conversation');
      assert(convList[0].userId.toString() === testUser._id.toString(), 'Must be scoped to test user');
      console.log('  [PASS] Retrieved user conversations safely');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Get conversations failed:', err.message);
      failed++;
    }

    console.log('[7/7] Testing Conversation Deletion & Message Cleanup...');
    try {
      let statusCode = 200;
      const mockReq = {
        user: { _id: testUser._id },
        params: { id: activeConversationId.toString() }
      };
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        json: () => mockRes
      };
      const mockNext = (err) => { throw err; };

      await aiController.deleteConversation(mockReq, mockRes, mockNext);

      assert(statusCode === 200, `Expected 200 on deletion, got ${statusCode}`);
      const remainingMessages = await Message.find({ conversationId: activeConversationId });
      assert(remainingMessages.length === 0, 'Messages must be deleted');
      console.log('  [PASS] Deleted conversation and safely cleaned up child messages');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Delete conversation failed:', err.message);
      failed++;
    }

    // Teardown
    await Product.deleteMany({ userId: { $in: [testUser._id, otherUser._id] } });
    await Conversation.deleteMany({ userId: { $in: [testUser._id, otherUser._id] } });
    await Message.deleteMany({ userId: { $in: [testUser._id, otherUser._id] } });
    await User.deleteMany({ _id: { $in: [testUser._id, otherUser._id] } });

  } catch (outerErr) {
    console.error('Unexpected test error:', outerErr);
  } finally {
    await disconnectDB();
  }

  console.log(`\n===================================================================`);
  console.log(`  AI Assistant Test Suite Complete: ${passed} Passed, ${failed} Failed`);
  console.log(`===================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAiTests();
}

module.exports = { runAiTests };
