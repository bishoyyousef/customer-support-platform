import ticketRepository from '../repositories/ticketRepository.js';
import messageRepository from '../repositories/messageRepository.js';
import userRepository from '../repositories/userRepository.js';
import ticketService from '../services/ticketService.js';
import { broadcastNewMessage, broadcastTicketUpdate, broadcastNewTicket } from '../socket.js';
import { validateTicket } from '../validators/ticketValidator.js';

async function getTickets(req, res, next) {
  try {
    const result = await ticketRepository.findTickets(req.query, req.user);
    const { page, limit, totalItems, totalPages, activeCount, pendingCount, resolvedCount } = result.pagination;

    res.setHeader('X-Pagination-Page', page);
    res.setHeader('X-Pagination-Limit', limit);
    res.setHeader('X-Pagination-Total-Count', totalItems);
    res.setHeader('X-Pagination-Total-Pages', totalPages);
    res.setHeader('X-Pagination-Active-Count', activeCount);
    res.setHeader('X-Pagination-Pending-Count', pendingCount);
    res.setHeader('X-Pagination-Resolved-Count', resolvedCount);

    res.setHeader(
      'Access-Control-Expose-Headers',
      'X-Pagination-Page, X-Pagination-Limit, X-Pagination-Total-Count, X-Pagination-Total-Pages, X-Pagination-Active-Count, X-Pagination-Pending-Count, X-Pagination-Resolved-Count'
    );

    return res.status(200).json(result.data);
  } catch (err) {
    next(err);
  }
}

async function getTicketById(req, res, next) {
  try {
    const ticket = await ticketRepository.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'customer' && ticket.customerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this ticket' });
    }

    const isCustomer = req.user.role === 'customer';
    const messages = await messageRepository.findByTicketId(ticket.id, isCustomer);

    let activityTimeline = ticket.activityTimeline || [];
    if (isCustomer) {
      activityTimeline = activityTimeline.filter(e => e.type !== 'note');
    }

    const responseTicket = { ...ticket, messages, activityTimeline };
    delete responseTicket._id;
    responseTicket.messages.forEach(m => delete m._id);

    return res.status(200).json(responseTicket);
  } catch (err) {
    next(err);
  }
}

async function createTicket(req, res, next) {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Forbidden: Only customers can submit tickets' });
    }

    const { isValid, errors } = validateTicket(req.body);
    if (!isValid) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const result = await ticketService.createTicket(req.user, req.body);
    broadcastNewTicket(result.ticket);

    const responseData = {
      ...result.ticket,
      messages: [result.initialMessage]
    };

    return res.status(201).json(responseData);
  } catch (err) {
    next(err);
  }
}

async function updateTicket(req, res, next) {
  try {
    const ticket = await ticketRepository.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const { isValid, errors } = validateTicket(req.body, true);
    if (!isValid) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Status transitions check
    if (req.body.status !== undefined && req.body.status !== ticket.status) {
      const validTransitions = {
        'requires_attention': ['under_investigation', 'pending_customer', 'resolved'],
        'under_investigation': ['requires_attention', 'pending_customer', 'resolved'],
        'pending_customer': ['requires_attention', 'under_investigation', 'resolved'],
        'resolved': ['requires_attention']
      };

      const allowed = validTransitions[ticket.status] || [];
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
          message: `Cannot transition from '${ticket.status}' to '${req.body.status}'`
        });
      }

      if (req.body.status === 'resolved') {
        const summary = req.body.resolutionSummary || req.body.resolutionText;
        if (!summary || typeof summary !== 'string' || summary.trim().length < 10 || summary.trim().length > 1000) {
          return res.status(400).json({ message: 'Resolution summary of at least 10 characters is required to resolve a ticket.' });
        }
      }
    }

    // Assignments RBAC check
    if (req.body.assignedTo !== undefined) {
      const targetAgentId = req.body.assignedTo;

      if (req.user.role === 'customer') {
        return res.status(403).json({ message: 'Forbidden: Customers cannot assign tickets' });
      }

      if (req.user.role === 'agent') {
        if (targetAgentId !== null && targetAgentId !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: Agents can only assign tickets to themselves' });
        }
      }

      if (targetAgentId) {
        const targetAgent = await userRepository.findById(targetAgentId);
        if (!targetAgent || (targetAgent.role !== 'agent' && targetAgent.role !== 'manager')) {
          return res.status(400).json({ message: 'Invalid assignee ID' });
        }
      }
    }

    const updatedTicket = await ticketService.updateTicket(ticket.id, req.user, req.body);
    if (updatedTicket) {
      broadcastTicketUpdate(updatedTicket);
    }

    return res.status(200).json(updatedTicket);
  } catch (err) {
    next(err);
  }
}

async function postMessage(req, res, next) {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length < 1 || content.trim().length > 1000) {
      return res.status(400).json({ message: 'Message content must be between 1 and 1000 characters.' });
    }

    const ticket = await ticketRepository.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.status === 'resolved' && req.user.role !== 'customer') {
      return res.status(400).json({ message: 'Cannot add messages to a resolved ticket. Reopen it first.' });
    }

    if (req.user.role === 'customer' && ticket.customerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this ticket' });
    }

    const newMessage = await ticketService.addMessage(ticket.id, req.user, content);
    if (newMessage) {
      broadcastNewMessage(ticket.id, newMessage);
      const freshTicket = await ticketRepository.findById(ticket.id);
      if (freshTicket) {
        broadcastTicketUpdate(freshTicket);
      }
    }

    return res.status(200).json(newMessage);
  } catch (err) {
    next(err);
  }
}

async function postNote(req, res, next) {
  try {
    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Forbidden: Customers cannot add internal notes' });
    }

    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length < 1 || content.trim().length > 1000) {
      return res.status(400).json({ message: 'Note content must be between 1 and 1000 characters.' });
    }

    const ticket = await ticketRepository.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.status === 'resolved') {
      return res.status(400).json({ message: 'Cannot add internal notes to a resolved ticket. Reopen it first.' });
    }

    const newNote = await ticketService.addNote(ticket.id, req.user, content);
    if (newNote) {
      broadcastNewMessage(ticket.id, newNote);
    }

    return res.status(200).json(newNote);
  } catch (err) {
    next(err);
  }
}

async function getSuggestions(req, res, next) {
  try {
    const queryText = req.query.q || '';
    const suggestions = await ticketRepository.getSuggestions(queryText, req.user);
    return res.status(200).json(suggestions);
  } catch (err) {
    next(err);
  }
}

export {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  postMessage,
  postNote,
  getSuggestions
};
