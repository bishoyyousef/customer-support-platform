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

  return response.json() as Promise<T>;
}

export const api = {
  login: async (username: string, password: string) => {
    return request<{ token: string; user: any }>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getTickets: async () => {
    return request<any[]>('tickets');
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
  }
};
