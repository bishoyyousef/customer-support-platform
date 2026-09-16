import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Ticket, ManagerSummary, TicketStatus, Message } from '../models';
import { ITicketService } from './ticket.service.interface';
import { getDemoDB, saveDemoDB, calculateManagerSummary, DEMO_SEARCH_HISTORY_KEY } from './demo-store';
import { DemoEventService } from './demo-event.service';

@Injectable({
  providedIn: 'root'
})
export class DemoTicketService implements ITicketService {
  private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
  public tickets$ = this.ticketsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private pageSubject = new BehaviorSubject<number>(1);
  public page$ = this.pageSubject.asObservable();

  private totalPagesSubject = new BehaviorSubject<number>(1);
  public totalPages$ = this.totalPagesSubject.asObservable();

  private totalItemsSubject = new BehaviorSubject<number>(0);
  public totalItems$ = this.totalItemsSubject.asObservable();

  constructor(private demoEventService: DemoEventService) {}

  private getCurrentUser(): any {
    try {
      const stored = localStorage.getItem('support_platform_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  fetchTickets(paramsObj?: any): Observable<Ticket[]> {
    this.loadingSubject.next(true);
    const db = getDemoDB();
    let list = [...db.tickets];

    if (paramsObj) {
      if (paramsObj.queue === 'mine' && paramsObj.agentId) {
        list = list.filter(t => t.assignedTo === paramsObj.agentId);
      } else if (paramsObj.queue === 'attention') {
        list = list.filter(t => !t.assignedTo || t.status === 'requires_attention');
      }

      if (paramsObj.category && paramsObj.category !== 'All') {
        list = list.filter(t => t.category === paramsObj.category);
      }

      if (paramsObj.status) {
        const statuses = paramsObj.status.split(',');
        list = list.filter(t => statuses.includes(t.status));
      }

      if (paramsObj.search && paramsObj.search.trim()) {
        const q = paramsObj.search.toLowerCase().trim();
        list = list.filter(t => 
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q)
        );
      }

      if (paramsObj.sort) {
        const isAsc = paramsObj.order === 'asc' || paramsObj.sort.endsWith('-asc');
        const sortKey = paramsObj.sort.replace(/-asc|-desc/, '');
        if (sortKey === 'urgency') {
          const urgencyWeight: { [key: string]: number } = { 'High': 3, 'Medium': 2, 'Low': 1 };
          list.sort((a, b) => {
            const wA = urgencyWeight[a.urgency] || 0;
            const wB = urgencyWeight[b.urgency] || 0;
            return isAsc ? wA - wB : wB - wA;
          });
        } else if (sortKey === 'category') {
          list.sort((a, b) => isAsc ? a.category.localeCompare(b.category) : b.category.localeCompare(a.category));
        } else {
          list.sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.createdAt).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt).getTime();
            return isAsc ? timeA - timeB : timeB - timeA;
          });
        }
      } else {
        list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      }
    }

    const page = paramsObj?.page || 1;
    const limit = paramsObj?.limit || 20;
    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = list.slice(startIndex, startIndex + limit);

    this.ticketsSubject.next(paginatedItems);
    this.pageSubject.next(page);
    this.totalPagesSubject.next(totalPages);
    this.totalItemsSubject.next(totalCount);
    this.loadingSubject.next(false);

    return of(paginatedItems);
  }

  getTicketDetails(id: string): Observable<Ticket> {
    const db = getDemoDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) {
      return throwError(() => new Error('Ticket not found'));
    }
    return of(ticket);
  }

  claimTicket(ticketId: string, agentId: string): Observable<Ticket> {
    const db = getDemoDB();
    const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return throwError(() => new Error('Ticket not found'));
    }

    const agent = db.users.find(u => u.id === agentId) || { id: agentId, name: 'Support Agent' };
    const ticket = db.tickets[ticketIndex];
    const prevAssignedName = ticket.assignedName || 'Unassigned';

    ticket.assignedTo = agentId;
    ticket.assignedName = agent.name;
    ticket.updatedAt = new Date().toISOString();

    ticket.activityTimeline.push({
      type: 'assignment',
      message: `Assignment changed from '${prevAssignedName}' to '${agent.name}' by ${agent.name}`,
      timestamp: ticket.updatedAt,
      actorName: agent.name
    });

    db.tickets[ticketIndex] = ticket;
    saveDemoDB(db);

    this.demoEventService.emitTicketUpdated(ticket);
    return of(ticket);
  }

  reassignTicket(ticketId: string, agentId: string | null): Observable<Ticket> {
    const db = getDemoDB();
    const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return throwError(() => new Error('Ticket not found'));
    }

    const currentUser = this.getCurrentUser() || { name: 'Support Manager' };
    const ticket = db.tickets[ticketIndex];
    const prevAssignedName = ticket.assignedName || 'Unassigned';

    if (agentId) {
      const targetAgent = db.users.find(u => u.id === agentId) || { id: agentId, name: 'Support Agent' };
      ticket.assignedTo = agentId;
      ticket.assignedName = targetAgent.name;
    } else {
      ticket.assignedTo = null;
      ticket.assignedName = null;
    }

    ticket.updatedAt = new Date().toISOString();
    const newAssignedName = ticket.assignedName || 'Unassigned';

    ticket.activityTimeline.push({
      type: 'assignment',
      message: `Assignment changed from '${prevAssignedName}' to '${newAssignedName}' by ${currentUser.name}`,
      timestamp: ticket.updatedAt,
      actorName: currentUser.name
    });

    db.tickets[ticketIndex] = ticket;
    saveDemoDB(db);

    this.demoEventService.emitTicketUpdated(ticket);
    return of(ticket);
  }

  postMessage(ticketId: string, content: string): Observable<any> {
    const db = getDemoDB();
    const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return throwError(() => new Error('Ticket not found'));
    }

    const ticket = db.tickets[ticketIndex];
    const currentUser = this.getCurrentUser() || { id: 'agent_1', name: 'Charlie Davis', role: 'agent' };
    const now = new Date().toISOString();

    const msg: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role || 'agent',
      content,
      timestamp: now,
      isInternal: false
    };

    ticket.messages.push(msg);
    ticket.updatedAt = now;

    ticket.activityTimeline.push({
      type: 'reply',
      message: `${currentUser.name} added a reply`,
      timestamp: now,
      actorName: currentUser.name
    });

    db.tickets[ticketIndex] = ticket;
    saveDemoDB(db);

    this.demoEventService.emitNewMessage(msg);
    this.demoEventService.emitTicketUpdated(ticket);
    return of(ticket);
  }

  addNote(ticketId: string, content: string): Observable<any> {
    const db = getDemoDB();
    const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return throwError(() => new Error('Ticket not found'));
    }

    const ticket = db.tickets[ticketIndex];
    const currentUser = this.getCurrentUser() || { id: 'agent_1', name: 'Charlie Davis', role: 'agent' };
    const now = new Date().toISOString();

    const msg: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role || 'agent',
      content,
      timestamp: now,
      isInternal: true
    };

    ticket.messages.push(msg);
    ticket.updatedAt = now;

    ticket.activityTimeline.push({
      type: 'note',
      message: `${currentUser.name} recorded an internal team note`,
      timestamp: now,
      actorName: currentUser.name
    });

    db.tickets[ticketIndex] = ticket;
    saveDemoDB(db);

    this.demoEventService.emitNewMessage(msg);
    this.demoEventService.emitTicketUpdated(ticket);
    return of(ticket);
  }

  updateStatus(ticketId: string, status: TicketStatus): Observable<any> {
    const db = getDemoDB();
    const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return throwError(() => new Error('Ticket not found'));
    }

    const ticket = db.tickets[ticketIndex];
    const currentUser = this.getCurrentUser() || { name: 'Support Employee' };
    const now = new Date().toISOString();

    const prevStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = now;

    ticket.activityTimeline.push({
      type: 'status_change',
      message: `Status updated from '${prevStatus}' to '${status}' by ${currentUser.name}`,
      timestamp: now,
      actorName: currentUser.name
    });

    db.tickets[ticketIndex] = ticket;
    saveDemoDB(db);

    this.demoEventService.emitTicketUpdated(ticket);
    return of(ticket);
  }

  resolveTicket(ticketId: string, resolutionSummary: string): Observable<any> {
    const db = getDemoDB();
    const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return throwError(() => new Error('Ticket not found'));
    }

    const ticket = db.tickets[ticketIndex];
    const currentUser = this.getCurrentUser() || { name: 'Support Employee' };
    const now = new Date().toISOString();

    const prevStatus = ticket.status;
    ticket.status = 'resolved';
    ticket.resolutionSummary = resolutionSummary;
    ticket.updatedAt = now;

    ticket.activityTimeline.push({
      type: 'status_change',
      message: `Status updated from '${prevStatus}' to 'resolved' by ${currentUser.name}`,
      timestamp: now,
      actorName: currentUser.name
    });

    db.tickets[ticketIndex] = ticket;
    saveDemoDB(db);

    this.demoEventService.emitTicketUpdated(ticket);
    return of(ticket);
  }

  uploadAttachment(ticketId: string, file: File, isInternal = false): Observable<any> {
    const db = getDemoDB();
    const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return throwError(() => new Error('Ticket not found'));
    }

    const ticket = db.tickets[ticketIndex];
    const currentUser = this.getCurrentUser() || { id: 'agent_1', name: 'Charlie Davis', role: 'agent' };
    const now = new Date().toISOString();

    const msg: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role || 'agent',
      content: `Uploaded attachment: ${file.name}`,
      timestamp: now,
      isInternal
    };

    ticket.messages.push(msg);
    ticket.updatedAt = now;

    db.tickets[ticketIndex] = ticket;
    saveDemoDB(db);

    this.demoEventService.emitNewMessage(msg);
    this.demoEventService.emitTicketUpdated(ticket);
    return of(ticket);
  }

  getManagerSummary(): Observable<ManagerSummary> {
    const db = getDemoDB();
    const summary = calculateManagerSummary(db);
    return of(summary);
  }

  getSearchHistory(): Observable<string[]> {
    try {
      const stored = localStorage.getItem(DEMO_SEARCH_HISTORY_KEY);
      return of(stored ? JSON.parse(stored) : []);
    } catch {
      return of([]);
    }
  }

  addSearchHistory(query: string): Observable<string[]> {
    try {
      const raw = localStorage.getItem(DEMO_SEARCH_HISTORY_KEY);
      const history: string[] = raw ? JSON.parse(raw) : [];
      const filtered = history.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 10);
      localStorage.setItem(DEMO_SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return of(updated);
    } catch {
      return of([query]);
    }
  }

  removeSearchHistory(query: string): Observable<string[]> {
    try {
      const raw = localStorage.getItem(DEMO_SEARCH_HISTORY_KEY);
      const history: string[] = raw ? JSON.parse(raw) : [];
      const updated = history.filter(q => q.toLowerCase() !== query.toLowerCase());
      localStorage.setItem(DEMO_SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return of(updated);
    } catch {
      return of([]);
    }
  }

  clearSearchHistory(): Observable<string[]> {
    localStorage.removeItem(DEMO_SEARCH_HISTORY_KEY);
    return of([]);
  }

  getSuggestions(query: string): Observable<{ type: string; text: string; subtext?: string; ticketId?: string }[]> {
    if (!query || !query.trim()) return of([]);
    const db = getDemoDB();
    const q = query.toLowerCase().trim();
    const suggestions: { type: string; text: string; subtext?: string; ticketId?: string }[] = [];

    db.tickets.forEach(t => {
      if (t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q)) {
        suggestions.push({
          type: 'ticket',
          text: t.title,
          subtext: `${t.id} • ${t.customerName} • ${t.status}`,
          ticketId: t.id
        });
      }
    });

    return of(suggestions.slice(0, 5));
  }
}
