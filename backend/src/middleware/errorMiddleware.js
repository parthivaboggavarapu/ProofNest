const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error.';

  if (process.env.NODE_ENV !== 'production' && status === 500) {
    console.error('[Error Middleware]:', err);
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `Duplicate value entered for ${field}. Please use another value.`
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      error: messages.join('. ')
    });
  }

  res.status(status).json({
    success: false,
    error: message,
    code: err.code || undefined
  });
};

module.exports = { errorHandler };
