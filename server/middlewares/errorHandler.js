const AppError = require('../utils/AppError');

// handle mongoose cast errors (bad ObjectId etc)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// handle mongoose validation errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// handle duplicate key errors
const handleDuplicateFieldsDB = (err) => {
  const match = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/) : null;
  const value = match ? match[0] : 'unknown';
  return new AppError(`Duplicate field value: ${value}`, 400);
};

// dev mode: send full error details for debugging
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// prod mode: only send safe messages to the client
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // unexpected error — don't leak details
    console.error('ERROR:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

// main error handler middleware (express knows it's an error handler
// because of the 4 params)
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = Object.create(err);
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);

    sendErrorProd(error, res);
  }
};

// catch-all for routes that don't exist
const notFound = (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
};

module.exports = { globalErrorHandler, notFound };
