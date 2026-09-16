import type { Ticket, User } from '../types';

export interface PaginatedTickets {
  items: Ticket[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export interface TicketQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  urgency?: string;
  sort?: string;
  order?: string;
  queue?: string;
}

export interface IPortalDataService {
  login(username: string, password: string): Promise<{ token: string; user: User }>;
  getTickets(params?: TicketQueryParams): Promise<PaginatedTickets>;
  getTicketDetails(id: string): Promise<Ticket>;
  createTicket(ticket: { title: string; description: string; category: string; urgency: string }): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket>;
  addMessage(ticketId: string, content: string): Promise<Ticket>;
  uploadAttachment(ticketId: string, file: File): Promise<Ticket>;
  getSearchHistory(): Promise<string[]>;
  addSearchHistory(query: string): Promise<string[]>;
  removeSearchHistory(query: string): Promise<string[]>;
  clearSearchHistory(): Promise<string[]>;
  getSuggestions(query: string): Promise<{ type: string; text: string; subtext?: string; ticketId?: string }[]>;
}
