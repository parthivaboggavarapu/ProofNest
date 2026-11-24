const axios = require('axios');
const {
  DocumentChunk,
  Product,
  Repair,
  Document,
  Conversation,
  Message
} = require('../models');

class AiService {
  /**
   * Chunks document text and saves chunks into DocumentChunk collection.
   */
  async ingestDocumentText({ userId, productId, documentId, text }) {
    if (!text || text.trim().length === 0) return [];

    const cleanedText = text.replace(/\s+/g, ' ').trim();
    const chunkSize = 500;
    const overlap = 50;
    const chunks = [];

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < cleanedText.length) {
      const endIndex = Math.min(startIndex + chunkSize, cleanedText.length);
      const chunkText = cleanedText.substring(startIndex, endIndex);

      chunks.push({
        userId,
        productId: productId || null,
        documentId,
        chunkText,
        chunkIndex,
        embedding: [] // Placeholder for vector embedding
      });

      chunkIndex++;
      startIndex += chunkSize - overlap;
    }

    if (chunks.length > 0) {
      // Remove any prior chunks for this document before inserting
      await DocumentChunk.deleteMany({ documentId, userId });
      return DocumentChunk.insertMany(chunks);
    }
    return [];
  }

  /**
   * Hybrid retrieval: Gathers user's structured product/repair records
   * and relevant unstructured document chunks (strictly scoped to userId).
   */
  async retrieveContext(userId, queryText) {
    const keywords = queryText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    // 1. Structured product context
    const products = await Product.find({ userId }).sort({ createdAt: -1 });

    // 2. Structured repair context
    const repairs = await Repair.find({ userId }).populate('productId', 'productName').sort({ repairDate: -1 });

    // 3. Document chunk context
    let chunkFilter = { userId };
    if (keywords.length > 0) {
      const regexPatterns = keywords.slice(0, 5).map((k) => new RegExp(k, 'i'));
      chunkFilter.chunkText = { $in: regexPatterns };
    }

    const chunks = await DocumentChunk.find(chunkFilter)
      .populate('documentId', 'originalFileName documentType')
      .populate('productId', 'productName')
      .limit(6);

    // Format Structured Context String
    let structuredInfo = 'USER INVENTORY & PRODUCTS:\n';
    if (products.length === 0) {
      structuredInfo += 'No products registered yet.\n';
    } else {
      products.forEach((p, idx) => {
        const warrantyStr = p.warrantyEndDate ? new Date(p.warrantyEndDate).toDateString() : 'None';
        const returnStr = p.returnDeadline ? new Date(p.returnDeadline).toDateString() : 'None';
        const purchaseStr = p.purchaseDate ? new Date(p.purchaseDate).toDateString() : 'Unknown';
        structuredInfo += `${idx + 1}. [Product: ${p.productName}] Brand: ${p.brand || 'N/A'}, Category: ${p.category}, Serial: ${p.serialNumber || 'N/A'}, Purchase Date: ${purchaseStr}, Price: $${p.purchasePrice || 0}, Seller: ${p.seller || 'N/A'}, Warranty End Date: ${warrantyStr}, Return Deadline: ${returnStr}\n`;
      });
    }

    structuredInfo += '\nUSER REPAIR HISTORY:\n';
    if (repairs.length === 0) {
      structuredInfo += 'No repairs logged.\n';
    } else {
      repairs.forEach((r, idx) => {
        const pName = r.productId ? r.productId.productName : 'General Item';
        structuredInfo += `${idx + 1}. Product: ${pName}, Issue: "${r.issueDescription}", Cost: $${r.repairCost || 0}, Status: ${r.repairStatus}, Date: ${new Date(r.repairDate).toDateString()}, Service Center: ${r.serviceCenter || 'N/A'}\n`;
      });
    }

    // Format Unstructured Document Snippets
    let documentSnippets = '\nEXTRACTED DOCUMENT SNIPPETS:\n';
    const sources = [];

    if (chunks.length > 0) {
      chunks.forEach((c) => {
        const docName = c.documentId ? c.documentId.originalFileName : 'Document';
        const docType = c.documentId ? c.documentId.documentType : 'Receipt';
        documentSnippets += `[Source: ${docName} (${docType})]: "${c.chunkText}"\n`;

        if (c.documentId && !sources.some((s) => s.documentId.toString() === c.documentId._id.toString())) {
          sources.push({
            documentId: c.documentId._id,
            originalFileName: docName,
            documentType: docType,
            snippet: c.chunkText.substring(0, 140) + '...'
          });
        }
      });
    } else {
      documentSnippets += 'No specific document chunks matched.\n';
    }

    return {
      contextPrompt: `${structuredInfo}\n${documentSnippets}`,
      sources,
      products,
      repairs
    };
  }

  /**
   * Deterministic local answer engine for fallback if OpenRouter key is not set or network fails.
   */
  generateLocalAnswer(queryText, products, repairs, sources) {
    const q = queryText.toLowerCase();

    // Check warranty
    if (q.includes('warranty')) {
      const matched = products.find((p) => q.includes(p.productName.toLowerCase()) || (p.brand && q.includes(p.brand.toLowerCase())));
      if (matched) {
        if (matched.warrantyEndDate) {
          const isExpired = new Date() > new Date(matched.warrantyEndDate);
          return `The warranty for your **${matched.productName}** ${isExpired ? 'expired on' : 'expires on'} **${new Date(matched.warrantyEndDate).toLocaleDateString()}**.`;
        }
        return `There is no warranty end date recorded for **${matched.productName}**.`;
      }

      const activeList = products
        .map((p) => `- **${p.productName}**: Warranty ends on ${p.warrantyEndDate ? new Date(p.warrantyEndDate).toLocaleDateString() : 'N/A'}`)
        .join('\n');
      return `Here are the warranty details for your products:\n\n${activeList || 'No products registered.'}`;
    }

    // Check repair cost / history
    if (q.includes('repair') || q.includes('cost')) {
      const totalCost = repairs.reduce((acc, curr) => acc + (curr.repairCost || 0), 0);
      if (q.includes('total')) {
        return `Your total recorded repair cost across all products is **$${totalCost.toFixed(2)}**. You have **${repairs.length}** repair record(s).`;
      }
      if (repairs.length > 0) {
        const repairList = repairs.map((r) => `- **${r.productId ? r.productId.productName : 'Item'}**: ${r.issueDescription} ($${r.repairCost}, Status: ${r.repairStatus})`).join('\n');
        return `Here is your logged repair history:\n\n${repairList}\n\n**Total repair expenses:** $${totalCost.toFixed(2)}`;
      }
      return 'You currently have no repair records logged in ProofNest.';
    }

    // Check products / purchases
    if (q.includes('product') || q.includes('purchase') || q.includes('bought')) {
      if (products.length > 0) {
        const pList = products
          .map((p) => `- **${p.productName}** (${p.brand || 'No Brand'}): Purchased on ${p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : 'N/A'} for $${p.purchasePrice || 0}`)
          .join('\n');
        return `You have **${products.length}** product(s) registered in ProofNest:\n\n${pList}`;
      }
      return 'You have not added any products to your inventory yet.';
    }

    // Default grounded fallback
    return `Based on your ProofNest records, you have ${products.length} product(s) and ${repairs.length} repair record(s) logged. Ask me specific questions about warranty dates, repair costs, or invoices!`;
  }

  /**
   * Main Question-Answering Method using OpenRouter with local grounded fallback.
   */
  async askQuestion({ userId, userMessage, conversationId }) {
    // 1. Manage or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
    }
    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        title: userMessage.substring(0, 45) + (userMessage.length > 45 ? '...' : '')
      });
    }

    // 2. Retrieve user context & document snippets
    const { contextPrompt, sources, products, repairs } = await this.retrieveContext(
      userId,
      userMessage
    );

    // 3. Save User Message
    await Message.create({
      conversationId: conversation._id,
      userId,
      role: 'user',
      content: userMessage
    });

    let assistantResponse = '';

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const isMockKey = !openRouterApiKey || openRouterApiKey.includes('placeholder');

    if (!isMockKey) {
      try {
        const systemPrompt = `You are ProofNest AI, a helpful, precise personal inventory and product warranty assistant.
You help users manage products, warranty expirations, invoices, receipts, and repair bills.

CRITICAL INSTRUCTIONS:
1. Base your answer EXCLUSIVELY on the provided USER CONTEXT below.
2. If the user asks about a warranty, price, repair, or document that is NOT in the context, explicitly state: "I don't have that information in your saved records."
3. Never fabricate or hallucinate dates, prices, or serial numbers.
4. Always cite specific product names or source document names when referencing information.

USER CONTEXT:
${contextPrompt}`;

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.2
          },
          {
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://proofnest.app',
              'X-Title': 'ProofNest'
            },
            timeout: 25000
          }
        );

        if (
          response.data &&
          response.data.choices &&
          response.data.choices[0] &&
          response.data.choices[0].message
        ) {
          assistantResponse = response.data.choices[0].message.content;
        }
      } catch (err) {
        console.warn('[OpenRouter API Error / Fallback]:', err.response ? err.response.data : err.message);
      }
    }

    // Fallback if OpenRouter was skipped, timed out, or threw error
    if (!assistantResponse) {
      assistantResponse = this.generateLocalAnswer(userMessage, products, repairs, sources);
    }

    // 4. Save Assistant Message with source references
    const savedAssistantMessage = await Message.create({
      conversationId: conversation._id,
      userId,
      role: 'assistant',
      content: assistantResponse,
      sources
    });

    return {
      conversationId: conversation._id,
      message: savedAssistantMessage,
      sources
    };
  }

  async getConversations(userId) {
    return Conversation.find({ userId }).sort({ createdAt: -1 });
  }

  async getMessages(userId, conversationId) {
    const conv = await Conversation.findOne({ _id: conversationId, userId });
    if (!conv) {
      const err = new Error('Conversation not found or access denied.');
      err.status = 404;
      throw err;
    }

    return Message.find({ conversationId, userId }).sort({ createdAt: 1 });
  }
}

module.exports = new AiService();
