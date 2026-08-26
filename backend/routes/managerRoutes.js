const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, managerController.getManagerSummary);

module.exports = router;
