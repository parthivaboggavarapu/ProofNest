const authService = require('../services/authService');
const { getRefreshTokenCookieOptions } = require('../utils/tokenUtils');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register({ name, email, password });

      res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const rawRefreshToken = req.cookies.refreshToken;
      const result = await authService.refresh({ rawRefreshToken });

      res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

      res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (error) {
      // Clear invalid cookie on failure
      res.clearCookie('refreshToken', getRefreshTokenCookieOptions());
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const rawRefreshToken = req.cookies.refreshToken;
      await authService.logout({ rawRefreshToken });

      res.clearCookie('refreshToken', getRefreshTokenCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll({ userId: req.user._id });
      res.clearCookie('refreshToken', getRefreshTokenCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices.'
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        user: req.user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
