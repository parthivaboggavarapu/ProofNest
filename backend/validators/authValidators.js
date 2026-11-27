const AppError = require("../utils/AppError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD_BYTES = 72;

const invalidFields = (fields) =>
  new AppError("Request validation failed", 422, "VALIDATION_ERROR", fields);

const getObjectBody = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw invalidFields([{ field: "body", message: "A JSON object is required" }]);
  }
  return body;
};

const validateRegistration = (req, res, next) => {
  try {
    const body = getObjectBody(req.body);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const errors = [];

    if (name.length < 2 || name.length > 100) {
      errors.push({
        field: "name",
        message: "Name must be between 2 and 100 characters",
      });
    }
    if (email.length > 254 || !EMAIL_REGEX.test(email)) {
      errors.push({ field: "email", message: "A valid email address is required" });
    }
    if (
      password.length < 6 ||
      Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
    ) {
      errors.push({
        field: "password",
        message: "Password must be at least 6 characters and at most 72 UTF-8 bytes",
      });
    }
    if (errors.length > 0) {
      throw invalidFields(errors);
    }

    req.validatedBody = { name, email, password };
    next();
  } catch (error) {
    next(error);
  }
};

const validateLogin = (req, res, next) => {
  try {
    const body = getObjectBody(req.body);
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const errors = [];

    if (email.length > 254 || !EMAIL_REGEX.test(email)) {
      errors.push({ field: "email", message: "A valid email address is required" });
    }
    if (
      password.length === 0 ||
      Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
    ) {
      errors.push({
        field: "password",
        message: "Password is required and must be at most 72 UTF-8 bytes",
      });
    }
    if (errors.length > 0) {
      throw invalidFields(errors);
    }

    req.validatedBody = { email, password };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateRegistration, validateLogin };
