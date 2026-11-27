const path = require("path");
const dotenv = require("dotenv");

const loadEnv = () => {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  dotenv.config();

  return validateEnv(process.env);
};

const validateEnv = (source) => {
  const errors = [];
  const required = [
    "NODE_ENV",
    "PORT",
    "MONGO_URI",
    "FRONTEND_URL",
    "SESSION_SECRET",
  ];

  for (const name of required) {
    if (typeof source[name] !== "string" || source[name].trim() === "") {
      errors.push({ field: name, message: `${name} is required` });
    }
  }

  const nodeEnv = source.NODE_ENV && source.NODE_ENV.trim();
  if (nodeEnv && !["development", "test", "production"].includes(nodeEnv)) {
    errors.push({
      field: "NODE_ENV",
      message: "NODE_ENV must be development, test, or production",
    });
  }

  const port = Number(source.PORT);
  if (
    source.PORT &&
    (!Number.isInteger(port) || port < 1 || port > 65535)
  ) {
    errors.push({
      field: "PORT",
      message: "PORT must be an integer between 1 and 65535",
    });
  }

  const mongoUri = source.MONGO_URI && source.MONGO_URI.trim();
  if (
    mongoUri &&
    !/^mongodb(?:\+srv)?:\/\/\S+$/i.test(mongoUri)
  ) {
    errors.push({
      field: "MONGO_URI",
      message: "MONGO_URI must be a MongoDB connection URI",
    });
  }

  const sessionSecret = source.SESSION_SECRET;
  if (
    typeof sessionSecret === "string" &&
    sessionSecret.trim() !== "" &&
    sessionSecret.length < 32
  ) {
    errors.push({
      field: "SESSION_SECRET",
      message: "SESSION_SECRET must be at least 32 characters long",
    });
  }

  const trustProxyValue = source.TRUST_PROXY;
  let trustProxy = 0;
  if (trustProxyValue !== undefined && trustProxyValue !== null) {
    if (typeof trustProxyValue !== "string") {
      errors.push({
        field: "TRUST_PROXY",
        message: "TRUST_PROXY must be a hop count between 0 and 10",
      });
    } else if (trustProxyValue.trim() !== "") {
      if (!/^(0|[1-9]\d*)$/.test(trustProxyValue.trim())) {
        errors.push({
          field: "TRUST_PROXY",
          message: "TRUST_PROXY must be a hop count between 0 and 10",
        });
      } else {
        trustProxy = Number(trustProxyValue.trim());
        if (trustProxy > 10) {
          errors.push({
            field: "TRUST_PROXY",
            message: "TRUST_PROXY must be a hop count between 0 and 10",
          });
        }
      }
    }
  }

  const frontendUrl = source.FRONTEND_URL && source.FRONTEND_URL.trim();
  if (frontendUrl) {
    try {
      const parsedUrl = new URL(frontendUrl);
      const isHttp = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
      const hasOnlyOrigin =
        (parsedUrl.pathname === "/" || parsedUrl.pathname === "") &&
        parsedUrl.search === "" &&
        parsedUrl.hash === "";
      if (!isHttp || !hasOnlyOrigin) {
        errors.push({
          field: "FRONTEND_URL",
          message: "FRONTEND_URL must be an HTTP(S) origin without a path",
        });
      }
    } catch {
      errors.push({
        field: "FRONTEND_URL",
        message: "FRONTEND_URL must be a valid HTTP(S) origin",
      });
    }
  }

  if (errors.length > 0) {
    const error = new Error(
      `Invalid environment configuration: ${errors
        .map((item) => item.message)
        .join("; ")}`
    );
    error.name = "EnvironmentValidationError";
    error.details = errors;
    throw error;
  }

  return Object.freeze({
    NODE_ENV: nodeEnv,
    PORT: port,
    MONGO_URI: mongoUri,
    FRONTEND_URL: new URL(frontendUrl).origin,
    SESSION_SECRET: sessionSecret,
    TRUST_PROXY: trustProxy,
  });
};

module.exports = { loadEnv, validateEnv };
