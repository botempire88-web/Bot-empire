function errorHandler(err, req, res, next) {
  console.error('Unhandled application error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Internal server error'
  });
}

module.exports = errorHandler;
