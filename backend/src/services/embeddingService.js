/**
 * Local & Modular Embedding Service for ProofNest
 * Supports local execution via Transformers.js (`sentence-transformers/all-MiniLM-L6-v2`)
 * Produces 384-dimensional normalized numerical vectors.
 */

class EmbeddingService {
  constructor() {
    this.provider = process.env.EMBEDDING_PROVIDER || 'local';
    this.modelName = process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
    this.pipeline = null;
    this.loadingPromise = null;
    this.dimension = 384;
  }

  /**
   * Loads the pipeline once and caches it across requests.
   * Uses `@huggingface/transformers` Node.js pipeline.
   */
  async getPipeline() {
    if (this.pipeline) {
      return this.pipeline;
    }

    if (!this.loadingPromise) {
      this.loadingPromise = (async () => {
        try {
          const { pipeline } = await import('@huggingface/transformers');
          
          // Use Xenova/all-MiniLM-L6-v2 or sentence-transformers/all-MiniLM-L6-v2 ONNX format
          const modelId = this.modelName.includes('/') 
            ? (this.modelName.startsWith('sentence-transformers/') ? `Xenova/${this.modelName.replace('sentence-transformers/', '')}` : this.modelName)
            : `Xenova/${this.modelName}`;

          const pipe = await pipeline('feature-extraction', modelId, {
            dtype: 'fp32'
          });
          this.pipeline = pipe;
          return pipe;
        } catch (err) {
          this.loadingPromise = null;
          throw new Error(`Failed to load local embedding model (${this.modelName}): ${err.message}`);
        }
      })();
    }

    return this.loadingPromise;
  }

  /**
   * Generates a 384-dimensional normalized embedding for a single text string or array of strings.
   * @param {string|string[]} input - Text chunk or array of text chunks
   * @returns {Promise<number[]|number[][]>} Normalized embedding vector(s)
   */
  async generateEmbedding(input) {
    if (!input) {
      return [];
    }

    const isArray = Array.isArray(input);
    const texts = isArray ? input : [input];

    // Filter or handle empty inputs gracefully
    const validTexts = texts.map((t) => (typeof t === 'string' ? t.trim() : ''));
    if (validTexts.length === 0 || validTexts.every((t) => t.length === 0)) {
      return isArray ? [] : [];
    }

    const pipe = await this.getPipeline();

    const results = [];
    for (const text of validTexts) {
      if (!text) {
        results.push(new Array(this.dimension).fill(0));
        continue;
      }

      // feature extraction with mean pooling and L2 normalization
      const output = await pipe(text, {
        pooling: 'mean',
        normalize: true
      });

      // output.data is Float32Array of 384 numbers
      const vector = Array.from(output.data);
      results.push(vector);
    }

    return isArray ? results : results[0];
  }

  /**
   * Helper to inspect model dimension
   */
  getDimensions() {
    return this.dimension;
  }
}

module.exports = new EmbeddingService();
