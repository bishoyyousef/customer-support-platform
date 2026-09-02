import express from 'express';
import { getManagerSummary } from '../controllers/managerController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.get('/summary', authenticate, getManagerSummary);

export default router;
