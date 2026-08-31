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
      // JSON parsing failure fallback
      errorMessage = response.statusText || errorMessage;
    }
    throw new ApiError(errorMessage, response.status, errors);
  }

  // Handle 204 or empty responses
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

export const api = {
  login: async (username: string, password: string) => {
    return request<{ token: string; user: any }>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getTickets: async (params?: { page?: number; limit?: number; search?: string; status?: string; category?: string; urgency?: string; sort?: string; order?: string; queue?: string }) => {
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
    return requestWithResponse<any[]>(path);
  },

  getTicketDetails: async (id: string) => {
    return request<any>(`tickets/${id}`);
  },

  createTicket: async (ticket: { title: string; description: string; category: string; urgency: string }) => {
    return request<any>('tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  },

  updateTicket: async (id: string, updates: any) => {
    return request<any>(`tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  postMessage: async (ticketId: string, content: string) => {
    return request<any>(`tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  uploadAttachment: async (ticketId: string, file: File) => {
    const formData = new FormData();
    formData.append('attachment', file);
    return request<any>(`tickets/${ticketId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  },

  getSearchHistory: async () => {
    return request<string[]>('users/me/search-history');
  },

  addSearchHistory: async (query: string) => {
    return request<string[]>('users/me/search-history', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  removeSearchHistory: async (query: string) => {
    return request<string[]>(`users/me/search-history?query=${encodeURIComponent(query)}`, {
      method: 'DELETE',
    });
  },

  clearSearchHistory: async () => {
    return request<string[]>('users/me/search-history', {
      method: 'DELETE',
    });
  },

  getSuggestions: async (query: string) => {
    return request<{ type: string; text: string; subtext?: string; ticketId?: string }[]>(
      `tickets/suggestions?q=${encodeURIComponent(query)}`
    );
  },
};
