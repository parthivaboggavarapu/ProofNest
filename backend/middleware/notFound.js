const AppError = require("../utils/AppError");

const notFound = (req, res, next) => {
  next(
    new AppError(
      `Route ${req.method} ${req.originalUrl} was not found`,
      404,
      "NOT_FOUND"
    )
  );
};

module.exports = notFound;
