const { User, RefreshToken } = require('../models');
const {
  generateAccessToken,
  generateRefreshTokenString,
  generateTokenFamily,
  hashToken
} = require('../utils/tokenUtils');

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class AuthService {
  async register({ name, email, password }) {
    if (!name || !email || !password) {
      const err = new Error('Name, email, and password are required.');
      err.status = 400;
      throw err;
    }

    if (password.length < 6) {
      const err = new Error('Password must be at least 6 characters long.');
      err.status = 400;
      throw err;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      const err = new Error('An account with this email address already exists.');
      err.status = 409;
      throw err;
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    const accessToken = generateAccessToken(user);
    const refreshTokenString = generateRefreshTokenString();
    const tokenFamily = generateTokenFamily();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshTokenString),
      tokenFamily,
      expiresAt
    });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken: refreshTokenString
    };
  }

  async login({ email, password }) {
    if (!email || !password) {
      const err = new Error('Email and password are required.');
      err.status = 400;
      throw err;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    const accessToken = generateAccessToken(user);
    const refreshTokenString = generateRefreshTokenString();
    const tokenFamily = generateTokenFamily();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshTokenString),
      tokenFamily,
      expiresAt
    });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken: refreshTokenString
    };
  }

  async refresh({ rawRefreshToken }) {
    if (!rawRefreshToken) {
      const err = new Error('No refresh token provided.');
      err.status = 401;
      throw err;
    }

    const tokenHash = hashToken(rawRefreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });

    if (!tokenDoc) {
      const err = new Error('Invalid refresh token.');
      err.status = 401;
      throw err;
    }

    // Reuse detection: Token has already been revoked!
    if (tokenDoc.revokedAt) {
      // Invalidate the ENTIRE token family because a compromised token was reused
      await RefreshToken.updateMany(
        { tokenFamily: tokenDoc.tokenFamily, revokedAt: null },
        { revokedAt: new Date() }
      );
      const err = new Error('Compromised token reuse detected. All sessions in this family have been revoked.');
      err.status = 403;
      err.code = 'REFRESH_TOKEN_REUSE';
      throw err;
    }

    // Check expiration
    if (new Date() > tokenDoc.expiresAt) {
      tokenDoc.revokedAt = new Date();
      await tokenDoc.save();
      const err = new Error('Refresh token has expired.');
      err.status = 401;
      err.code = 'REFRESH_TOKEN_EXPIRED';
      throw err;
    }

    // Token is valid! Rotate token:
    tokenDoc.revokedAt = new Date();
    await tokenDoc.save();

    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      const err = new Error('User no longer exists.');
      err.status = 401;
      throw err;
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshTokenString = generateRefreshTokenString();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // Keep the same tokenFamily for rotation continuity
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(newRefreshTokenString),
      tokenFamily: tokenDoc.tokenFamily,
      expiresAt
    });

    return {
      user: user.toJSON(),
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenString
    };
  }

  async logout({ rawRefreshToken }) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await RefreshToken.updateOne(
        { tokenHash, revokedAt: null },
        { revokedAt: new Date() }
      );
    }
    return { success: true };
  }

  async logoutAll({ userId }) {
    await RefreshToken.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() }
    );
    return { success: true };
  }
}

module.exports = new AuthService();
