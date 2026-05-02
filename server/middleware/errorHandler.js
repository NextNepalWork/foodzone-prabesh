const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
    this.type = 'validation';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.type = 'authentication';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.type = 'authorization';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.type = 'not_found';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500);
    this.type = 'database';
    this.originalError = originalError;
  }
}

// Error handling for different database errors
const handleDatabaseError = (error) => {
  logger.error('Database error:', error);
  
  // PostgreSQL specific error codes
  switch (error.code) {
    case '23505': // Unique violation
      return new ValidationError('Duplicate entry found', error.detail);
    case '23503': // Foreign key violation
      return new ValidationError('Referenced record does not exist');
    case '23502': // Not null violation
      return new ValidationError('Required field is missing', error.column);
    case '22001': // String data too long
      return new ValidationError('Input data is too long');
    case '42P01': // Undefined table
      return new DatabaseError('Database table not found');
    case '42703': // Undefined column
      return new DatabaseError('Database column not found');
    case 'ECONNREFUSED':
      return new DatabaseError('Database connection refused');
    case 'ENOTFOUND':
      return new DatabaseError('Database host not found');
    default:
      return new DatabaseError('Database operation failed', error);
  }
};

// Handle JWT errors
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }
  return new AuthenticationError('Token verification failed');
};

// Handle validation errors
const handleValidationError = (error) => {
  if (error.errors && Array.isArray(error.errors)) {
    const messages = error.errors.map(err => err.msg).join(', ');
    return new ValidationError(messages);
  }
  return new ValidationError(error.message);
};

// Development error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      status: err.status,
      message: err.message,
      type: err.type || 'error',
      stack: err.stack,
      details: err.originalError ? err.originalError.message : undefined
    }
  });
};

// Production error response
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        status: err.status,
        message: err.message,
        type: err.type || 'error'
      }
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unexpected error:', err);
    
    res.status(500).json({
      success: false,
      error: {
        status: 'error',
        message: 'Something went wrong!',
        type: 'internal'
      }
    });
  }
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log error
  logger.error(`${req.method} ${req.path}`, {
    error: err.message,
    stack: err.stack,
    user: req.user ? req.user.id : 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  let error = { ...err };
  error.message = err.message;
  
  // Handle specific error types
  if (err.code && (err.code.startsWith('23') || err.code.startsWith('42') || err.code === 'ECONNREFUSED')) {
    error = handleDatabaseError(err);
  } else if (err.name && err.name.includes('JWT')) {
    error = handleJWTError(err);
  } else if (err.name === 'ValidationError' || (err.errors && Array.isArray(err.errors))) {
    error = handleValidationError(err);
  }
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const err = new NotFoundError(`Route ${req.originalUrl}`);
  next(err);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  globalErrorHandler,
  catchAsync,
  notFoundHandler
};
