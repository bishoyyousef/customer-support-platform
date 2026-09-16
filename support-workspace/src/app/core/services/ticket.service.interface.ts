import { Observable } from 'rxjs';
import { Ticket, ManagerSummary, TicketStatus } from '../models';

export abstract class ITicketService {
  abstract tickets$: Observable<Ticket[]>;
  abstract loading$: Observable<boolean>;
  abstract page$: Observable<number>;
  abstract totalPages$: Observable<number>;
  abstract totalItems$: Observable<number>;

  abstract fetchTickets(paramsObj?: any): Observable<Ticket[]>;
  abstract getTicketDetails(id: string): Observable<Ticket>;
  abstract claimTicket(ticketId: string, agentId: string): Observable<Ticket>;
  abstract reassignTicket(ticketId: string, agentId: string | null): Observable<Ticket>;
  abstract postMessage(ticketId: string, content: string): Observable<any>;
  abstract addNote(ticketId: string, content: string): Observable<any>;
  abstract updateStatus(ticketId: string, status: TicketStatus): Observable<any>;
  abstract resolveTicket(ticketId: string, resolutionSummary: string): Observable<any>;
  abstract uploadAttachment(ticketId: string, file: File, isInternal?: boolean): Observable<any>;
  abstract getManagerSummary(): Observable<ManagerSummary>;
  abstract getSearchHistory(): Observable<string[]>;
  abstract addSearchHistory(query: string): Observable<string[]>;
  abstract removeSearchHistory(query: string): Observable<string[]>;
  abstract clearSearchHistory(): Observable<string[]>;
  abstract getSuggestions(query: string): Observable<{ type: string; text: string; subtext?: string; ticketId?: string }[]>;
}
