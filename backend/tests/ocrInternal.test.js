const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const { User, Document } = require('../src/models');
const documentService = require('../src/services/documentService');
const ocrService = require('../src/services/ocrService');
const ocrController = require('../src/controllers/ocrController');

const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';
const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

function createSamplePdfBuffer(customText = 'Apple MacBook Pro') {
  const safeText = customText.replace(/[()]/g, '');
  const streamContent = 'BT /F1 12 Tf 72 712 Td (' + safeText + ') Tj ET\n';
  const obj5 = '5 0 obj\n<< /Length ' + streamContent.length + ' >>\nstream\n' + streamContent + 'endstream\nendobj\n';

  const header = '%PDF-1.4\n';
  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;
  const offset4 = offset3 + obj3.length;
  const offset5 = offset4 + obj4.length;
  const xrefOffset = offset5 + obj5.length;

  function pad10(n) { return ('0000000000' + n).slice(-10); }

  const xref = 'xref\n0 6\n' +
  '0000000000 65535 f \r\n' +
  pad10(offset1) + ' 00000 n \r\n' +
  pad10(offset2) + ' 00000 n \r\n' +
  pad10(offset3) + ' 00000 n \r\n' +
  pad10(offset4) + ' 00000 n \r\n' +
  pad10(offset5) + ' 00000 n \r\n' +
  'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';

  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + obj5 + xref, 'utf8');
}

// Minimal 1x1 white PNG image buffer
const samplePngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==',
  'base64'
);

