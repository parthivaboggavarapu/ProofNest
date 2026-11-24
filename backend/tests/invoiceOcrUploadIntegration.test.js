const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectDB, disconnectDB, getGridFSBucket } = require('../src/config/db');
const n8nService = require('../src/services/n8nService');
const { User, Document, Product, ProcessingJob } = require('../src/models');
const { generateAccessToken } = require('../src/utils/tokenUtils');
const axios = require('axios');

async function runInvoiceOcrUploadIntegrationTests() {
  console.log('\n===================================================================');
  console.log('  ProofNest: Invoice OCR Upload & Webhook Dispatch Verification Suite');
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

  const TEST_PORT = 5061;
  const MOCK_N8N_PORT = 5679;
  let server;
  let mockN8nServer;
  let testUser;
  let userToken;
  let receivedWebhookEvent = null;

  try {
    // 1. Establish DB connection and start Express server
    await connectDB();
    server = app.listen(TEST_PORT);
    const baseUrl = `http://localhost:${TEST_PORT}`;

    // 2. Start a mock n8n webhook listener on port 5679 to verify actual HTTP dispatch & Header Auth
    mockN8nServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        receivedWebhookEvent = {
          url: req.url,
          method: req.method,
          headers: req.headers,
          body: body ? JSON.parse(body) : null
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Mock n8n received event' }));
      });
    });
    await new Promise(resolve => mockN8nServer.listen(MOCK_N8N_PORT, resolve));

    // Configure test environment variables for webhook testing
    const testWebhookUrl = `http://localhost:${MOCK_N8N_PORT}/webhook-test/proofnest-invoice-ocr`;
    process.env.N8N_DOCUMENT_PROCESSING_WEBHOOK = testWebhookUrl;
    const testSecret = 'pn_test_webhook_sec_abc123';
    process.env.N8N_WEBHOOK_SECRET = testSecret;

    // 3. Authenticate User
    console.log('[1/5] Setting up authenticated user session...');
    testUser = await User.create({
      name: 'OCR Upload Tester',
      email: `ocr_upload_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash_test_ocr'
    });
    userToken = generateAccessToken(testUser);
    assert(typeof userToken === 'string', 'Generated JWT bearer access token');

    // 4. Test POST /api/documents/upload contract (Fixing the root cause)
    console.log('\n[2/5] Testing POST /api/documents/upload response structure...');
    const FormData = require('form-data');
    const form = new FormData();
    const pdfBuffer = Buffer.from('%PDF-1.4 Mock Apple Receipt for MacBook Pro 16 M3 Max $2499.00');
    form.append('file', pdfBuffer, {
      filename: 'apple_invoice.pdf',
      contentType: 'application/pdf'
    });

    const uploadRes = await axios.post(`${baseUrl}/api/documents/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${userToken}`
      }
    });

    assert(uploadRes.status === 201 && uploadRes.data.success === true, 'Upload returned HTTP 201 Created');
    assert(uploadRes.data.data && uploadRes.data.data.document, 'Response includes uploadRes.data.data.document envelope');
    assert(uploadRes.data.document, 'Response maintains backward-compatible uploadRes.data.document');

    const documentId = uploadRes.data.data.document._id || uploadRes.data.document._id;
    assert(documentId, `Retrieved valid document ID: ${documentId}`);

    // 5. Test Triggering Document Processing and Webhook Dispatch
    console.log('\n[3/5] Testing POST /api/integrations/n8n/document-processing...');
    const triggerRes = await axios.post(
      `${baseUrl}/api/integrations/n8n/document-processing`,
      { documentId },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    assert(triggerRes.status === 202 && triggerRes.data.success === true, 'Trigger returned HTTP 202 Accepted');
    const { jobId } = triggerRes.data.data;
    assert(typeof jobId === 'string' && jobId.startsWith('job_ocr_'), `Created ProcessingJob with jobId: ${jobId}`);

    // Wait a brief moment for async webhook dispatch to mock n8n server
    await new Promise(r => setTimeout(r, 600));

    // 6. Verify Actual Webhook Dispatch & Header Auth to n8n
    console.log('\n[4/5] Verifying Webhook dispatch to n8n listener...');
    assert(receivedWebhookEvent !== null, 'n8n mock webhook received actual HTTP POST event');
    assert(
      receivedWebhookEvent.url === '/webhook-test/proofnest-invoice-ocr',
      `Targeted exact webhook URL: ${receivedWebhookEvent.url}`
    );
    assert(
      receivedWebhookEvent.headers['x-proofnest-webhook-secret'] === testSecret,
      'Sent required X-ProofNest-Webhook-Secret matching backend environment'
    );
    assert(
      receivedWebhookEvent.body &&
      receivedWebhookEvent.body.jobId === jobId &&
      receivedWebhookEvent.body.documentId === documentId &&
      typeof receivedWebhookEvent.body.downloadUrl === 'string' &&
      typeof receivedWebhookEvent.body.callbackUrl === 'string',
      'Webhook payload contains valid jobId, documentId, downloadUrl, and callbackUrl'
    );

    // 7. Verify Job Status Polling & n8n Callback Execution
    console.log('\n[5/5] Testing n8n callback and user confirmation...');
    const callbackPayload = {
      jobId,
      status: 'completed',
      rawText: 'Apple Store Invoice #INV-102938 Apple MacBook Pro 16 M3 Max $2499.00',
      extractedData: {
        productName: 'MacBook Pro 16-inch M3 Max',
        brand: 'Apple',
        modelNumber: 'A2991',
        purchasePrice: 2499.00,
        seller: 'Apple Store',
        invoiceNumber: 'INV-102938',
        warrantyExpiry: '2027-04-01'
      }
    };

    const callbackRes = await axios.post(
      `${baseUrl}/api/integrations/n8n/document-processing/callback`,
      callbackPayload,
      { headers: { 'X-ProofNest-Webhook-Secret': testSecret } }
    );
    assert(callbackRes.status === 200 && callbackRes.data.success === true, 'Callback authenticated and processed');

    // Poll status from frontend perspective
    const pollRes = await axios.get(
      `${baseUrl}/api/integrations/n8n/jobs/${jobId}`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert(
      pollRes.data.data.status === 'completed' &&
      pollRes.data.data.result.extractedData.productName === 'MacBook Pro 16-inch M3 Max',
      'Frontend poll returns completed job with extracted fields'
    );

    // Confirm OCR result
    const confirmRes = await axios.post(
      `${baseUrl}/api/integrations/n8n/confirm-ocr`,
      {
        jobId,
        confirmedProductData: pollRes.data.data.result.extractedData
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert(confirmRes.status === 200 && confirmRes.data.success === true, 'Product confirmed and saved upon user confirmation');

    const confirmedProduct = confirmRes.data.data.product;
    assert(
      confirmedProduct.productName === 'MacBook Pro 16-inch M3 Max' &&
      confirmedProduct.purchasePrice === 2499,
      'Product persisted with confirmed details in MongoDB Atlas'
    );

    console.log('\n===================================================================');
    console.log(`  Verification Suite Complete: ${passed} Passed, ${failed} Failed`);
    console.log('===================================================================\n');

  } catch (err) {
    console.error('Test encountered an error:', err.response?.data || err.message);
    failed++;
  } finally {
    if (testUser) {
      await ProcessingJob.deleteMany({ userId: testUser._id });
      await Document.deleteMany({ userId: testUser._id });
      await Product.deleteMany({ userId: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    if (server) {
      await new Promise(r => server.close(r));
    }
    if (mockN8nServer) {
      await new Promise(r => mockN8nServer.close(r));
    }
    await disconnectDB();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runInvoiceOcrUploadIntegrationTests();
