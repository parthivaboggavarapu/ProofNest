const express = require("express");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { createAuthController } = require("../controllers/authController");
const { createRequireAuth } = require("../middleware/auth");
const {
  validateLogin,
  validateRegistration,
} = require("../validators/authValidators");

const createAuthRoutes = ({ UserModel = User } = {}) => {
  const router = express.Router();
  const controller = createAuthController(UserModel);
  const requireAuth = createRequireAuth(UserModel);
  const createLimiter = (limit) =>
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many authentication attempts. Try again later.",
            details: [],
          },
        });
      },
    });

  router.post(
    "/register",
    createLimiter(5),
    validateRegistration,
    controller.register
  );
  router.post("/login", createLimiter(10), validateLogin, controller.login);
  router.post("/logout", controller.logout);
  router.get("/me", requireAuth, controller.me);

  return router;
};

module.exports = createAuthRoutes;
