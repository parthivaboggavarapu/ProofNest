const crypto = require('crypto');

/**
 * Generates an HMAC-SHA256 signature for outgoing payloads to n8n
 * @param {object|string} payload
 * @param {string} secret
 * @returns {string} hex signature
 */
const signPayload = (payload, secret) => {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Middleware to verify incoming callbacks or webhook calls from n8n.
 * Checks X-N8N-Signature or Authorization Bearer header against N8N_WEBHOOK_SECRET.
 */
const verifyN8nSignature = (req, res, next) => {
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!secret) {
    // If not configured in development, log warning and allow if dev mode
    if (process.env.NODE_ENV === 'development') {
      console.warn('[n8n Auth] Warning: N8N_WEBHOOK_SECRET is not configured in .env. Skipping strict verification in development.');
      return next();
    }
    return res.status(500).json({
      success: false,
      message: 'Server security error: N8N_WEBHOOK_SECRET is unconfigured.'
    });
  }

  // Check 1: Shared secret via Bearer or custom header
  const authHeader = req.headers['authorization'];
  const directHeaderSecret = req.headers['x-n8n-secret'];
  
  if (directHeaderSecret === secret) {
    return next();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === secret) {
      return next();
    }
  }

  // Check 2: HMAC signature via X-N8N-Signature
  const signature = req.headers['x-n8n-signature'];
  if (signature) {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    
    // Constant-time comparison
    if (
      signature.length === expectedSig.length &&
      crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSig, 'utf8'))
    ) {
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: Invalid or missing n8n signature/shared secret.'
  });
};

/**
 * Generates a short-lived token for n8n to safely download a specific document
 */
const generateDocumentAccessToken = (documentId, expiresInSeconds = 300) => {
  const secret = process.env.N8N_WEBHOOK_SECRET || 'n8n_default_shared_secret_2026';
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${documentId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${hmac}`;
};

/**
 * Validates the short-lived document access token
 */
const verifyDocumentAccessToken = (documentId, token) => {
  if (!token) return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [tokenDocId, expiresAtStr, hmac] = parts;
  if (tokenDocId !== documentId.toString()) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
    return false; // Expired
  }

  const secret = process.env.N8N_WEBHOOK_SECRET || 'n8n_default_shared_secret_2026';
  const expectedPayload = `${tokenDocId}:${expiresAtStr}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');

  return (
    hmac.length === expectedHmac.length &&
    crypto.timingSafeEqual(Buffer.from(hmac, 'utf8'), Buffer.from(expectedHmac, 'utf8'))
  );
};

module.exports = {
  signPayload,
  verifyN8nSignature,
  generateDocumentAccessToken,
  verifyDocumentAccessToken
};
