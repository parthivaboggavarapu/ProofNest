const AppError = require("../utils/AppError");

const getValidationDetails = (error) =>
  Object.entries(error.errors || {}).map(([field, detail]) => ({
    field,
    message: detail.message,
  }));

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const environment = req.app.locals.environment || process.env.NODE_ENV;
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message =
    environment === "production" ? "Internal server error" : error.message;
  let details = [];

  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Request body contains invalid JSON";
  } else if (error.name === "ValidationError") {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = getValidationDetails(error);
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : error.code;
    message =
      environment === "production" && statusCode >= 500
        ? "Internal server error"
        : error.message;
    details = statusCode >= 500 ? [] : error.details;
  } else if (
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 500
  ) {
    statusCode = error.status;
    code = error.status === 413 ? "PAYLOAD_TOO_LARGE" : "REQUEST_ERROR";
    message =
      environment === "production"
        ? error.status === 413
          ? "Request payload is too large"
          : "Request could not be processed"
        : error.message;
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message, details },
  });
};

module.exports = errorHandler;
