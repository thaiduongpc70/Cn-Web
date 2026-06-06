module.exports = function notFoundMiddleware(req, res) {
  res.status(404).json({ message: 'Không tìm thấy tài nguyên.' });
};
