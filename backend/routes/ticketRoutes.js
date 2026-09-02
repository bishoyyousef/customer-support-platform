import express from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  postMessage,
  postNote,
  getSuggestions
} from '../controllers/ticketController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getTickets);
router.post('/', authenticate, createTicket);
router.get('/suggestions', authenticate, getSuggestions);
router.get('/:id', authenticate, getTicketById);
router.patch('/:id', authenticate, updateTicket);
router.post('/:id/messages', authenticate, postMessage);
router.post('/:id/notes', authenticate, postNote);

export default router;
