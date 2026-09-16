import { Ticket, User, ManagerSummary, AgentWorkload, SummaryTotals, UrgencyBreakdown } from '../models';

export const DEMO_STORAGE_KEY = 'support_platform_demo_db';
export const DEMO_SEARCH_HISTORY_KEY = 'support_platform_demo_search_history';

export interface DemoDB {
  users: User[];
  tickets: Ticket[];
}

export const INITIAL_DEMO_USERS: User[] = [
  { id: 'cust_1', username: 'alice', role: 'customer', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 'cust_2', username: 'bob', role: 'customer', name: 'Bob Smith', email: 'bob@example.com' },
  { id: 'agent_1', username: 'agent_charlie', role: 'agent', name: 'Charlie Davis', email: 'charlie@example.com' },
  { id: 'agent_2', username: 'agent_diana', role: 'agent', name: 'Diana Evans', email: 'diana@example.com' },
  { id: 'mgr_1', username: 'manager_eve', role: 'manager', name: 'Eve Foster', email: 'eve@example.com' }
];

export const INITIAL_DEMO_TICKETS: Ticket[] = [
  {
    id: 'TKT-1001',
    title: 'Double charge on billing',
    description: 'I tried to subscribe to premium, but checkout failed while still charging my card. Please reverse the second charge of $49.',
    category: 'Billing',
    urgency: 'High',
    status: 'pending_customer',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'mgr_1',
    assignedName: 'Eve Foster',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-21T15:27:43.839Z',
    resolutionSummary: null,
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-03T10:00:00.000Z', actorName: 'Alice Johnson' },
      { type: 'assignment', message: 'Assigned to Charlie Davis', timestamp: '2026-08-03T11:00:00.000Z', actorName: 'Charlie Davis' },
      { type: 'note', message: 'Charlie Davis recorded an internal team note', timestamp: '2026-08-03T18:49:39.526Z', actorName: 'Charlie Davis' },
      { type: 'status_change', message: 'Status updated from \'requires_attention\' to \'under_investigation\' by Eve Foster', timestamp: '2026-08-21T15:25:18.467Z', actorName: 'Eve Foster' },
      { type: 'status_change', message: 'Status updated from \'requires_attention\' to \'pending_customer\' by Eve Foster', timestamp: '2026-08-21T15:27:33.036Z', actorName: 'Eve Foster' }
    ],
    messages: [
      { id: 'msg_1', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: 'I tried to subscribe to premium, but checkout failed while still charging my card. Please reverse the second charge of $49.', timestamp: '2026-08-03T10:00:00.000Z', isInternal: false },
      { id: 'msg_2', senderId: 'agent_1', senderName: 'Charlie Davis', senderRole: 'agent', content: 'Looking into this with our billing service details now.', timestamp: '2026-08-03T11:05:00.000Z', isInternal: true },
      { id: 'msg_3', senderId: 'agent_1', senderName: 'Charlie Davis', senderRole: 'agent', content: 'Hi Alice, let me double check our transaction ledger for you.', timestamp: '2026-08-03T11:10:00.000Z', isInternal: false }
    ]
  },
  {
    id: 'TKT-7639',
    title: 'Billing issue again',
    description: 'I have another invoice concern with my account billing details',
    category: 'Billing',
    urgency: 'Medium',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'agent_2',
    assignedName: 'Diana Evans',
    createdAt: '2026-08-03T18:49:39.570Z',
    updatedAt: '2026-08-03T18:49:39.884Z',
    resolutionSummary: 'Charge reversed and adjusted on standard invoice ledger.',
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-03T18:49:39.570Z', actorName: 'Alice Johnson' }
    ],
    messages: [
      { id: 'msg_7639_1', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: 'I have another invoice concern with my account billing details', timestamp: '2026-08-03T18:49:39.570Z', isInternal: false }
    ]
  },
  {
    id: 'TKT-8885',
    title: 'Billing issue again',
    description: 'I have another invoice concern with my account billing details',
    category: 'Billing',
    urgency: 'Medium',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'agent_2',
    assignedName: 'Diana Evans',
    createdAt: '2026-08-03T18:50:08.352Z',
    updatedAt: '2026-08-03T18:50:08.537Z',
    resolutionSummary: 'Charge reversed and adjusted on standard invoice ledger.',
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-03T18:50:08.352Z', actorName: 'Alice Johnson' }
    ],
    messages: [
      { id: 'msg_1785783008352', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: 'I have another invoice concern with my account billing details', timestamp: '2026-08-03T18:50:08.352Z', isInternal: false }
    ]
  },
  {
    id: 'TEST-7-1786826095189',
    title: 'Load Test Ticket 7',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-15T20:34:55.189Z',
    updatedAt: '2026-08-15T20:34:55.190Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-8-1786826095200',
    title: 'Load Test Ticket 8',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-15T20:34:55.200Z',
    updatedAt: '2026-08-15T20:34:55.200Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-4-1786826095206',
    title: 'Load Test Ticket 4',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-15T20:34:55.206Z',
    updatedAt: '2026-08-15T20:34:55.206Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-40-1786826095213',
    title: 'Load Test Ticket 40',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-15T20:34:55.213Z',
    updatedAt: '2026-08-15T20:34:55.213Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-42-1786826095217',
    title: 'Load Test Ticket 42',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'mgr_1',
    assignedName: 'Eve Foster',
    createdAt: '2026-08-15T20:34:55.217Z',
    updatedAt: '2026-08-17T18:13:32.719Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-6-1786826095224',
    title: 'Load Test Ticket 6',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'resolved',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'agent_1',
    assignedName: 'Charlie Davis',
    createdAt: '2026-08-15T20:34:55.224Z',
    updatedAt: '2026-08-17T18:12:12.245Z',
    resolutionSummary: 'it is solved',
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-29-1786826095228',
    title: 'Load Test Ticket 29',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-15T20:34:55.228Z',
    updatedAt: '2026-08-15T20:34:55.228Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-20-1786826095232',
    title: 'Load Test Ticket 20',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'mgr_1',
    assignedName: 'Eve Foster',
    createdAt: '2026-08-15T20:34:55.232Z',
    updatedAt: '2026-08-21T15:28:40.616Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-33-1786826095238',
    title: 'Load Test Ticket 33',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-15T20:34:55.238Z',
    updatedAt: '2026-08-15T20:34:55.238Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-36-1786826095243',
    title: 'Load Test Ticket 36',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-15T20:34:55.243Z',
    updatedAt: '2026-08-15T20:34:55.243Z',
    resolutionSummary: null,
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TEST-1-1786826095247',
    title: 'Load Test Ticket 1',
    description: 'This is a load test ticket data to check concurrent transactions.',
    category: 'Technical',
    urgency: 'Low',
    status: 'resolved',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'agent_1',
    assignedName: 'Charlie Davis',
    createdAt: '2026-08-15T20:34:55.247Z',
    updatedAt: '2026-08-17T17:59:34.995Z',
    resolutionSummary: 'i tried to do 1 2 3.......',
    activityTimeline: [],
    messages: []
  },
  {
    id: 'TKT-1797',
    title: 'password reset',
    description: "i can't reset my password",
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-17T18:04:03.218Z',
    updatedAt: '2026-08-17T18:04:03.218Z',
    resolutionSummary: null,
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-17T18:04:03.218Z', actorName: 'Alice Johnson' }
    ],
    messages: [
      { id: 'msg_1797_1', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: "i can't reset my password", timestamp: '2026-08-17T18:04:03.218Z', isInternal: false }
    ]
  },
  {
    id: 'TKT-4000',
    title: 'change password',
    description: "i can't change my password",
    category: 'Technical',
    urgency: 'Medium',
    status: 'resolved',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'agent_1',
    assignedName: 'Charlie Davis',
    createdAt: '2026-08-17T18:05:03.464Z',
    updatedAt: '2026-08-17T18:09:38.620Z',
    resolutionSummary: 'i solved it',
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-17T18:05:03.464Z', actorName: 'Alice Johnson' }
    ],
    messages: [
      { id: 'msg_4000_1', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: "i can't change my password", timestamp: '2026-08-17T18:05:03.464Z', isInternal: false }
    ]
  },
  {
    id: 'TKT-1327',
    title: 'password reset',
    description: 'hfhhfhfhjjjjjjjj',
    category: 'Billing',
    urgency: 'Medium',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-21T15:30:26.377Z',
    updatedAt: '2026-08-21T15:30:26.377Z',
    resolutionSummary: null,
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-21T15:30:26.377Z', actorName: 'Alice Johnson' }
    ],
    messages: [
      { id: 'msg_1787326226377', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: 'hfhhfhfhjjjjjjjj', timestamp: '2026-08-21T15:30:26.377Z', isInternal: false }
    ]
  }
];

