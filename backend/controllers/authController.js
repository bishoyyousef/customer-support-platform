import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import userRepository from '../repositories/userRepository.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await userRepository.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured in the environment variables');
    }

    const token = jwt.sign(
      { username: user.username, role: user.role },
      secret,
      { expiresIn: '8h' }
    );

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
