export function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled server error:', err);
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy blocked this request' });
  }

  const message = process.env.NODE_ENV === 'production' 
    ? (err.status < 500 ? err.message : 'Internal server error')
    : err.message || 'Internal server error';

  res.status(err.status || 500).json({ message });
}
