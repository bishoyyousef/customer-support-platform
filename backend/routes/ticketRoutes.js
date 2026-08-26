const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ticketController.getTickets);
router.get('/:id', authenticate, ticketController.getTicketById);
router.post('/', authenticate, ticketController.createTicket);
router.patch('/:id', authenticate, ticketController.updateTicket);
router.post('/:id/messages', authenticate, ticketController.postMessage);
router.post('/:id/notes', authenticate, ticketController.postNote);

module.exports = router;
