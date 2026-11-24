const { connectDB, disconnectDB, getGridFSBucket } = require('../src/config/db');
const authService = require('../src/services/authService');
const productService = require('../src/services/productService');
const documentService = require('../src/services/documentService');
const ocrService = require('../src/services/ocrService');
const repairService = require('../src/services/repairService');
const notificationService = require('../src/services/notificationService');
const aiService = require('../src/services/aiService');
const {
  User,
  RefreshToken,
  Product,
  Document,
  Repair,
  Notification,
  DocumentChunk,
  Conversation,
  Message
} = require('../src/models');

const TEST_RUN = Date.now().toString(36);
const TEST_EMAIL_ALICE = `alice_${TEST_RUN}@example.com`;
const TEST_EMAIL_BOB = `bob_${TEST_RUN}@example.com`;
const TEST_PASSWORD = 'SecurePassword123!';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${name}: ${details}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log('===================================================================');
  console.log('  ProofNest Full-Stack Prototype: Backend Test Suite');
  console.log('===================================================================');

  let alice, bob;
  let aliceProduct;
  let uploadedDoc;

  try {
    // 1. Database Connection & GridFS Bucket
    console.log('\n[1/8] Verifying Database Connection & GridFS Initialization...');
    const { connection, gridFSBucket } = await connectDB();
    assert(connection.readyState === 1, 'MongoDB connection state is 1 (connected)');
    assert(gridFSBucket && typeof gridFSBucket.openUploadStream === 'function', 'GridFS bucket initialized successfully');

    // 2. JWT Authentication & Refresh Token Rotation
    console.log('\n[2/8] Verifying JWT Authentication & Token Security...');
    const aliceAuth = await authService.register({
      name: 'Alice Vance',
      email: TEST_EMAIL_ALICE,
      password: TEST_PASSWORD
    });
    alice = aliceAuth.user;
    assert(alice && alice.email === TEST_EMAIL_ALICE, 'Alice registered with sanitized user object');
    assert(aliceAuth.accessToken && aliceAuth.refreshToken, 'Access and refresh tokens issued');

    const bobAuth = await authService.register({
      name: 'Bob Miller',
      email: TEST_EMAIL_BOB,
      password: TEST_PASSWORD
    });
    bob = bobAuth.user;
    assert(bob && bob.email === TEST_EMAIL_BOB, 'Bob registered for multi-tenant tests');

    // Test token rotation
    const rotated = await authService.refresh({ rawRefreshToken: aliceAuth.refreshToken });
    assert(rotated.refreshToken !== aliceAuth.refreshToken, 'Refresh token rotated successfully');

    // Test token reuse detection
    let reuseError = null;
    try {
      await authService.refresh({ rawRefreshToken: aliceAuth.refreshToken });
    } catch (err) {
      reuseError = err;
    }
    assert(reuseError && (reuseError.code === 'REFRESH_TOKEN_REUSE' || reuseError.status === 403), 'Reusing rotated token triggers reuse detection');

    // 3. Product CRUD & Multi-Tenant Scoping
    console.log('\n[3/8] Verifying Product Management & Tenant Scoping...');
    aliceProduct = await productService.createProduct(alice._id, {
      productName: 'Dell XPS 15 Laptop',
      brand: 'Dell',
      category: 'Computers & Laptops',
      modelNumber: 'XPS-9530',
      serialNumber: `SN-DELL-${TEST_RUN}`,
      purchasePrice: 1899,
      seller: 'Best Buy',
      purchaseDate: new Date('2026-01-15'),
      warrantyEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days remaining!
      returnDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 day remaining!
    });
    assert(aliceProduct._id && aliceProduct.productName === 'Dell XPS 15 Laptop', 'Product created successfully for Alice');

    // Multi-tenant isolation: Bob cannot access Alice's product
    let unauthorizedAccess = null;
    try {
      await productService.getProductById(bob._id, aliceProduct._id);
    } catch (err) {
      unauthorizedAccess = err;
    }
    assert(unauthorizedAccess && unauthorizedAccess.status === 404, "Bob cannot access Alice's product (Tenant isolated)");

    // 4. GridFS Document Storage
    console.log('\n[4/8] Verifying GridFS Document Storage & Streaming...');
    const sampleInvoiceBuffer = Buffer.from('%PDF-1.4 Sample Invoice for Dell XPS 15 Total: $1899.00 Seller: Best Buy Date: 2026-01-15 Warranty: 1 year', 'utf-8');
    uploadedDoc = await documentService.uploadDocument({
      userId: alice._id,
      productId: aliceProduct._id,
      documentType: 'Invoice',
      file: {
        originalname: 'dell_invoice.pdf',
        mimetype: 'application/pdf',
        size: sampleInvoiceBuffer.length,
        buffer: sampleInvoiceBuffer
      },
      extractedText: 'Dell XPS 15 Laptop Invoice Total: $1899.00'
    });
    assert(uploadedDoc._id && uploadedDoc.gridFsFileId, 'Document saved into GridFS and metadata collection');

    // Stream download check
    const { document: dlDoc, downloadStream } = await documentService.getDownloadStream(alice._id, uploadedDoc._id);
    assert(dlDoc && downloadStream, 'GridFS download stream opened successfully');

    // 5. OCR & Heuristic Parsing
    console.log('\n[5/8] Verifying OCR & Heuristic Invoice Extraction...');
    const invoiceSampleText = `
      INVOICE / RECEIPT
      Seller: Best Buy Store #412
      Date: 2026-01-15
      Invoice Number: INV-987654
      Item: Apple MacBook Pro 14
      Brand: Apple
      Total Amount: $1,999.00
      Warranty: 2 Years
    `;
    const parsedFields = ocrService.parseInvoiceFields(invoiceSampleText);
    assert(parsedFields.brand === 'Apple', `OCR heuristic extracted brand: ${parsedFields.brand}`);
    assert(parsedFields.seller === 'Best Buy', `OCR heuristic extracted seller: ${parsedFields.seller}`);
    assert(parsedFields.purchasePrice === 1999, `OCR heuristic extracted price: ${parsedFields.purchasePrice}`);
    assert(parsedFields.invoiceNumber === 'INV-987654', `OCR heuristic extracted invoice number: ${parsedFields.invoiceNumber}`);

    // 6. Repair History & Cost Analytics
    console.log('\n[6/8] Verifying Repair Tracking & Analytics...');
    const repairRecord = await repairService.createRepair(alice._id, {
      productId: aliceProduct._id,
      issueDescription: 'Fan noise and thermal repasting',
      serviceCenter: 'Authorized Dell Support',
      repairCost: 150.0,
      repairStatus: 'completed'
    });
    assert(repairRecord._id && repairRecord.repairCost === 150, 'Repair logged successfully');

    const repairsList = await repairService.getRepairs(alice._id);
    assert(repairsList.analytics.totalCost === 150, 'Repair analytics correctly computed total cost: $150');

    // 7. Automated Reminders (node-cron engine)
    console.log('\n[7/8] Verifying Automated Deadline Reminders...');
    const reminderResult = await notificationService.checkAndGenerateReminders();
    assert(reminderResult.success === true, 'Reminder evaluation executed without errors');

    const aliceNotifications = await notificationService.getNotifications(alice._id);
    assert(aliceNotifications.notifications.length > 0, `Reminders generated (${aliceNotifications.notifications.length} notifications) for 4-day & 1-day milestones`);

    // 8. AI Chatbot & Context Retrieval (RAG)
    console.log('\n[8/8] Verifying AI Retrieval-Augmented Generation (RAG)...');
    await aiService.ingestDocumentText({
      userId: alice._id,
      productId: aliceProduct._id,
      documentId: uploadedDoc._id,
      text: 'Dell XPS 15 Laptop warranty covers hardware replacement and technical support for 12 months.'
    });

    const aiAnswer = await aiService.askQuestion({
      userId: alice._id,
      userMessage: 'When does my Dell XPS 15 warranty expire?'
    });
    assert(aiAnswer.message && aiAnswer.message.content.length > 10, 'AI answered grounded warranty query');
    assert(aiAnswer.conversationId, 'Conversation persisted in MongoDB');

    // Cross-user test: Bob asking about Dell XPS
    const bobAnswer = await aiService.askQuestion({
      userId: bob._id,
      userMessage: 'When does my Dell XPS 15 warranty expire?'
    });
    assert(!bobAnswer.message.content.includes('SN-DELL-'), 'Bob query does NOT leak Alice serial number or documents');

    // Teardown temporary test records
    console.log('\n[Teardown] Cleaning up test records...');
    await Message.deleteMany({ userId: { $in: [alice._id, bob._id] } });
    await Conversation.deleteMany({ userId: { $in: [alice._id, bob._id] } });
    await DocumentChunk.deleteMany({ userId: { $in: [alice._id, bob._id] } });
    await Notification.deleteMany({ userId: { $in: [alice._id, bob._id] } });
    await Repair.deleteMany({ userId: { $in: [alice._id, bob._id] } });
    if (uploadedDoc) {
      await documentService.deleteDocument(alice._id, uploadedDoc._id);
    }
    await Product.deleteMany({ userId: { $in: [alice._id, bob._id] } });
    await RefreshToken.deleteMany({ userId: { $in: [alice._id, bob._id] } });
    await User.deleteMany({ _id: { $in: [alice._id, bob._id] } });
    assert(true, 'All temporary test records safely cleaned up');

    console.log('\n===================================================================');
    console.log(`  Backend Test Suite Complete: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('===================================================================');

    await disconnectDB();

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal backend test error:', error);
    await disconnectDB();
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = runAllTests;
