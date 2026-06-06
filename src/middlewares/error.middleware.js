module.exports = function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;

  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(statusCode).json({
    message: error.sqlMessage || error.message || 'Có lỗi xảy ra.',
    code: error.code || null
  });
};
