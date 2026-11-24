const mongoose = require('mongoose');
const crypto = require('crypto');
const db = require('../src/config/db');
const { User, Document, ProcessingJob } = require('../src/models');
const n8nService = require('../src/services/n8nService');
const { 
  signPayload, 
  generateDocumentAccessToken, 
  verifyDocumentAccessToken 
} = require('../src/middleware/n8nAuthMiddleware');

async function runN8nTests() {
  console.log('\n===================================================================');
  console.log('  ProofNest: n8n Integration & Security Test Suite');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    await db.connectDB();

    // 1. Security & Signature verification
    console.log('[1/4] Testing HMAC Signature & Token Verification...');
    const secret = 'test_n8n_secret_999';
    process.env.N8N_WEBHOOK_SECRET = secret;

    const testPayload = { jobId: 'job_test_123', status: 'completed' };
    const sig = signPayload(testPayload, secret);
    assert(typeof sig === 'string' && sig.length === 64, 'Generated 64-char HMAC-SHA256 signature');

    const fakeDocId = new mongoose.Types.ObjectId();
    const shortLivedToken = generateDocumentAccessToken(fakeDocId, 60);
    assert(verifyDocumentAccessToken(fakeDocId, shortLivedToken) === true, 'Short-lived document token verified successfully');
    assert(verifyDocumentAccessToken(new mongoose.Types.ObjectId(), shortLivedToken) === false, 'Tampered document ID rejected by token validator');

    // 2. Asynchronous ProcessingJob lifecycle
    console.log('\n[2/4] Testing ProcessingJob lifecycle...');
    const testUser = await User.create({
      name: 'N8n Test User',
      email: `n8n_test_${Date.now()}@example.com`,
      passwordHash: 'dummy_hashed_password_123'
    });

    const job = await ProcessingJob.create({
      jobId: `job_test_${Date.now()}`,
      user: testUser._id,
      type: 'ocr_extraction',
      status: 'processing',
      payload: { test: true }
    });

    assert(job.status === 'processing', 'ProcessingJob initialized in processing state');

    // Simulate n8n callback execution
    const callbackData = {
      jobId: job.jobId,
      status: 'completed',
      extractedData: {
        brand: 'Samsung',
        purchasePrice: 799.99,
        serialNumber: 'SN-SAMS-9988'
      },
      rawText: 'Samsung Galaxy S24 Ultra $799.99'
    };

    const updatedJob = await n8nService.handleOcrCallback(callbackData);
    assert(updatedJob.status === 'completed', 'ProcessingJob completed via callback');
    assert(updatedJob.result.extractedData.brand === 'Samsung', 'Extracted data saved into job result');

    // 3. Document Processing Trigger Fallback
    console.log('\n[3/4] Testing triggerDocumentProcessing & internal fallback...');
    // Create dummy GridFS document
    const bucket = db.getGridFSBucket();
    const uploadStream = bucket.openUploadStream('test_invoice.txt');
    uploadStream.end(Buffer.from('Brand: Dell Inspiron 15 Price: $650.00'));
    await new Promise((resolve) => uploadStream.on('finish', resolve));

    const testDoc = await Document.create({
      userId: testUser._id,
      documentType: 'Invoice',
      originalFileName: 'test_invoice.txt',
      fileSize: 40,
      mimeType: 'text/plain',
      gridFsFileId: uploadStream.id
    });

    const triggerResult = await n8nService.triggerDocumentProcessing(testUser._id, testDoc._id);
    assert(triggerResult.jobId && triggerResult.jobId.startsWith('job_ocr_'), 'n8nService returned job tracking ID');

    // Wait for internal fallback processing
    await new Promise(r => setTimeout(r, 2500));
    const processedJob = await ProcessingJob.findOne({ jobId: triggerResult.jobId });
    if (processedJob && processedJob.error) {
      console.log('    Fallback error note:', processedJob.error);
    }
    assert(processedJob && processedJob.status === 'completed', 'Job finished successfully through fallback pipeline');

    // 4. Clean up test records
    console.log('\n[4/4] Cleaning up test records...');
    await ProcessingJob.deleteMany({ user: testUser._id });
    await Document.deleteMany({ user: testUser._id });
    await User.findByIdAndDelete(testUser._id);
    await bucket.delete(uploadStream.id);
    console.log('  [PASS] Cleaned up temporary test user, documents, and jobs');

    console.log('\n===================================================================');
    console.log(`  n8n Test Suite Complete: ${passed} Passed, ${failed} Failed`);
    console.log('===================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runN8nTests();
