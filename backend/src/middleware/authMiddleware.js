const { verifyAccessToken } = require('../utils/tokenUtils');
const { User } = require('../models');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed Authorization header.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Access token expired.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid access token.',
        code: 'TOKEN_INVALID'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User associated with this token no longer exists.'
      });
    }

    // Attach verified user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  requireAuth,
  authenticate: requireAuth 
};
