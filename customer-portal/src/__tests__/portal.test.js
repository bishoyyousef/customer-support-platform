import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock localStorage implementation for Node environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock();

// Helper functions mirroring AuthContext, TicketForm validation, and TicketList filtering
function validateTicketSubmission(title, description, category, urgency) {
  const errors = {};
  const categories = ['Billing', 'Technical', 'Account', 'Other'];
  const urgencies = ['Low', 'Medium', 'High'];

  if (!title || !title.trim()) {
    errors.title = 'Title is required.';
  } else if (title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters.';
  } else if (title.trim().length > 100) {
    errors.title = 'Title cannot exceed 100 characters.';
  }

  if (!description || !description.trim()) {
    errors.description = 'Description is required.';
  } else if (description.trim().length < 15) {
    errors.description = 'Description must be at least 15 characters.';
  } else if (description.trim().length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters.';
  }

  if (!categories.includes(category)) {
    errors.category = 'Invalid category.';
  }

  if (!urgencies.includes(urgency)) {
    errors.urgency = 'Invalid urgency.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function filterCustomerTickets(tickets, activeTab, selectedCategory, searchQuery) {
  return tickets.filter(t => {
    // 1. Tab filter
    if (activeTab === 'active' && t.status !== 'requires_attention' && t.status !== 'under_investigation') {
      return false;
    }
    if (activeTab === 'pending' && t.status !== 'pending_customer') {
      return false;
    }
    if (activeTab === 'resolved' && t.status !== 'resolved') {
      return false;
    }

    // 2. Category filter
    if (selectedCategory !== 'All' && t.category !== selectedCategory) {
      return false;
    }

    // 3. Search query filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const idMatch = t.id.toLowerCase().includes(q);
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q) || false;
      return idMatch || titleMatch || descMatch;
    }

    return true;
  });
}

function getCustomerStatusText(status) {
  switch (status) {
    case 'requires_attention': return 'Waiting on Support';
    case 'under_investigation': return 'Under Investigation';
    case 'pending_customer': return 'Waiting on You';
    case 'resolved': return 'Resolved';
    default: return status;
  }
}

function mockAuthLoginResponse(user, token) {
  if (user.role !== 'customer') {
    throw new Error('Unauthorized access: Only customer credentials can log into this portal.');
  }
  localStorage.setItem('support_platform_token', token);
  localStorage.setItem('support_platform_user', JSON.stringify(user));
  return { token, user };
}

function mockAuthLogout() {
  localStorage.removeItem('support_platform_token');
  localStorage.removeItem('support_platform_user');
}

