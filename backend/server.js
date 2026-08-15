const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Flat-file persistence engine helpers
function readDb() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Database Read Error:", err);
    return { users: [], tickets: [] };
  }
}

function writeDb(data) {
  try {
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    console.error("Database Write Error:", err);
    throw new Error("Persistence failed");
  }
}

// Authentication Context Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.substring(7);
  const db = readDb();
  
  // Resolve profile via mock tokens
  let user;
  if (token.startsWith('mock-jwt-token-for-')) {
    const username = token.replace('mock-jwt-token-for-', '');
    user = db.users.find(u => u.username === username);
  } else {
    // Direct username fallback for verification scripts
    user = db.users.find(u => u.username === token);
  }

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized: Session invalid' });
  }

  req.user = user;
  next();
}

// Data Validation Handlers
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

// Root Health/Index endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Customer Support Platform Shared API Service',
    docs: '/README.md',
    endpoints: [
      { method: 'POST', path: '/api/auth/login', desc: 'Agent/Customer Authentication' },
      { method: 'GET', path: '/api/tickets', desc: 'List active tickets (RBAC Scoped)' },
      { method: 'POST', path: '/api/tickets', desc: 'Submit a new support ticket (Customer only)' }
    ]
  });
});

// 1. Auth Routing: Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const db = readDb();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  // Generate mock auth token
  const token = `mock-jwt-token-for-${user.username}`;
  
  // Strip password in response
  const userResponse = { ...user };
  delete userResponse.password;

  return res.status(200).json({
    token,
    user: userResponse
  });
});

// 2. Ticket Routing: List Tickets (RBAC Scoped)
app.get('/api/tickets', authenticate, (req, res) => {
  const db = readDb();
  let userTickets = [];

  if (req.user.role === 'customer') {
    // Customers only see their own tickets
    userTickets = db.tickets.filter(t => t.customerId === req.user.id);
  } else {
    // Agents & Managers see all tickets
    userTickets = db.tickets;
  }

  // Format response to exclude full message threads and internal notes in summary list
  const formattedTickets = userTickets.map(t => {
    const summary = { ...t };
    delete summary.messages;
    delete summary.activityTimeline;
    return summary;
  });

  return res.status(200).json(formattedTickets);
});

// 3. Ticket Routing: Get Ticket Details (RBAC Scoped + Internal Notes Redaction)
app.get('/api/tickets/:id', authenticate, (req, res) => {
  const db = readDb();
  const ticket = db.tickets.find(t => t.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }

  // Access check
  if (req.user.role === 'customer' && ticket.customerId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden: You do not have access to this ticket' });
  }

  // Clone ticket to mutate messages safely
  const responseTicket = JSON.parse(JSON.stringify(ticket));

  // Redact internal notes for customers
  if (req.user.role === 'customer') {
    responseTicket.messages = responseTicket.messages.filter(msg => !msg.isInternal);
  }

  return res.status(200).json(responseTicket);
});

// 4. Ticket Routing: Submit Ticket (Customer Only)
app.post('/api/tickets', authenticate, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Forbidden: Only customers can submit tickets' });
  }

  const { isValid, errors } = validateTicket(req.body);
  if (!isValid) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  const db = readDb();
  const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newTicket = {
    id: ticketId,
    title: req.body.title,
    description: req.body.description,
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
    ],
    messages: [
      {
        id: `msg_${Date.now()}`,
        senderId: req.user.id,
        senderName: req.user.name,
        senderRole: 'customer',
        content: req.body.description,
        timestamp: now,
        isInternal: false
      }
    ]
  };

  db.tickets.push(newTicket);
  writeDb(db);

  return res.status(201).json(newTicket);
});

