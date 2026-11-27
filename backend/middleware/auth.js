const User = require("../models/User");
const AppError = require("../utils/AppError");
const toSafeUser = require("../utils/safeUser");

const unauthenticated = () =>
  new AppError("Authentication is required", 401, "UNAUTHENTICATED");

const sessionUnavailable = () =>
  new AppError(
    "Session service is temporarily unavailable",
    503,
    "SESSION_STORE_ERROR"
  );

const createRequireAuth = (UserModel = User) => async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return next(unauthenticated());
  }

  let user;
  try {
    user = await UserModel.findById(req.session.userId);
  } catch {
    return next(
      new AppError(
        "Authentication service is temporarily unavailable",
        503,
        "AUTHENTICATION_UNAVAILABLE"
      )
    );
  }

  if (!user) {
    req.session.destroy((error) => {
      if (error) {
        next(sessionUnavailable());
        return;
      }
      next(unauthenticated());
    });
    return;
  }

  req.user = toSafeUser(user);
  return next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(unauthenticated());
  }
  if (!roles.includes(req.user.role)) {
    return next(new AppError("You are not authorized", 403, "FORBIDDEN"));
  }
  return next();
};

module.exports = {
  createRequireAuth,
  requireAuth: createRequireAuth(),
  requireRole,
};
