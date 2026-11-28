const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const embeddingService = require('../src/services/embeddingService');
const DocumentChunk = require('../src/models/DocumentChunk');
const mongoose = require('mongoose');

async function runEmbeddingTests() {
  console.log('\n===================================================================');
  console.log('  ProofNest: Local Embedding & Vector Dimension Tests');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Service Configuration & Defaults
  test('EmbeddingService has expected dimension (384)', () => {
    assert.strictEqual(embeddingService.getDimensions(), 384);
    assert.strictEqual(embeddingService.dimension, 384);
  });

  test('EmbeddingService uses local provider configuration', () => {
    assert.strictEqual(embeddingService.provider, 'local');
    assert.ok(embeddingService.modelName.includes('all-MiniLM-L6-v2'));
  });

  // 2. Empty & Invalid Input Handling
  await testAsync('Handles empty, null, or whitespace inputs gracefully', async () => {
    const resNull = await embeddingService.generateEmbedding(null);
    assert.deepStrictEqual(resNull, []);

    const resEmpty = await embeddingService.generateEmbedding('');
    assert.deepStrictEqual(resEmpty, []);

    const resSpaces = await embeddingService.generateEmbedding('    ');
    assert.deepStrictEqual(resSpaces, []);

    const resEmptyArr = await embeddingService.generateEmbedding([]);
    assert.deepStrictEqual(resEmptyArr, []);
  });

  // 3. Mocked Embedding Test (for offline verification)
  test('Mock embedding generator produces valid 384-d normalized vector', () => {
    // Generate a pseudo-vector of 384 dimensions
    const mockVector = new Array(384).fill(0).map((_, i) => Math.sin(i + 1));
    const norm = Math.sqrt(mockVector.reduce((sum, val) => sum + val * val, 0));
    const normalizedMock = mockVector.map(val => val / norm);

    assert.strictEqual(normalizedMock.length, 384, 'Mock vector length must be 384');
    const calculatedNorm = Math.sqrt(normalizedMock.reduce((sum, val) => sum + val * val, 0));
    assert.ok(Math.abs(calculatedNorm - 1.0) < 0.0001, 'Mock vector must be L2-normalized');
  });

  // 4. Real Local Model Execution (sentence-transformers/all-MiniLM-L6-v2)
  await testAsync('Real local model generates 384-dimensional normalized embedding', async () => {
    const sampleText = 'Invoice for Dell XPS 15 laptop purchased at Best Buy for $1899';
    const startTime = Date.now();
    const embedding = await embeddingService.generateEmbedding(sampleText);
    const duration = Date.now() - startTime;

    assert.ok(Array.isArray(embedding), 'Embedding must be an array');
    assert.strictEqual(embedding.length, 384, `Expected 384 dimensions, got ${embedding.length}`);

    // Verify all items are valid numbers (no NaN or Infinity)
    for (let i = 0; i < embedding.length; i++) {
      assert.strictEqual(typeof embedding[i], 'number', `Element at index ${i} must be a number`);
      assert.ok(!Number.isNaN(embedding[i]), `Element at index ${i} must not be NaN`);
    }

    // Verify L2 normalization (cosine similarity ready)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    assert.ok(
      Math.abs(norm - 1.0) < 0.01,
      `Vector should be normalized (L2 norm ~ 1.0, got ${norm.toFixed(4)})`
    );

    console.log(`         -> Generated 384-d embedding in ${duration}ms (L2 norm: ${norm.toFixed(4)})`);
  });

  // 5. Model Caching / Singleton Verification
  await testAsync('Pipeline is cached as singleton and reused across calls', async () => {
    const pipe1 = await embeddingService.getPipeline();
    const pipe2 = await embeddingService.getPipeline();
    assert.strictEqual(pipe1, pipe2, 'Subsequent getPipeline calls must return identical cached instance');
  });

  // 6. Batch Generation for Text Chunks
  await testAsync('Generates batch embeddings for multiple text chunks', async () => {
    const chunks = [
      'Document chunk 1: Apple MacBook Pro 16 inch M3 Max receipt.',
      'Document chunk 2: Warranty valid until November 2027 with AppleCare+ coverage.'
    ];

    const results = await embeddingService.generateEmbedding(chunks);

    assert.ok(Array.isArray(results), 'Batch output must be an array');
    assert.strictEqual(results.length, 2, 'Batch output must match input length');
    assert.strictEqual(results[0].length, 384, 'Chunk 1 embedding must be 384 dimensions');
    assert.strictEqual(results[1].length, 384, 'Chunk 2 embedding must be 384 dimensions');

    // Verify chunks produce distinct vectors
    const areDistinct = results[0].some((val, i) => Math.abs(val - results[1][i]) > 0.001);
    assert.ok(areDistinct, 'Different texts should produce distinct embeddings');
  });

  // 7. DocumentChunk Schema Compatibility & Vector Search Configuration
  test('DocumentChunk schema validates 384-dimensional embedding', () => {
    const fakeEmbedding = new Array(384).fill(0.05);
    const chunkDoc = new DocumentChunk({
      userId: new mongoose.Types.ObjectId(),
      productId: new mongoose.Types.ObjectId(),
      documentId: new mongoose.Types.ObjectId(),
      chunkText: 'Test warranty terms chunk for vector search indexing.',
      chunkIndex: 0,
      embedding: fakeEmbedding
    });

    const validationError = chunkDoc.validateSync();
    assert.strictEqual(validationError, undefined, 'DocumentChunk schema must validate with 384-d embedding');
    assert.strictEqual(chunkDoc.embedding.length, 384);
  });

  test('DocumentChunk Atlas Vector Search index definition specifies 384 dimensions and cosine similarity', () => {
    const indexDef = DocumentChunk.VECTOR_INDEX_DEFINITION;
    assert.ok(indexDef, 'VECTOR_INDEX_DEFINITION must be present on DocumentChunk');
    assert.strictEqual(indexDef.name, 'vector_index');
    assert.strictEqual(indexDef.type, 'vectorSearch');

    const vectorField = indexDef.definition.fields.find(f => f.type === 'vector');
    assert.ok(vectorField, 'Vector field must exist in index definition');
    assert.strictEqual(vectorField.path, 'embedding');
    assert.strictEqual(vectorField.numDimensions, 384);
    assert.strictEqual(vectorField.similarity, 'cosine');

    const filterFields = indexDef.definition.fields.filter(f => f.type === 'filter');
    const filterPaths = filterFields.map(f => f.path);
    assert.ok(filterPaths.includes('userId'), 'Filter must include userId for multi-tenant isolation');
    assert.ok(filterPaths.includes('productId'), 'Filter must include productId');
  });

  console.log('\n===================================================================');
  console.log(`  Embedding Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log('===================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runEmbeddingTests().catch(err => {
    console.error('Fatal embedding test error:', err);
    process.exit(1);
  });
}

module.exports = runEmbeddingTests;
