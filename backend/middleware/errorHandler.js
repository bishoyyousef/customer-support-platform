export function errorHandler(err, req, res, next) {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
}
