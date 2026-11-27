const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { loadEnv } = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const healthRoutes = require("./routes/healthRoutes");

const createApp = (config = loadEnv()) => {
  const app = express();
  app.locals.environment = config.NODE_ENV;

  app.use(helmet());
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        callback(null, !requestOrigin || requestOrigin === config.FRONTEND_URL);
      },
      credentials: true,
    })
  );
  app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  app.use("/api", healthRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
