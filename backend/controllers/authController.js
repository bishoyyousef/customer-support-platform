import userRepository from '../repositories/userRepository.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await userRepository.findByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = `mock-jwt-token-for-${user.username}`;
    const userResponse = { ...user };
    delete userResponse.password;
    delete userResponse._id;

    return res.status(200).json({
      token,
      user: userResponse
    });
  } catch (err) {
    next(err);
  }
}
