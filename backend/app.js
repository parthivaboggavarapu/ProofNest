
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const { loadEnv } = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const AppError = require("./utils/AppError");
const { createSessionStore } = require("./config/sessionStore");
const createAuthRoutes = require("./routes/authRoutes");
const {
  createCsrfOriginGuard,
  isTrustedOrigin,
} = require("./middleware/csrfOrigin");
const healthRoutes = require("./routes/healthRoutes");

const SESSION_COOKIE_NAME = "proofnest.sid";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

const createApp = (config = loadEnv(), dependencies = {}) => {
  const app = express();

  app.set(
    "trust proxy",
    config.TRUST_PROXY === undefined ? 0 : config.TRUST_PROXY
  );

  app.locals.environment = config.NODE_ENV;
  app.locals.sessionCookieName = SESSION_COOKIE_NAME;
  app.locals.sessionCookieOptions = {
    httpOnly: true,
    sameSite: config.NODE_ENV === "production" ? "none" : "lax",
    secure: config.NODE_ENV === "production",
    path: "/",
  };

  app.use(helmet());

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        callback(
          null,
          !requestOrigin || isTrustedOrigin(requestOrigin, config.FRONTEND_URL)
        );
      },
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  app.use(createCsrfOriginGuard(config.FRONTEND_URL, SESSION_COOKIE_NAME));
  app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  const sessionStoreFactory =
    dependencies.sessionStoreFactory || createSessionStore;

  const store = sessionStoreFactory({ ttl: SESSION_TTL_SECONDS });

  const sessionMiddleware = session({
    name: SESSION_COOKIE_NAME,
    secret: config.SESSION_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      ...app.locals.sessionCookieOptions,
      maxAge: SESSION_TTL_MS,
    },
  });

  app.use((req, res, next) => {
    sessionMiddleware(req, res, (error) => {
      if (error) {
        next(
          new AppError(
            "Session service is temporarily unavailable",
            503,
            "SESSION_STORE_ERROR"
          )
        );
        return;
      }

      next();
    });
  });

  app.use("/api", healthRoutes);

  app.use(
    "/api/auth",
    createAuthRoutes({ UserModel: dependencies.UserModel })
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
