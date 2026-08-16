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

// Helper functions mirroring AuthService, Guards, TicketService filtering, and Manager Metrics
function mockSupportLogin(user, token) {
  if (user.role !== 'agent' && user.role !== 'manager') {
    throw new Error('Unauthorized access: Only support employees can log into this workspace.');
  }
  localStorage.setItem('support_platform_token', token);
  localStorage.setItem('support_platform_user', JSON.stringify(user));
  return { token, user };
}

function mockSupportLogout() {
  localStorage.removeItem('support_platform_token');
  localStorage.removeItem('support_platform_user');
}

function isManagerUser(user) {
  return user ? user.role === 'manager' : false;
}

function evaluateAuthGuard(isAuthenticated) {
  if (isAuthenticated) return true;
  return { redirect: '/login' };
}

function evaluateRoleGuard(isAuthenticated, user) {
  if (isAuthenticated && isManagerUser(user)) return true;
  return { redirect: '/dashboard' };
}

function filterWorkspaceQueue(tickets, tab, category, search, sort, currentUser) {
  if (!currentUser) return [];

  let result = [...tickets];

  // 1. Tab Queues
  if (tab === 'attention') {
    result = result.filter(t => !t.assignedTo || t.status === 'requires_attention');
  } else if (tab === 'mine') {
    result = result.filter(t => t.assignedTo === currentUser.id);
  }

  // 2. Category filtering
  if (category !== 'All') {
    result = result.filter(t => t.category === category);
  }

  // 3. Search text matching (ID, title, customer name)
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    result = result.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q)
    );
  }

  // 4. Queue sorting
  result.sort((a, b) => {
    if (sort.startsWith('urgency')) {
      const urgencyWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
      const weightA = urgencyWeight[a.urgency] || 0;
      const weightB = urgencyWeight[b.urgency] || 0;
      return sort === 'urgency-desc' ? weightB - weightA : weightA - weightB;
    } else {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sort === 'date-desc' ? dateB - dateA : dateA - dateB;
    }
  });

  return result;
}

function calculateManagerMetrics(tickets, agents) {
  const totalTickets = tickets.length;
  const activeTickets = tickets.filter(t => t.status !== 'resolved').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const unassignedTickets = tickets.filter(t => !t.assignedTo).length;

  const activeAssignedCount = tickets.filter(t => t.assignedTo && t.status !== 'resolved').length;

  const agentWorkloads = agents.map(agent => {
    const activeCount = tickets.filter(t => t.assignedTo === agent.id && t.status !== 'resolved').length;
    const resolvedCount = tickets.filter(t => t.assignedTo === agent.id && t.status === 'resolved').length;
    const workloadPercent = activeAssignedCount > 0 ? (activeCount / activeAssignedCount) * 100 : 0;

    return {
      id: agent.id,
      name: agent.name,
      activeCount,
      resolvedCount,
      workloadPercent
    };
  });

  return {
    totalTickets,
    activeTickets,
    unassignedTickets,
    resolvedTickets,
    agentWorkloads
  };
}

function validateResolutionSummary(summary) {
  if (!summary || typeof summary !== 'string' || summary.trim().length < 10) {
    return { isValid: false, error: 'Summary must be at least 10 characters.' };
  }
  return { isValid: true };
}

