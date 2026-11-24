const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const n8nService = require('../src/services/n8nService');
const { 
  verifyN8nWebhookSecret, 
  verifyN8nHmacSignature, 
  generateHmacHeaders,
  generateDocumentAccessToken,
  verifyDocumentAccessToken
} = require('../src/middleware/n8nAuthMiddleware');
const { ProcessingJob, User, Document, DocumentChunk } = require('../src/models');
const axios = require('axios');

async function runFastIntegrationTests() {
  console.log('\n===================================================================');
  console.log('  ProofNest: Fast n8n Integration & Security Verification Suite');
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

  const TEST_PORT = 5057;
  let server;
  let testUser;
  let testDoc;

  try {
    // 1. Establish DB connection and start Express instance
    await connectDB();
    server = app.listen(TEST_PORT);
    const baseUrl = `http://localhost:${TEST_PORT}`;
    const configuredSecret = process.env.N8N_WEBHOOK_SECRET || 'n8n_test_shared_secret';
    process.env.N8N_WEBHOOK_SECRET = configuredSecret;

    // --- TEST 1: Health Endpoint ---
    console.log('[1/7] Testing GET /api/health minimal response...');
    const healthRes = await axios.get(`${baseUrl}/api/health`);
    assert(
      healthRes.status === 200 &&
      healthRes.data.success === true &&
      healthRes.data.status === 'ok' &&
      healthRes.data.application === 'ProofNest',
      'GET /api/health returns { success: true, status: "ok", application: "ProofNest" }'
    );

    // --- TEST 2: Protected n8n Header Auth ---
    console.log('\n[2/7] Testing Protected n8n Authentication (Header Auth)...');
    const authOkRes = await axios.get(`${baseUrl}/api/integrations/n8n/test`, {
      headers: { 'X-ProofNest-Webhook-Secret': configuredSecret }
    });
    assert(
      authOkRes.status === 200 &&
      authOkRes.data.success === true &&
      authOkRes.data.message === 'n8n authentication successful',
      'GET /api/integrations/n8n/test succeeds with valid X-ProofNest-Webhook-Secret'
    );

    try {
      await axios.get(`${baseUrl}/api/integrations/n8n/test`);
      assert(false, 'Should have failed without header');
    } catch (err) {
      assert(err.response?.status === 401, 'Rejects missing header with HTTP 401');
    }

    try {
      await axios.get(`${baseUrl}/api/integrations/n8n/test`, {
        headers: { 'X-ProofNest-Webhook-Secret': 'wrong_secret' }
      });
      assert(false, 'Should have failed with wrong secret');
    } catch (err) {
      assert(err.response?.status === 403, 'Rejects invalid secret with HTTP 403');
    }

    // --- TEST 3: HMAC-SHA256 Signing Layer ---
    console.log('\n[3/7] Testing HMAC-SHA256 Request Signing with Timestamps & Replay Protection...');
    const hmacPayload = { action: 'sync_event', itemId: 99 };
    const hmacHeaders = generateHmacHeaders(hmacPayload, configuredSecret);

    assert(
      typeof hmacHeaders['X-ProofNest-Signature'] === 'string' &&
      hmacHeaders['X-ProofNest-Signature'].length === 64,
      'Generated valid 64-character SHA-256 HMAC signature'
    );
    assert(
      typeof hmacHeaders['X-ProofNest-Timestamp'] === 'string',
      'Included epoch timestamp for replay protection'
    );

    // Verify middleware logic
    const reqMock = {
      headers: {
        'x-proofnest-signature': hmacHeaders['X-ProofNest-Signature'],
        'x-proofnest-timestamp': hmacHeaders['X-ProofNest-Timestamp']
      },
      body: hmacPayload
    };
    let nextCalled = false;
    verifyN8nHmacSignature(reqMock, {}, () => { nextCalled = true; });
    assert(nextCalled === true, 'HMAC signature verification passed with constant-time comparison');

    // Test replay attack rejection
    const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes old
    const expiredMock = {
      headers: {
        'x-proofnest-signature': 'dummy_sig',
        'x-proofnest-timestamp': oldTimestamp
      },
      body: hmacPayload
    };
    let expiredRejected = false;
    const resMock = {
      status: (code) => ({
        json: (data) => {
          if (code === 403) expiredRejected = true;
        }
      })
    };
    verifyN8nHmacSignature(expiredMock, resMock, () => {});
    assert(expiredRejected === true, 'Replay attack with expired timestamp correctly rejected with 403');

    // --- TEST 4: ProcessingJob Lifecycle & Idempotency ---
    console.log('\n[4/7] Testing ProcessingJob Lifecycle & Duplicate Callback Prevention...');
    testUser = await User.create({
      name: 'Integration User',
      email: `test_n8n_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash_12345'
    });

    const testJobId = `job_test_${Date.now()}`;
    const newJob = await ProcessingJob.create({
      jobId: testJobId,
      userId: testUser._id,
      type: 'ocr_extraction',
      status: 'processing',
      payload: { test: true }
    });

    assert(newJob.userId.equals(testUser._id) && newJob.status === 'processing', 'ProcessingJob created with userId, jobId, and status');

    // First callback
    const callbackRes1 = await axios.post(
      `${baseUrl}/api/integrations/n8n/document-processing/callback`,
      {
        jobId: testJobId,
        status: 'completed',
        extractedData: { brand: 'Sony', price: 299 },
        rawText: 'Sony Wireless Headphones $299'
      },
      { headers: { 'X-ProofNest-Webhook-Secret': configuredSecret } }
    );
    assert(callbackRes1.status === 200 && callbackRes1.data.success === true, 'First callback successfully marks job completed');

    // Duplicate callback check
    const callbackRes2 = await axios.post(
      `${baseUrl}/api/integrations/n8n/document-processing/callback`,
      {
        jobId: testJobId,
        status: 'completed'
      },
      { headers: { 'X-ProofNest-Webhook-Secret': configuredSecret } }
    );
    assert(
      callbackRes2.data.message.includes('Idempotent'),
      'Duplicate callback gracefully handled idempotently without re-triggering logic'
    );

    // --- TEST 5: Short-Lived Scoped Document Access ---
    console.log('\n[5/7] Testing Short-Lived Scoped Document Access Token...');
    const fakeDocId = new mongoose.Types.ObjectId();
    const token = generateDocumentAccessToken(fakeDocId, 60);

    assert(verifyDocumentAccessToken(fakeDocId, token) === true, 'Generated short-lived token verified for target document');
    assert(verifyDocumentAccessToken(new mongoose.Types.ObjectId(), token) === false, 'Tampered document ID rejected by token verification');

    // --- TEST 6: Context Retrieval & Embeddings Submission ---
    console.log('\n[6/7] Testing n8n Document Context & Embeddings Endpoints...');
    // Create dummy GridFS file & Document
    const dbInstance = require('../src/config/db');
    const bucket = dbInstance.getGridFSBucket();
    const uploadStream = bucket.openUploadStream('sample.pdf');
    uploadStream.end(Buffer.from('ProofNest Test File Content'));
    await new Promise(r => uploadStream.on('finish', r));

    testDoc = await Document.create({
      userId: testUser._id,
      originalFileName: 'sample.pdf',
      mimeType: 'application/pdf',
      fileSize: 28,
      documentType: 'Invoice',
      gridFsFileId: uploadStream.id
    });

    // n8n context retrieval
    const contextRes = await axios.get(
      `${baseUrl}/api/integrations/n8n/context/${testDoc._id}`,
      { headers: { 'X-ProofNest-Webhook-Secret': configuredSecret } }
    );
    assert(
      contextRes.status === 200 &&
      contextRes.data.data.fileName === 'sample.pdf',
      'n8n retrieved user-scoped document context safely'
    );

    // n8n embeddings submission
    const embedRes = await axios.post(
      `${baseUrl}/api/integrations/n8n/embeddings`,
      {
        documentId: testDoc._id,
        chunks: [
          { text: 'Sample chunk 1', embedding: [0.1, 0.2, 0.3] },
          { text: 'Sample chunk 2', embedding: [0.4, 0.5, 0.6] }
        ]
      },
      { headers: { 'X-ProofNest-Webhook-Secret': configuredSecret } }
    );
    assert(
      embedRes.status === 200 && embedRes.data.data.count === 2,
      'n8n successfully persisted generated embeddings into MongoDB Atlas DocumentChunks'
    );

    // Clean up test chunks
    await DocumentChunk.deleteMany({ documentId: testDoc._id });
    await bucket.delete(uploadStream.id);

    // --- TEST 7: Docker Host Connectivity Verification ---
    console.log('\n[7/7] Testing n8n Docker Host Addressing...');
    assert(
      n8nService.backendDockerUrl === 'http://host.docker.internal:5000',
      'Docker address configured as http://host.docker.internal:5000'
    );
    assert(
      n8nService.baseUrl === 'http://localhost:5678',
      'Host address configured as http://localhost:5678'
    );

    console.log('\n===================================================================');
    console.log(`  Fast n8n Test Suite Complete: ${passed} Passed, ${failed} Failed`);
    console.log('===================================================================\n');

  } catch (err) {
    console.error('Integration tests encountered an error:', err);
    failed++;
  } finally {
    if (testUser) {
      await ProcessingJob.deleteMany({ userId: testUser._id });
      await Document.deleteMany({ userId: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    if (server) {
      await new Promise(r => server.close(r));
    }
    await disconnectDB();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runFastIntegrationTests();
