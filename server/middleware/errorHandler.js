import { logger } from '../utils/logger.js';
import ApiError from '../utils/apiError.js';

/**
 * Global error handling middleware.
 * Catches all errors thrown in routes/controllers and sends a consistent response.
 */
const errorHandler = (err, req, res, _next) => {
  // Default to 500 if no status code set
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `A user with this ${field} already exists.`;
    errors = [{ field, message }];
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Log the error
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn(`${statusCode} - ${message} - ${req.originalUrl}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Catch 404 routes that don't match any defined route.
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
};

export { errorHandler, notFound };
