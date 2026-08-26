const userRepository = require('../repositories/userRepository');

async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
    }

    let username = token;
    if (token.startsWith('mock-jwt-token-for-')) {
      username = token.replace('mock-jwt-token-for-', '');
    }

    const user = await userRepository.findByUsername(username);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Session invalid' });
    }

    // Strip password from req.user context
    const safeUser = { ...user };
    delete safeUser.password;

    req.user = safeUser;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
