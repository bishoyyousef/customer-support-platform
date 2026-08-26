const express = require('express');
const router = express.Router();
const userRepository = require('../repositories/userRepository');
const { authenticate } = require('../middleware/auth');

// GET /api/users/me/search-history
router.get('/me/search-history', authenticate, async (req, res, next) => {
  try {
    const history = await userRepository.getSearchHistory(req.user.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/search-history
router.post('/me/search-history', authenticate, async (req, res, next) => {
  try {
    const { query } = req.body;
    const history = await userRepository.addSearchHistory(req.user.id, query);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me/search-history
router.delete('/me/search-history', authenticate, async (req, res, next) => {
  try {
    const { query } = req.query;
    let history;
    if (query) {
      history = await userRepository.removeSearchHistory(req.user.id, query);
    } else {
      history = await userRepository.clearSearchHistory(req.user.id);
    }
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
