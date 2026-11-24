const crypto = require('crypto');

/**
 * Layer 1: Static Header Auth verification for n8n-to-Express requests.
 * Reads X-ProofNest-Webhook-Secret header and performs constant-time comparison.
 */
const verifyN8nWebhookSecret = (req, res, next) => {
  const configuredSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!configuredSecret) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: N8N_WEBHOOK_SECRET is not configured'
    });
  }

  const providedSecret =
    req.headers['x-proofnest-webhook-secret'] ||
    req.headers['x-proofnest-webhook-secret'.toLowerCase()];

  if (!providedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing required webhook secret header'
    });
  }

  const configuredBuffer = Buffer.from(String(configuredSecret), 'utf8');
  const providedBuffer = Buffer.from(String(providedSecret), 'utf8');

  if (
    configuredBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(configuredBuffer, providedBuffer)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid webhook secret'
    });
  }

  return next();
};

/**
 * Layer 2: Optional HMAC-SHA256 request signing verification with timestamps & replay protection.
 * Used for high-security callbacks and webhook dispatches.
 * Headers:
 * - X-ProofNest-Signature: Hex digest of HMAC-SHA256(timestamp + "." + rawBody, secret)
 * - X-ProofNest-Timestamp: Epoch milliseconds (must be within tolerance, default 5 mins)
 */
const verifyN8nHmacSignature = (req, res, next) => {
  const secret = process.env.N8N_HMAC_SECRET || process.env.N8N_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: Webhook HMAC secret is not configured'
    });
  }

  const signature = req.headers['x-proofnest-signature'];
  const timestamp = req.headers['x-proofnest-timestamp'];

  if (!signature || !timestamp) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing HMAC signature or timestamp headers'
    });
  }

  // Replay protection: check timestamp tolerance (5 minutes)
  const now = Date.now();
  const reqTime = parseInt(timestamp, 10);
  const TOLERANCE_MS = 5 * 60 * 1000;

  if (isNaN(reqTime) || Math.abs(now - reqTime) > TOLERANCE_MS) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Request timestamp expired or outside acceptable window'
    });
  }

  const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
  const payloadToSign = `${timestamp}.${rawBody}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid HMAC signature'
    });
  }

  return next();
};

/**
 * Helper to generate HMAC-SHA256 signed headers for outgoing calls from Express to n8n
 */
const generateHmacHeaders = (payload, secret) => {
  const timestamp = Date.now().toString();
  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  const payloadToSign = `${timestamp}.${rawBody}`;
  const signature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

  return {
    'X-ProofNest-Signature': signature,
    'X-ProofNest-Timestamp': timestamp
  };
};

/**
 * Short-lived token generator for n8n workers to retrieve uploaded documents
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

  const hmacBuf = Buffer.from(hmac, 'utf8');
  const expectedHmacBuf = Buffer.from(expectedHmac, 'utf8');

  return (
    hmacBuf.length === expectedHmacBuf.length &&
    crypto.timingSafeEqual(hmacBuf, expectedHmacBuf)
  );
};

module.exports = {
  verifyN8nWebhookSecret,
  verifyN8nHmacSignature,
  generateHmacHeaders,
  generateDocumentAccessToken,
  verifyDocumentAccessToken
};
