import ticketRepository from '../repositories/ticketRepository.js';
import messageRepository from '../repositories/messageRepository.js';
import userRepository from '../repositories/userRepository.js';

class TicketService {
  async createTicket(user, payload) {
    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const initialMessage = {
      id: `msg_${Date.now()}`,
      ticketId,
      senderId: user.id,
      senderName: user.name,
      senderRole: 'customer',
      content: payload.description.trim(),
      timestamp: now,
      isInternal: false
    };

    const newTicket = {
      id: ticketId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      category: payload.category,
      urgency: payload.urgency,
      status: 'requires_attention',
      customerId: user.id,
      customerName: user.name,
      assignedTo: null,
      assignedName: null,
      createdAt: now,
      updatedAt: now,
      resolutionSummary: null,
      activityTimeline: [
        {
          type: 'creation',
          message: `Ticket created by ${user.name}`,
          timestamp: now,
          actorName: user.name
        }
      ]
    };

    await ticketRepository.create(newTicket);
    await messageRepository.create(initialMessage);

    return {
      ticket: newTicket,
      initialMessage
    };
  }

  async updateTicket(ticketId, user, payload) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) return null;

    const now = new Date().toISOString();
    const updateFields = { updatedAt: now };
    let timelineEvent = null;

    // Status transitions
    if (payload.status !== undefined && payload.status !== ticket.status) {
      if (payload.status === 'resolved') {
        const summary = payload.resolutionSummary || payload.resolutionText;
        updateFields.resolutionSummary = summary.trim();
      }

      updateFields.status = payload.status;
      timelineEvent = {
        type: 'status_change',
        message: `Status updated from '${ticket.status}' to '${payload.status}' by ${user.name}`,
        timestamp: now,
        actorName: user.name
      };
    }

    // Assignments
    if (payload.assignedTo !== undefined && payload.assignedTo !== ticket.assignedTo) {
      const targetAgentId = payload.assignedTo;
      let targetAgentName = null;

      if (targetAgentId) {
        const targetAgent = await userRepository.findById(targetAgentId);
        if (targetAgent) {
          targetAgentName = targetAgent.name;
        }
      }

      const prevAgentName = ticket.assignedName || 'Unassigned';
      const newAgentName = targetAgentName || 'Unassigned';

      updateFields.assignedTo = targetAgentId;
      updateFields.assignedName = targetAgentName;

      timelineEvent = {
        type: 'assignment',
        message: `Assignment changed from '${prevAgentName}' to '${newAgentName}' by ${user.name}`,
        timestamp: now,
        actorName: user.name
      };
    }

    const updatedTicket = await ticketRepository.update(ticket.id, updateFields, timelineEvent);
    delete updatedTicket._id;
    return updatedTicket;
  }

  async addMessage(ticketId, user, content) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) return null;

    const now = new Date().toISOString();
    const newMessage = {
      id: `msg_${Date.now()}`,
      ticketId: ticket.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: content.trim(),
      timestamp: now,
      isInternal: false
    };

    await messageRepository.create(newMessage);

    const updateFields = { updatedAt: now };
    let timelineEvent = null;

    if (user.role === 'customer' && ticket.status !== 'requires_attention') {
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
    return newMessage;
  }

  async addNote(ticketId, user, content) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) return null;

    const now = new Date().toISOString();
    const newNote = {
      id: `msg_${Date.now()}`,
      ticketId: ticket.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: content.trim(),
      timestamp: now,
      isInternal: true
    };

    await messageRepository.create(newNote);
    await ticketRepository.update(ticket.id, { updatedAt: now }, null);

    delete newNote._id;
    return newNote;
  }
}

export default new TicketService();