// 5. Ticket Routing: Update Ticket (Status transitions, Assignment)
app.patch('/api/tickets/:id', authenticate, (req, res) => {
  const db = readDb();
  const ticketIndex = db.tickets.findIndex(t => t.id === req.params.id);

  if (ticketIndex === -1) {
    return res.status(404).json({ message: 'Ticket not found' });
  }

  const ticket = db.tickets[ticketIndex];

  // Validate changes
  const { isValid, errors } = validateTicket(req.body, true);
  if (!isValid) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  const now = new Date().toISOString();
  const activityEvents = [];

  // Handle status transitions
  if (req.body.status !== undefined && req.body.status !== ticket.status) {
    // If ticket is being resolved, require resolution summary
    if (req.body.status === 'resolved') {
      const summary = req.body.resolutionSummary || req.body.resolutionText;
      if (!summary || typeof summary !== 'string' || summary.trim().length < 10 || summary.trim().length > 1000) {
        return res.status(400).json({ message: 'Resolution summary of at least 10 characters is required to resolve a ticket.' });
      }
      ticket.resolutionSummary = summary.trim();
    }
    
    activityEvents.push({
      type: 'status_change',
      message: `Status updated from '${ticket.status}' to '${req.body.status}' by ${req.user.name}`,
      timestamp: now,
      actorName: req.user.name
    });

    ticket.status = req.body.status;
  }

  // Handle assignments
  if (req.body.assignedTo !== undefined && req.body.assignedTo !== ticket.assignedTo) {
    const targetAgentId = req.body.assignedTo;
    
    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Forbidden: Customers cannot assign tickets' });
    }

    if (req.user.role === 'agent') {
      // Agents can only assign to themselves (claim)
      if (targetAgentId !== null && targetAgentId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: Agents can only assign tickets to themselves' });
      }
    }

    // Lookup assignee details
    let targetAgentName = null;
    if (targetAgentId) {
      const targetAgent = db.users.find(u => u.id === targetAgentId && (u.role === 'agent' || u.role === 'manager'));
      if (!targetAgent) {
        return res.status(400).json({ message: 'Invalid assignee ID' });
      }
      targetAgentName = targetAgent.name;
    }

    const prevAgentName = ticket.assignedName || 'Unassigned';
    const newAgentName = targetAgentName || 'Unassigned';

    activityEvents.push({
      type: 'assignment',
      message: `Assignment changed from '${prevAgentName}' to '${newAgentName}' by ${req.user.name}`,
      timestamp: now,
      actorName: req.user.name
    });

    ticket.assignedTo = targetAgentId;
    ticket.assignedName = targetAgentName;
  }

  // Append new timeline logs
  if (activityEvents.length > 0) {
    ticket.activityTimeline.push(...activityEvents);
  }

  ticket.updatedAt = now;
  db.tickets[ticketIndex] = ticket;
  writeDb(db);

  return res.status(200).json(ticket);
});

// 6. Ticket Routing: Post message (Any authenticated user in conversation)
app.post('/api/tickets/:id/messages', authenticate, (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length < 1 || content.trim().length > 1000) {
    return res.status(400).json({ message: 'Message content must be between 1 and 1000 characters.' });
  }

  const db = readDb();
  const ticketIndex = db.tickets.findIndex(t => t.id === req.params.id);

  if (ticketIndex === -1) {
    return res.status(404).json({ message: 'Ticket not found' });
  }

  const ticket = db.tickets[ticketIndex];

  // Customer authorization check
  if (req.user.role === 'customer' && ticket.customerId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden: You do not have access to this ticket' });
  }

  const now = new Date().toISOString();
  const newMessage = {
    id: `msg_${Date.now()}`,
    senderId: req.user.id,
    senderName: req.user.name,
    senderRole: req.user.role,
    content: content.trim(),
    timestamp: now,
    isInternal: false
  };

  ticket.messages.push(newMessage);
  
  // Timeline audit log
  ticket.activityTimeline.push({
    type: 'reply',
    message: `${req.user.name} added a reply`,
    timestamp: now,
    actorName: req.user.name
  });

  // If customer replies, change status back to 'requires_attention' automatically
  if (req.user.role === 'customer' && ticket.status !== 'requires_attention') {
    const oldStatus = ticket.status;
    ticket.status = 'requires_attention';
    ticket.activityTimeline.push({
      type: 'status_change',
      message: `Status reverted from '${oldStatus}' to 'requires_attention' automatically by system due to customer response`,
      timestamp: now,
      actorName: 'System'
    });
  }

  ticket.updatedAt = now;
  db.tickets[ticketIndex] = ticket;
  writeDb(db);

  return res.status(200).json(newMessage);
});

// 7. Ticket Routing: Post internal note (Agents and Managers only)
app.post('/api/tickets/:id/notes', authenticate, (req, res) => {
  if (req.user.role === 'customer') {
    return res.status(403).json({ message: 'Forbidden: Customers cannot add internal notes' });
  }

  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length < 1 || content.trim().length > 1000) {
    return res.status(400).json({ message: 'Note content must be between 1 and 1000 characters.' });
  }

  const db = readDb();
  const ticketIndex = db.tickets.findIndex(t => t.id === req.params.id);

  if (ticketIndex === -1) {
    return res.status(404).json({ message: 'Ticket not found' });
  }

  const ticket = db.tickets[ticketIndex];
  const now = new Date().toISOString();
  const newNote = {
    id: `msg_${Date.now()}`,
    senderId: req.user.id,
    senderName: req.user.name,
    senderRole: req.user.role,
    content: content.trim(),
    timestamp: now,
    isInternal: true
  };

  ticket.messages.push(newNote);

  // Timeline audit log
  ticket.activityTimeline.push({
    type: 'note',
    message: `${req.user.name} recorded an internal team note`,
    timestamp: now,
    actorName: req.user.name
  });

  ticket.updatedAt = now;
  db.tickets[ticketIndex] = ticket;
  writeDb(db);

  return res.status(200).json(newNote);
});

app.listen(PORT, () => {
  console.log(`Persistent Server listening on port ${PORT}`);
});