describe('React Customer Portal Unit & Validation Test Suite', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Auth & Session Management Tests
  test('Auth session caching stores customer token and user payload', () => {
    const customerUser = { id: 'cust_1', username: 'alice', role: 'customer', name: 'Alice Johnson', email: 'alice@example.com' };
    const res = mockAuthLoginResponse(customerUser, 'mock-jwt-token-for-alice');
    
    assert.strictEqual(localStorage.getItem('support_platform_token'), 'mock-jwt-token-for-alice');
    assert.strictEqual(JSON.parse(localStorage.getItem('support_platform_user')).username, 'alice');
    assert.strictEqual(res.user.role, 'customer');
  });

  test('Auth session rejects agent and manager roles attempting portal login', () => {
    const agentUser = { id: 'agent_1', username: 'agent_charlie', role: 'agent', name: 'Charlie Davis', email: 'charlie@example.com' };
    
    assert.throws(() => {
      mockAuthLoginResponse(agentUser, 'mock-jwt-token-for-agent_charlie');
    }, /Only customer credentials can log into this portal/);

    assert.strictEqual(localStorage.getItem('support_platform_token'), null);
  });

  test('Logout clears session tokens from localStorage', () => {
    localStorage.setItem('support_platform_token', 'mock-token');
    localStorage.setItem('support_platform_user', JSON.stringify({ id: 'cust_1' }));
    
    mockAuthLogout();
    
    assert.strictEqual(localStorage.getItem('support_platform_token'), null);
    assert.strictEqual(localStorage.getItem('support_platform_user'), null);
  });

  // 2. Ticket Creation Form Validation Tests
  test('Ticket validation fails when title is less than 5 characters', () => {
    const res = validateTicketSubmission('Help', 'Valid description long enough', 'Billing', 'Low');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errors.title, 'Title must be at least 5 characters.');
  });

  test('Ticket validation fails when description is less than 15 characters', () => {
    const res = validateTicketSubmission('Valid Ticket Title', 'Too short', 'Billing', 'Low');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errors.description, 'Description must be at least 15 characters.');
  });

  test('Ticket validation passes with valid parameters', () => {
    const res = validateTicketSubmission('Double charge on invoice', 'I was billed twice for my subscription this month.', 'Billing', 'High');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(Object.keys(res.errors).length, 0);
  });

  // 3. Ticket List Filtering Tests
  test('Active tab includes requires_attention and under_investigation tickets', () => {
    const mockTickets = [
      { id: 'TKT-1001', status: 'requires_attention', category: 'Billing', title: 'Issue 1' },
      { id: 'TKT-1002', status: 'under_investigation', category: 'Technical', title: 'Issue 2' },
      { id: 'TKT-1003', status: 'pending_customer', category: 'Account', title: 'Issue 3' },
      { id: 'TKT-1004', status: 'resolved', category: 'Billing', title: 'Issue 4' }
    ];

    const activeList = filterCustomerTickets(mockTickets, 'active', 'All', '');
    assert.strictEqual(activeList.length, 2);
    assert.strictEqual(activeList[0].id, 'TKT-1001');
    assert.strictEqual(activeList[1].id, 'TKT-1002');
  });

  test('Pending tab includes pending_customer tickets', () => {
    const mockTickets = [
      { id: 'TKT-1001', status: 'requires_attention', category: 'Billing', title: 'Issue 1' },
      { id: 'TKT-1003', status: 'pending_customer', category: 'Account', title: 'Issue 3' }
    ];

    const pendingList = filterCustomerTickets(mockTickets, 'pending', 'All', '');
    assert.strictEqual(pendingList.length, 1);
    assert.strictEqual(pendingList[0].id, 'TKT-1003');
  });

  test('Category filter correctly restricts ticket list', () => {
    const mockTickets = [
      { id: 'TKT-1001', status: 'requires_attention', category: 'Billing', title: 'Issue 1' },
      { id: 'TKT-1002', status: 'requires_attention', category: 'Technical', title: 'Issue 2' }
    ];

    const billingList = filterCustomerTickets(mockTickets, 'active', 'Billing', '');
    assert.strictEqual(billingList.length, 1);
    assert.strictEqual(billingList[0].category, 'Billing');
  });

  test('Search query matches ticket ID, title, or description', () => {
    const mockTickets = [
      { id: 'TKT-1001', status: 'requires_attention', category: 'Billing', title: 'Double charge', description: 'Charged twice' },
      { id: 'TKT-1002', status: 'requires_attention', category: 'Technical', title: 'Login problem', description: 'Cannot log in' }
    ];

    const searchResult = filterCustomerTickets(mockTickets, 'active', 'All', 'double');
    assert.strictEqual(searchResult.length, 1);
    assert.strictEqual(searchResult[0].id, 'TKT-1001');
  });

  // 4. Customer-Facing Terminology Mapping Tests
  test('Customer status mapping translates internal status to customer-friendly wording', () => {
    assert.strictEqual(getCustomerStatusText('requires_attention'), 'Waiting on Support');
    assert.strictEqual(getCustomerStatusText('under_investigation'), 'Under Investigation');
    assert.strictEqual(getCustomerStatusText('pending_customer'), 'Waiting on You');
    assert.strictEqual(getCustomerStatusText('resolved'), 'Resolved');
  });
});
