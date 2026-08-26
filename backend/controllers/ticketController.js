const ticketRepository = require('../repositories/ticketRepository');
const messageRepository = require('../repositories/messageRepository');
const userRepository = require('../repositories/userRepository');
const { validateTicket } = require('../validators/ticketValidator');

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

    const responseTicket = { ...ticket, messages };
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

    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const initialMessage = {
      id: `msg_${Date.now()}`,
      ticketId,
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: 'customer',
      content: req.body.description.trim(),
      timestamp: now,
      isInternal: false
    };

    const newTicket = {
      id: ticketId,
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      category: req.body.category,
      urgency: req.body.urgency,
      status: 'requires_attention',
      customerId: req.user.id,
      customerName: req.user.name,
      assignedTo: null,
      assignedName: null,
      createdAt: now,
      updatedAt: now,
      resolutionSummary: null,
      activityTimeline: [
        {
          type: 'creation',
          message: `Ticket created by ${req.user.name}`,
          timestamp: now,
          actorName: req.user.name
        }
      ]
    };

    await ticketRepository.create(newTicket);
    await messageRepository.create(initialMessage);

    const responseData = {
      ...newTicket,
      messages: [initialMessage]
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

    const now = new Date().toISOString();
    const updateFields = { updatedAt: now };
    let timelineEvent = null;

    // Status transitions
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
        updateFields.resolutionSummary = summary.trim();
      }

      updateFields.status = req.body.status;
      timelineEvent = {
        type: 'status_change',
        message: `Status updated from '${ticket.status}' to '${req.body.status}' by ${req.user.name}`,
        timestamp: now,
        actorName: req.user.name
      };
    }

    // Assignments
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

      if (req.body.assignedTo !== ticket.assignedTo) {
        let targetAgentName = null;
        if (targetAgentId) {
          const targetAgent = await userRepository.findById(targetAgentId);
          if (!targetAgent || (targetAgent.role !== 'agent' && targetAgent.role !== 'manager')) {
            return res.status(400).json({ message: 'Invalid assignee ID' });
          }
          targetAgentName = targetAgent.name;
        }

        const prevAgentName = ticket.assignedName || 'Unassigned';
        const newAgentName = targetAgentName || 'Unassigned';

        updateFields.assignedTo = targetAgentId;
        updateFields.assignedName = targetAgentName;

        timelineEvent = {
          type: 'assignment',
          message: `Assignment changed from '${prevAgentName}' to '${newAgentName}' by ${req.user.name}`,
          timestamp: now,
          actorName: req.user.name
        };
      }
    }

    const updatedTicket = await ticketRepository.update(ticket.id, updateFields, timelineEvent);
    delete updatedTicket._id;

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

    const now = new Date().toISOString();
    const newMessage = {
      id: `msg_${Date.now()}`,
      ticketId: ticket.id,
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      content: content.trim(),
      timestamp: now,
      isInternal: false
    };

    await messageRepository.create(newMessage);

    const updateFields = { updatedAt: now };
    let timelineEvent = {
      type: 'reply',
      message: `${req.user.name} added a reply`,
      timestamp: now,
      actorName: req.user.name
    };

    if (req.user.role === 'customer' && ticket.status !== 'requires_attention') {
      const oldStatus = ticket.status;
      updateFields.status = 'requires_attention';
      timelineEvent = {
        type: 'status_change',
        message: `Status reverted from '${oldStatus}' to 'requires_attention' automatically by system due to customer response`,
        timestamp: now,
        actorName: 'System'
      };
    }

    await ticketRepository.update(ticket.id, updateFields, timelineEvent);

    delete newMessage._id;
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

    const now = new Date().toISOString();
    const newNote = {
      id: `msg_${Date.now()}`,
      ticketId: ticket.id,
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      content: content.trim(),
      timestamp: now,
      isInternal: true
    };

    await messageRepository.create(newNote);

    const timelineEvent = {
      type: 'note',
      message: `${req.user.name} recorded an internal team note`,
      timestamp: now,
      actorName: req.user.name
    };

    await ticketRepository.update(ticket.id, { updatedAt: now }, timelineEvent);

    delete newNote._id;
    return res.status(200).json(newNote);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  postMessage,
  postNote
};
