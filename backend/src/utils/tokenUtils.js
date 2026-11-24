const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || 'proofnest_default_access_secret_dev_only';
const getAccessExpiresIn = () => process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';

const generateAccessToken = (user) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name
  };
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: getAccessExpiresIn()
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getAccessSecret());
};

const generateRefreshTokenString = () => {
  return crypto.randomBytes(40).toString('hex');
};

const generateTokenFamily = () => {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const getRefreshTokenCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth'
  };
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshTokenString,
  generateTokenFamily,
  hashToken,
  getRefreshTokenCookieOptions
};
