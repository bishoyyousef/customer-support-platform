import type { IPortalDataService, PaginatedTickets, TicketQueryParams } from './portalDataService.interface';
import type { Ticket, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class ApiError extends Error {
  status: number;
  errors?: string[];

  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('support_platform_token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    const msg = err?.message || 'Failed to fetch';
    throw new ApiError(
      `Network Error: Unable to connect to backend API at ${API_BASE_URL}. (${msg})`,
      0
    );
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errors: string[] = [];
    try {
      const data = await response.json();
      errorMessage = data.message || errorMessage;
      errors = data.errors || [];
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new ApiError(errorMessage, response.status, errors);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json() as T;
  return data;
}

async function requestWithResponse<T>(path: string, options: RequestInit = {}): Promise<{ data: T; headers: Headers }> {
  const token = localStorage.getItem('support_platform_token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}/${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errors: string[] = [];
    try {
      const data = await response.json();
      errorMessage = data.message || errorMessage;
      errors = data.errors || [];
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new ApiError(errorMessage, response.status, errors);
  }

  if (response.status === 204) {
    return { data: {} as T, headers: response.headers };
  }

  const data = await response.json() as T;
  return { data, headers: response.headers };
}

export class RealPortalDataService implements IPortalDataService {
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getTickets(params?: TicketQueryParams): Promise<PaginatedTickets> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const queryString = query.toString();
    const path = queryString ? `tickets?${queryString}` : 'tickets';
    const res = await requestWithResponse<Ticket[]>(path);
    
    const page = parseInt(res.headers.get('X-Pagination-Page') || String(params?.page || 1), 10);
    const totalPages = parseInt(res.headers.get('X-Pagination-Total-Pages') || '1', 10);
    const totalCount = parseInt(res.headers.get('X-Pagination-Total-Count') || String(res.data.length), 10);

    return {
      items: res.data,
      page,
      totalPages,
      totalCount,
    };
  }

  async getTicketDetails(id: string): Promise<Ticket> {
    return request<Ticket>(`tickets/${id}`);
  }

  async createTicket(ticket: { title: string; description: string; category: string; urgency: string }): Promise<Ticket> {
    return request<Ticket>('tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    return request<Ticket>(`tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async addMessage(ticketId: string, content: string): Promise<Ticket> {
    return request<Ticket>(`tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async uploadAttachment(ticketId: string, file: File): Promise<Ticket> {
    const formData = new FormData();
    formData.append('attachment', file);
    return request<Ticket>(`tickets/${ticketId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  }

  async getSearchHistory(): Promise<string[]> {
    return request<string[]>('users/me/search-history');
  }

  async addSearchHistory(query: string): Promise<string[]> {
    return request<string[]>('users/me/search-history', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  async removeSearchHistory(query: string): Promise<string[]> {
    return request<string[]>(`users/me/search-history?query=${encodeURIComponent(query)}`, {
      method: 'DELETE',
    });
  }

  async clearSearchHistory(): Promise<string[]> {
    return request<string[]>('users/me/search-history', {
      method: 'DELETE',
    });
  }

  async getSuggestions(query: string): Promise<{ type: string; text: string; subtext?: string; ticketId?: string }[]> {
    return request<{ type: string; text: string; subtext?: string; ticketId?: string }[]>(
      `tickets/suggestions?q=${encodeURIComponent(query)}`
    );
  }
}

// Backwards compatibility export instance
export const api = new RealPortalDataService();
