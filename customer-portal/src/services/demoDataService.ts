import type { IPortalDataService, PaginatedTickets, TicketQueryParams } from './portalDataService.interface';
import type { Ticket, User, Message } from '../types';
import { DEMO_SEARCH_HISTORY_KEY, getDemoDB, saveDemoDB } from './demoStore';
import { demoEventEmitter } from './demoEventEmitter';

export class DemoPortalDataService implements IPortalDataService {
  private getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem('support_platform_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async login(username: string, _password: string): Promise<{ token: string; user: User }> {
    const db = getDemoDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.role !== 'customer') {
      throw new Error('Unauthorized access: Only customer credentials can log into this portal.');
    }

    const token = `demo-token-${user.id}`;
    return { token, user };
  }

  async getTickets(params?: TicketQueryParams): Promise<PaginatedTickets> {
    const db = getDemoDB();
    const currentUser = this.getCurrentUser();
    
    // Filter tickets for current customer if logged in
    let list = currentUser ? db.tickets.filter(t => t.customerId === currentUser.id) : [...db.tickets];

    if (params) {
      if (params.category && params.category !== 'All') {
        list = list.filter(t => t.category === params.category);
      }
      if (params.urgency) {
        list = list.filter(t => t.urgency === params.urgency);
      }
      if (params.status) {
        const statuses = params.status.split(',');
        list = list.filter(t => statuses.includes(t.status));
      }
      if (params.search && params.search.trim()) {
        const q = params.search.toLowerCase().trim();
        list = list.filter(t => 
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
        );
      }
    }

    // Sorting logic (ASC and DESC)
    const isAsc = params?.order === 'asc' || (params?.sort && params.sort.endsWith('-asc'));
    const sortField = params?.sort ? params.sort.replace(/-asc|-desc/, '') : 'createdAt';

    if (sortField === 'urgency') {
      const urgencyWeight: { [key: string]: number } = { 'High': 3, 'Medium': 2, 'Low': 1 };
      list.sort((a, b) => {
        const wA = urgencyWeight[a.urgency] || 0;
        const wB = urgencyWeight[b.urgency] || 0;
        return isAsc ? wA - wB : wB - wA;
      });
    } else if (sortField === 'category') {
      list.sort((a, b) => isAsc ? a.category.localeCompare(b.category) : b.category.localeCompare(a.category));
    } else {
      list.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return isAsc ? timeA - timeB : timeB - timeA;
      });
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = list.slice(startIndex, startIndex + limit);

    return {
      items,
      page,
      totalPages,
      totalCount,
    };
  }

  async getTicketDetails(id: string): Promise<Ticket> {
    const db = getDemoDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    return ticket;
  }

  async createTicket(ticket: { title: string; description: string; category: string; urgency: string }): Promise<Ticket> {
    const db = getDemoDB();
    const currentUser = this.getCurrentUser() || {
      id: 'cust_1',
      name: 'Alice Johnson',
      role: 'customer',
      username: 'alice',
      email: 'alice@example.com'
    };

    const newTicketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const initialMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: ticket.description,
      timestamp: now,
      isInternal: false,
    };

    const newTicket: Ticket = {
      id: newTicketId,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      urgency: ticket.urgency as 'Low' | 'Medium' | 'High',
      status: 'requires_attention',
      customerId: currentUser.id,
      customerName: currentUser.name,
      assignedTo: null,
      assignedName: null,
      createdAt: now,
      updatedAt: now,
      resolutionSummary: null,
      activityTimeline: [
        {
          type: 'creation',
          message: `Ticket created by ${currentUser.name}`,
          timestamp: now,
          actorName: currentUser.name,
        },
      ],
      messages: [initialMessage],
    };

    db.tickets.unshift(newTicket);
    saveDemoDB(db);

    demoEventEmitter.emit('ticket_created', newTicket);
    return newTicket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    const db = getDemoDB();
    const index = db.tickets.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Ticket not found');
    }

    const existing = db.tickets[index];
    const updated: Ticket = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    db.tickets[index] = updated;
    saveDemoDB(db);

    demoEventEmitter.emit('ticket_updated', updated);
    return updated;
  }

  async addMessage(ticketId: string, content: string): Promise<Ticket> {
    const db = getDemoDB();
    const index = db.tickets.findIndex(t => t.id === ticketId);
    if (index === -1) {
      throw new Error('Ticket not found');
    }

    const ticket = db.tickets[index];
    const currentUser = this.getCurrentUser() || {
      id: ticket.customerId,
      name: ticket.customerName,
      role: 'customer' as const,
      username: 'alice',
      email: 'alice@example.com'
    };

    const now = new Date().toISOString();
    const newMessage: Message & { ticketId?: string } = {
      id: `msg_${Date.now()}`,
      ticketId: ticketId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content,
      timestamp: now,
      isInternal: false,
    };

    ticket.messages.push(newMessage);

    // If customer replies to resolved ticket, revert status to requires_attention
    if (ticket.status === 'resolved' || ticket.status === 'pending_customer') {
      ticket.status = 'requires_attention';
      ticket.activityTimeline.push({
        type: 'status_change',
        message: `Status updated to 'requires_attention' by ${currentUser.name}`,
        timestamp: now,
        actorName: currentUser.name,
      });
    }

    ticket.activityTimeline.push({
      type: 'reply',
      message: `${currentUser.name} added a reply`,
      timestamp: now,
      actorName: currentUser.name,
    });

    ticket.updatedAt = now;
    db.tickets[index] = ticket;
    saveDemoDB(db);

    demoEventEmitter.emit('new_message', newMessage);
    demoEventEmitter.emit('ticket_updated', ticket);

    return ticket;
  }

  async uploadAttachment(ticketId: string, file: File): Promise<Ticket> {
    const db = getDemoDB();
    const index = db.tickets.findIndex(t => t.id === ticketId);
    if (index === -1) {
      throw new Error('Ticket not found');
    }

    const ticket = db.tickets[index];
    const currentUser = this.getCurrentUser() || {
      id: ticket.customerId,
      name: ticket.customerName,
      role: 'customer' as const,
      username: 'alice',
      email: 'alice@example.com'
    };

    const now = new Date().toISOString();
    const newMessage: Message & { ticketId?: string } = {
      id: `msg_${Date.now()}`,
      ticketId: ticketId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: `Uploaded attachment: ${file.name}`,
      timestamp: now,
      isInternal: false,
      attachment: {
        id: `att_${Date.now()}`,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storagePath: `/demo_uploads/${file.name}`,
      }
    };

    ticket.messages.push(newMessage);
    ticket.updatedAt = now;
    db.tickets[index] = ticket;
    saveDemoDB(db);

    demoEventEmitter.emit('new_message', newMessage);
    demoEventEmitter.emit('ticket_updated', ticket);

    return ticket;
  }

  async getSearchHistory(): Promise<string[]> {
    try {
      const stored = localStorage.getItem(DEMO_SEARCH_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async addSearchHistory(query: string): Promise<string[]> {
    const history = await this.getSearchHistory();
    const filtered = history.filter(q => q.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, 10);
    localStorage.setItem(DEMO_SEARCH_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  }

  async removeSearchHistory(query: string): Promise<string[]> {
    const history = await this.getSearchHistory();
    const updated = history.filter(q => q.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(DEMO_SEARCH_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  }

  async clearSearchHistory(): Promise<string[]> {
    localStorage.removeItem(DEMO_SEARCH_HISTORY_KEY);
    return [];
  }

  async getSuggestions(query: string): Promise<{ type: string; text: string; subtext?: string; ticketId?: string }[]> {
    if (!query || !query.trim()) return [];
    const db = getDemoDB();
    const q = query.toLowerCase().trim();
    const suggestions: { type: string; text: string; subtext?: string; ticketId?: string }[] = [];

    db.tickets.forEach(t => {
      if (t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)) {
        suggestions.push({
          type: 'ticket',
          text: t.title,
          subtext: `${t.id} • ${t.category} • ${t.status}`,
          ticketId: t.id,
        });
      }
    });

    return suggestions.slice(0, 5);
  }
}