export function getDemoDB(): DemoDB {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tickets) && Array.isArray(parsed.users)) {
        return parsed;
      }
      console.warn('[DemoStore] Stored Demo DB structure is invalid. Re-initializing from seed data.');
    }
  } catch (err) {
    console.warn('[DemoStore] Failed to read or parse saved Demo DB from localStorage. Re-initializing from seed data.', err);
  }

  const defaultDB: DemoDB = {
    users: INITIAL_DEMO_USERS,
    tickets: INITIAL_DEMO_TICKETS,
  };
  saveDemoDB(defaultDB);
  return defaultDB;
}

export function saveDemoDB(db: DemoDB): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('[DemoStore] Failed to save Demo DB to localStorage', err);
  }
}

export function resetDemoData(): void {
  const defaultDB: DemoDB = {
    users: INITIAL_DEMO_USERS,
    tickets: INITIAL_DEMO_TICKETS,
  };
  saveDemoDB(defaultDB);
  localStorage.removeItem(DEMO_SEARCH_HISTORY_KEY);
}

export function calculateManagerSummary(db: DemoDB): ManagerSummary {
  const tickets = db.tickets;
  const agents = db.users.filter(u => u.role === 'agent' || u.role === 'manager');

  const total = tickets.length;
  const active = tickets.filter(t => t.status !== 'resolved').length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;
  const pending = tickets.filter(t => t.status === 'pending_customer').length;
  const unassigned = tickets.filter(t => !t.assignedTo).length;
  const requiresAttention = tickets.filter(t => t.status === 'requires_attention').length;

  const totals: SummaryTotals = {
    total,
    active,
    resolved,
    pending,
    unassigned,
    requiresAttention,
  };

  const activeAssignedCount = tickets.filter(t => t.assignedTo && t.status !== 'resolved').length;

  const agentWorkloads: AgentWorkload[] = agents.map(agent => {
    const activeCount = tickets.filter(t => t.assignedTo === agent.id && t.status !== 'resolved').length;
    const resolvedCount = tickets.filter(t => t.assignedTo === agent.id && t.status === 'resolved').length;
    const workloadPercent = activeAssignedCount > 0 ? (activeCount / activeAssignedCount) * 100 : 0;

    return {
      id: agent.id,
      name: agent.name,
      activeCount,
      resolvedCount,
      workloadPercent: Math.round(workloadPercent),
    };
  });

  const urgencyBreakdown: UrgencyBreakdown = {
    High: tickets.filter(t => t.urgency === 'High' && t.status !== 'resolved').length,
    Medium: tickets.filter(t => t.urgency === 'Medium' && t.status !== 'resolved').length,
    Low: tickets.filter(t => t.urgency === 'Low' && t.status !== 'resolved').length,
  };

  return {
    totals,
    agentWorkloads,
    urgencyBreakdown,
  };
}