async function runOcrTests() {
  console.log('\n===================================================================');
  console.log('  ProofNest: Internal OCR Extraction & Document Tests');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    await connectDB();

    const timestamp = Date.now();
    const testUser = await User.create({
      name: 'OCR Test User',
      email: `ocr_user_${timestamp}@example.com`,
      passwordHash: 'hashed_pw_for_tests'
    });

    const otherUser = await User.create({
      name: 'Other Test User',
      email: `other_ocr_${timestamp}@example.com`,
      passwordHash: 'hashed_pw_for_tests'
    });

    console.log('[1/8] Testing PDF Text Extraction via Internal Engine (pdf-parse)...');
    try {
      const sampleText = 'Apple MacBook Pro';
      const pdfBuffer = createSamplePdfBuffer(sampleText);
      const extracted = await ocrService.extractTextFromFile(pdfBuffer, 'application/pdf');
      assert(extracted && extracted.includes('Apple MacBook Pro'), 'Extracted text must contain embedded PDF string');
      console.log('  [PASS] Successfully extracted embedded text from PDF without external services');
      passed++;
    } catch (err) {
      console.error('  [FAIL] PDF text extraction failed:', err.message);
      failed++;
    }

    console.log('[2/8] Testing Image OCR Engine (Tesseract.js integration)...');
    try {
      // Recognizes image buffer without error
      const extracted = await ocrService.extractTextFromFile(samplePngBuffer, 'image/png');
      assert(typeof extracted === 'string', 'Expected string output from OCR');
      console.log('  [PASS] Image OCR engine executed cleanly for PNG image');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Image OCR error:', err.message);
      failed++;
    }

    console.log('[3/8] Testing Authenticated Invoice Upload to GridFS...');
    let uploadedDoc;
    try {
      const pdfBuffer = createSamplePdfBuffer('Invoice #INV-2026-X Dell XPS 15');
      uploadedDoc = await documentService.uploadDocument({
        userId: testUser._id,
        productId: null,
        documentType: 'Invoice',
        file: {
          originalname: 'dell-invoice.pdf',
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
          buffer: pdfBuffer
        },
        extractedText: ''
      });
      assert(uploadedDoc && uploadedDoc._id, 'Document must be persisted in MongoDB');
      assert(uploadedDoc.gridFsFileId, 'Document must have GridFS file ID');
      console.log('  [PASS] Invoice successfully uploaded and stored in MongoDB GridFS');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Invoice upload failed:', err.message);
      failed++;
    }

    console.log('[4/8] Testing POST /api/ocr/extract with existing documentId...');
    try {
      let responseData = null;
      let statusCode = 200;
      const mockReq = {
        user: { _id: testUser._id },
        body: { documentId: uploadedDoc._id.toString() }
      };
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        json: (data) => {
          responseData = data;
          return mockRes;
        }
      };
      const mockNext = (err) => { throw err; };

      await ocrController.extractText(mockReq, mockRes, mockNext);

      assert(statusCode === 200, `Expected 200 but got ${statusCode}`);
      assert(responseData && responseData.success === true, 'Response must indicate success');
      assert(responseData.rawText && responseData.rawText.includes('Dell XPS 15'), 'Must return raw extracted text');
      console.log('  [PASS] Extracted raw text from GridFS document via /api/ocr/extract');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Extract by documentId failed:', err.message);
      failed++;
    }

    console.log('[5/8] Testing GET /api/ocr/:documentId text retrieval...');
    try {
      let responseData = null;
      let statusCode = 200;
      const mockReq = {
        user: { _id: testUser._id },
        params: { documentId: uploadedDoc._id.toString() }
      };
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        json: (data) => {
          responseData = data;
          return mockRes;
        }
      };
      const mockNext = (err) => { throw err; };

      await ocrController.getOcrByDocumentId(mockReq, mockRes, mockNext);

      assert(statusCode === 200, `Expected 200 but got ${statusCode}`);
      assert(responseData && responseData.rawText.includes('Dell XPS 15'), 'Must return previously extracted text');
      console.log('  [PASS] Successfully retrieved saved OCR text for document owner');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Get OCR by documentId failed:', err.message);
      failed++;
    }

    console.log('[6/8] Testing Document Ownership & Unauthorized Access Rejection...');
    try {
      let statusCode = 200;
      let errorData = null;
      const mockReq = {
        user: { _id: otherUser._id }, // Other user attempting access
        params: { documentId: uploadedDoc._id.toString() }
      };
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        json: (data) => {
          errorData = data;
          return mockRes;
        }
      };
      const mockNext = (err) => { throw err; };

      await ocrController.getOcrByDocumentId(mockReq, mockRes, mockNext);

      assert(statusCode === 404, `Expected 404 for unauthorized document access, got ${statusCode}`);
      console.log('  [PASS] Rejected access from non-owner with 404');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Ownership enforcement failed:', err.message);
      failed++;
    }

    console.log('[7/8] Testing Unsupported File Type Handling...');
    try {
      const unsupportedBuffer = Buffer.from('console.log("hello");');
      const text = await ocrService.extractTextFromFile(unsupportedBuffer, 'application/javascript');
      assert(text === '', 'Unsupported mime types must gracefully yield empty text');
      console.log('  [PASS] Unsupported MIME type safely handled with empty output');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Unsupported file test failed:', err.message);
      failed++;
    }

    console.log('[8/8] Testing Empty / Corrupt File Extraction Handling...');
    try {
      const emptyBuffer = Buffer.alloc(0);
      const text = await ocrService.extractTextFromFile(emptyBuffer, 'application/pdf');
      assert(text === '', 'Empty buffer must return empty string without unhandled crash');
      console.log('  [PASS] Corrupt or empty file handled gracefully');
      passed++;
    } catch (err) {
      console.error('  [FAIL] Empty file test failed:', err.message);
      failed++;
    }

    // Teardown
    await Document.deleteMany({ userId: { $in: [testUser._id, otherUser._id] } });
    await User.deleteMany({ _id: { $in: [testUser._id, otherUser._id] } });

  } catch (outerErr) {
    console.error('Unexpected test error:', outerErr);
  } finally {
    await disconnectDB();
  }

  console.log(`\n===================================================================`);
  console.log(`  OCR Test Suite Complete: ${passed} Passed, ${failed} Failed`);
  console.log(`===================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runOcrTests();
}

module.exports = { runOcrTests };
