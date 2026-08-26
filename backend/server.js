const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const { connectDb } = require('./database/connection').default;
const userRepository = require('./repositories/userRepository');
const ticketRepository = require('./repositories/ticketRepository');
const messageRepository = require('./repositories/messageRepository');

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

app.use(cors());
app.use(bodyParser.json());

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueId = `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, `${uniqueId}_${safeName}`);
  }
});

const allowedMimeTypes = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv'
];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only standard documents and images are allowed.'));
    }
  }
});

// Authentication Middleware
async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
    }

    let username = token;
    if (token.startsWith('mock-jwt-token-for-')) {
      username = token.replace('mock-jwt-token-for-', '');
    }

    const user = await userRepository.findByUsername(username);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Session invalid' });
    }

    // Strip password from req.user context
    const safeUser = { ...user };
    delete safeUser.password;

    req.user = safeUser;
    next();
  } catch (err) {
    next(err);
  }
}

// Validation helper
function validateTicket(ticketData, isUpdate = false) {
  const errors = [];
  const categories = ['Billing', 'Technical', 'Account', 'Other'];
  const urgencies = ['Low', 'Medium', 'High'];
  const statuses = ['requires_attention', 'under_investigation', 'pending_customer', 'resolved'];

  if (!isUpdate) {
    if (!ticketData.title || typeof ticketData.title !== 'string' || ticketData.title.trim().length < 5 || ticketData.title.trim().length > 100) {
      errors.push('Title must be between 5 and 100 characters.');
    }
    if (!ticketData.description || typeof ticketData.description !== 'string' || ticketData.description.trim().length < 15 || ticketData.description.trim().length > 1000) {
      errors.push('Description must be between 15 and 1000 characters.');
    }
    if (!categories.includes(ticketData.category)) {
      errors.push('Category must be one of: ' + categories.join(', '));
    }
    if (!urgencies.includes(ticketData.urgency)) {
      errors.push('Urgency must be one of: ' + urgencies.join(', '));
    }
  } else {
    if (ticketData.title !== undefined && (typeof ticketData.title !== 'string' || ticketData.title.trim().length < 5 || ticketData.title.trim().length > 100)) {
      errors.push('Title must be between 5 and 100 characters.');
    }
    if (ticketData.description !== undefined && (typeof ticketData.description !== 'string' || ticketData.description.trim().length < 15 || ticketData.description.trim().length > 1000)) {
      errors.push('Description must be between 15 and 1000 characters.');
    }
    if (ticketData.category !== undefined && !categories.includes(ticketData.category)) {
      errors.push('Category must be one of: ' + categories.join(', '));
    }
    if (ticketData.urgency !== undefined && !urgencies.includes(ticketData.urgency)) {
      errors.push('Urgency must be one of: ' + urgencies.join(', '));
    }
    if (ticketData.status !== undefined && !statuses.includes(ticketData.status)) {
      errors.push('Status must be one of: ' + statuses.join(', '));
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Customer Support Platform Shared API Service (MongoDB Atlas)',
    docs: '/README.md'
  });
});

// 1. Auth Routing: Login endpoint
app.post('/api/auth/login', async (req, res, next) => {
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
});

// 2. Ticket Routing: List Tickets (RBAC Scoped + Repository Paginated)
app.get('/api/tickets', authenticate, async (req, res, next) => {
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
});

// 3. Ticket Routing: Get Ticket Details (RBAC Scoped + Messages Lookup + Notes Redaction)
app.get('/api/tickets/:id', authenticate, async (req, res, next) => {
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
});

// 4. Ticket Routing: Submit Ticket (Customer Only)
app.post('/api/tickets', authenticate, async (req, res, next) => {
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
});

// 5. Ticket Routing: Update Ticket (Status transitions, Assignment)
app.patch('/api/tickets/:id', authenticate, async (req, res, next) => {
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
});

// 6. Ticket Routing: Post message
app.post('/api/tickets/:id/messages', authenticate, async (req, res, next) => {
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
});

// 7. Ticket Routing: Post internal note
app.post('/api/tickets/:id/notes', authenticate, async (req, res, next) => {
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
});

// 8. Ticket Routing: Post attachment
app.post('/api/tickets/:id/attachments', authenticate, async (req, res, next) => {
  try {
    const ticket = await ticketRepository.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'customer' && ticket.customerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this ticket' });
    }

    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      try {
        const now = new Date().toISOString();
        const isInternal = req.query.isInternal === 'true' && req.user.role !== 'customer';
        const attachmentId = `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const newMessage = {
          id: `msg_${Date.now()}`,
          ticketId: ticket.id,
          senderId: req.user.id,
          senderName: req.user.name,
          senderRole: req.user.role,
          content: `[Attachment: ${req.file.originalname}]`,
          timestamp: now,
          isInternal,
          attachment: {
            id: attachmentId,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            storagePath: req.file.filename
          }
        };

        await messageRepository.create(newMessage);

        const updateFields = { updatedAt: now };
        let timelineEvent = {
          type: isInternal ? 'note' : 'reply',
          message: `${req.user.name} uploaded an attachment: ${req.file.originalname}`,
          timestamp: now,
          actorName: req.user.name
        };

        if (req.user.role === 'customer' && !isInternal && ticket.status !== 'requires_attention') {
          const oldStatus = ticket.status;
          updateFields.status = 'requires_attention';
          timelineEvent = {
            type: 'status_change',
            message: `Status reverted from '${oldStatus}' to 'requires_attention' automatically by system due to customer attachment`,
            timestamp: now,
            actorName: 'System'
          };
        }

        await ticketRepository.update(ticket.id, updateFields, timelineEvent);

        delete newMessage._id;
        return res.status(201).json(newMessage);
      } catch (uploadErr) {
        next(uploadErr);
      }
    });
  } catch (err) {
    next(err);
  }
});

// 9. Ticket Routing: Download attachment
app.get('/api/attachments/:attachmentId', authenticate, async (req, res, next) => {
  try {
    const msg = await messageRepository.findByAttachmentId(req.params.attachmentId);

    if (!msg || !msg.attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const ticket = await ticketRepository.findById(msg.ticketId);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'customer') {
      if (ticket.customerId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this ticket' });
      }
      if (msg.isInternal) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this internal note attachment' });
      }
    }

    const filePath = path.join(UPLOADS_DIR, msg.attachment.storagePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Attachment file not found on disk' });
    }

    res.setHeader('Content-Type', msg.attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(msg.attachment.filename)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// 10. Manager Visibility: Aggregated Summary Endpoint
app.get('/api/manager/summary', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Forbidden: Only managers can view manager summary analytics' });
    }

    const staffList = await userRepository.getAgentsAndManagers();
    const summary = await ticketRepository.getManagerSummary(staffList);

    return res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

// Global Express Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function startServer() {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`Persistent MongoDB Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