describe('Angular Support Workspace Unit & Guard Test Suite', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Authentication & Role Handling
  test('Support login allows agent and manager roles and caches session', () => {
    const agentUser = { id: 'agent_1', username: 'agent_charlie', role: 'agent', name: 'Charlie Davis' };
    const managerUser = { id: 'mgr_1', username: 'manager_eve', role: 'manager', name: 'Eve Foster' };

    mockSupportLogin(agentUser, 'mock-jwt-token-for-agent_charlie');
    assert.strictEqual(localStorage.getItem('support_platform_token'), 'mock-jwt-token-for-agent_charlie');
    assert.strictEqual(isManagerUser(agentUser), false);

    mockSupportLogin(managerUser, 'mock-jwt-token-for-manager_eve');
    assert.strictEqual(localStorage.getItem('support_platform_token'), 'mock-jwt-token-for-manager_eve');
    assert.strictEqual(isManagerUser(managerUser), true);
  });

  test('Support login rejects customer credentials attempting workspace login', () => {
    const customerUser = { id: 'cust_1', username: 'alice', role: 'customer', name: 'Alice Johnson' };

    assert.throws(() => {
      mockSupportLogin(customerUser, 'mock-jwt-token-for-alice');
    }, /Only support employees can log into this workspace/);
  });

  test('Logout clears workspace session from localStorage', () => {
    localStorage.setItem('support_platform_token', 'mock-token');
    mockSupportLogout();
    assert.strictEqual(localStorage.getItem('support_platform_token'), null);
  });

  // 2. Auth Guard & Role Guard Evaluation
  test('authGuard permits authenticated users and redirects unauthenticated users', () => {
    assert.strictEqual(evaluateAuthGuard(true), true);
    const result = evaluateAuthGuard(false);
    assert.strictEqual(result.redirect, '/login');
  });

  test('roleGuard permits managers and redirects support agents to dashboard', () => {
    const managerUser = { id: 'mgr_1', role: 'manager' };
    const agentUser = { id: 'agent_1', role: 'agent' };

    assert.strictEqual(evaluateRoleGuard(true, managerUser), true);
    
    const agentResult = evaluateRoleGuard(true, agentUser);
    assert.strictEqual(agentResult.redirect, '/dashboard');
  });

  // 3. Operational Queue Filtering
  test('Requires Attention tab returns unassigned or requires_attention tickets', () => {
    const mockTickets = [
      { id: 'TKT-1001', status: 'requires_attention', assignedTo: 'agent_1', urgency: 'High', category: 'Billing', customerName: 'Alice' },
      { id: 'TKT-1002', status: 'under_investigation', assignedTo: null, urgency: 'Medium', category: 'Technical', customerName: 'Bob' },
      { id: 'TKT-1003', status: 'pending_customer', assignedTo: 'agent_1', urgency: 'Low', category: 'Account', customerName: 'Alice' }
    ];
    const agentUser = { id: 'agent_1', role: 'agent' };

    const attentionQueue = filterWorkspaceQueue(mockTickets, 'attention', 'All', '', 'urgency-desc', agentUser);
    assert.strictEqual(attentionQueue.length, 2);
    assert.ok(attentionQueue.some(t => t.id === 'TKT-1001'));
    assert.ok(attentionQueue.some(t => t.id === 'TKT-1002'));
  });

  test('My Workload tab filters tickets assigned to logged-in agent', () => {
    const mockTickets = [
      { id: 'TKT-1001', status: 'requires_attention', assignedTo: 'agent_1', urgency: 'High', category: 'Billing', customerName: 'Alice' },
      { id: 'TKT-1002', status: 'under_investigation', assignedTo: 'agent_2', urgency: 'Medium', category: 'Technical', customerName: 'Bob' }
    ];
    const agentUser = { id: 'agent_1', role: 'agent' };

    const myWorkload = filterWorkspaceQueue(mockTickets, 'mine', 'All', '', 'urgency-desc', agentUser);
    assert.strictEqual(myWorkload.length, 1);
    assert.strictEqual(myWorkload[0].id, 'TKT-1001');
  });

  test('Queue sorting orders tickets by urgency High to Low', () => {
    const mockTickets = [
      { id: 'TKT-1', urgency: 'Low', status: 'requires_attention', category: 'Other', customerName: 'X' },
      { id: 'TKT-2', urgency: 'High', status: 'requires_attention', category: 'Other', customerName: 'Y' },
      { id: 'TKT-3', urgency: 'Medium', status: 'requires_attention', category: 'Other', customerName: 'Z' }
    ];
    const agentUser = { id: 'agent_1', role: 'agent' };

    const sorted = filterWorkspaceQueue(mockTickets, 'all', 'All', '', 'urgency-desc', agentUser);
    assert.strictEqual(sorted[0].id, 'TKT-2'); // High
    assert.strictEqual(sorted[1].id, 'TKT-3'); // Medium
    assert.strictEqual(sorted[2].id, 'TKT-1'); // Low
  });

  // 4. Manager Workload Analytics Metrics
  test('Manager analytics computes workloads and active pool percentages correctly', () => {
    const mockTickets = [
      { id: 'TKT-1', status: 'under_investigation', assignedTo: 'agent_1' },
      { id: 'TKT-2', status: 'requires_attention', assignedTo: 'agent_1' },
      { id: 'TKT-3', status: 'under_investigation', assignedTo: 'agent_2' },
      { id: 'TKT-4', status: 'resolved', assignedTo: 'agent_2' },
      { id: 'TKT-5', status: 'requires_attention', assignedTo: null }
    ];
    const agents = [
      { id: 'agent_1', name: 'Charlie Davis' },
      { id: 'agent_2', name: 'Diana Evans' }
    ];

    const metrics = calculateManagerMetrics(mockTickets, agents);
    assert.strictEqual(metrics.totalTickets, 5);
    assert.strictEqual(metrics.activeTickets, 4);
    assert.strictEqual(metrics.unassignedTickets, 1);
    assert.strictEqual(metrics.resolvedTickets, 1);

    const charlieWorkload = metrics.agentWorkloads.find(a => a.id === 'agent_1');
    const dianaWorkload = metrics.agentWorkloads.find(a => a.id === 'agent_2');

    assert.strictEqual(charlieWorkload.activeCount, 2);
    assert.strictEqual(dianaWorkload.activeCount, 1);
    // Charlie has 2 out of 3 active assigned tickets = 66.66%
    assert.strictEqual(Math.round(charlieWorkload.workloadPercent), 67);
  });

  // 5. Resolution Modal Summary Validation
  test('Resolution summary requires minimum 10 characters', () => {
    const invalidRes = validateResolutionSummary('Short');
    assert.strictEqual(invalidRes.isValid, false);

    const validRes = validateResolutionSummary('Refunded secondary transaction on customer account.');
    assert.strictEqual(validRes.isValid, true);
  });
});
