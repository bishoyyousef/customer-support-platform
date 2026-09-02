import express from 'express';
import userRepository from '../repositories/userRepository.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/me/search-history', authenticate, async (req, res, next) => {
  try {
    const history = await userRepository.getSearchHistory(req.user.id);
    return res.status(200).json(history);
  } catch (err) {
    next(err);
  }
});

router.post('/me/search-history', authenticate, async (req, res, next) => {
  try {
    const { query } = req.body;
    const history = await userRepository.addSearchHistory(req.user.id, query);
    return res.status(200).json(history);
  } catch (err) {
    next(err);
  }
});

router.delete('/me/search-history', authenticate, async (req, res, next) => {
  try {
    const queryToRemove = req.query.query;
    let history = [];
    if (queryToRemove) {
      history = await userRepository.removeSearchHistory(req.user.id, queryToRemove);
    } else {
      history = await userRepository.clearSearchHistory(req.user.id);
    }
    return res.status(200).json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
