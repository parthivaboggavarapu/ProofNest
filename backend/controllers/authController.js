const User = require("../models/User");
const AppError = require("../utils/AppError");
const toSafeUser = require("../utils/safeUser");

const authenticationUnavailable = () =>
  new AppError(
    "Authentication service is temporarily unavailable",
    503,
    "AUTHENTICATION_UNAVAILABLE"
  );

const sessionUnavailable = () =>
  new AppError(
    "Session service is temporarily unavailable",
    503,
    "SESSION_STORE_ERROR"
  );

const sessionOperation = (session, method) =>
  new Promise((resolve, reject) => {
    session[method]((error) => (error ? reject(error) : resolve()));
  });

const createAuthController = (UserModel = User) => ({
  register: async (req, res) => {
    const { name, email, password } = req.validatedBody;
    let user;

    try {
      user = await UserModel.create({ name, email, password });
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(
          "An account with this email already exists",
          409,
          "EMAIL_ALREADY_EXISTS"
        );
      }
      if (error.name === "ValidationError") {
        throw error;
      }
      throw authenticationUnavailable();
    }

    res.status(201).json({ success: true, data: { user: toSafeUser(user) } });
  },

  login: async (req, res) => {
    const { email, password } = req.validatedBody;
    let user;

    try {
      user = await UserModel.findOne({ email }).select("+password");
    } catch {
      throw authenticationUnavailable();
    }

    let passwordMatches = false;
    if (user) {
      try {
        passwordMatches = await user.comparePassword(password);
      } catch {
        throw authenticationUnavailable();
      }
    }
    if (!user || !passwordMatches) {
      throw new AppError(
        "Email or password is incorrect",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    try {
      await sessionOperation(req.session, "regenerate");
      req.session.userId = user._id.toString();
      await sessionOperation(req.session, "save");
    } catch {
      throw sessionUnavailable();
    }

    res.status(200).json({ success: true, data: { user: toSafeUser(user) } });
  },

  logout: async (req, res) => {
    try {
      await sessionOperation(req.session, "destroy");
    } catch {
      throw sessionUnavailable();
    }

    const cookieOptions = { ...req.app.locals.sessionCookieOptions };
    res.clearCookie(req.app.locals.sessionCookieName, cookieOptions);
    res.status(200).json({
      success: true,
      data: { message: "Logged out successfully" },
    });
  },

  me: (req, res) => {
    res.status(200).json({ success: true, data: { user: req.user } });
  },
});

module.exports = { createAuthController };
