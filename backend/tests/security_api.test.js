const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('fs');
const path = require('path');

let PORT = 5005;
let BASE_URL = `http://localhost:${PORT}/api`;
const DB_PATH = path.join(__dirname, '../db.json');
const BACKUP_PATH = path.join(__dirname, '../db.json.bak');

let serverProcess = null;

function backupDb() {
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
  }
}

function restoreDb() {
  if (fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BACKUP_PATH, DB_PATH);
    fs.unlinkSync(BACKUP_PATH);
  }
}

async function isServerRunning(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(port, retries = 30) {
  for (let i = 0; i < retries; i++) {
    if (await isServerRunning(`http://localhost:${port}/`)) {
      return true;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

describe('Backend Security & Business Rules API Test Suite', () => {
  before(async () => {
    backupDb();
    
    // Check if backend server is already running on port 5000
    const running5000 = await isServerRunning('http://localhost:5000/');
    if (running5000) {
      PORT = 5000;
      BASE_URL = `http://localhost:${PORT}/api`;
    } else {
      PORT = 5005;
      BASE_URL = `http://localhost:${PORT}/api`;
      serverProcess = spawn(process.execPath, ['server.js'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: PORT.toString() },
        stdio: ['ignore', 'ignore', 'inherit']
      });
      const ok = await waitForServer(PORT);
      if (!ok) {
        throw new Error(`Server failed to start on port ${PORT}`);
      }
    }
  });

  after(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
    restoreDb();
  });

  // 1. Authentication Tests
  test('POST /api/auth/login with valid customer credentials returns 200 and token', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'password' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.token, 'mock-jwt-token-for-alice');
    assert.strictEqual(data.user.role, 'customer');
    assert.strictEqual(data.user.password, undefined); // Password stripped
  });

  test('POST /api/auth/login with valid agent credentials returns 200', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'agent_charlie', password: 'password' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.role, 'agent');
  });

  test('POST /api/auth/login with invalid password returns 401', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'wrongpassword' })
    });
    assert.strictEqual(res.status, 401);
  });

  // 2. Customer Data Isolation Tests
  test('GET /api/tickets as customer returns only tickets belonging to that customer', async () => {
    const res = await fetch(`${BASE_URL}/tickets`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-alice' }
    });
    assert.strictEqual(res.status, 200);
    const tickets = await res.json();
    assert.ok(Array.isArray(tickets));
    tickets.forEach(t => {
      assert.strictEqual(t.customerId, 'cust_1');
    });
  });

  test('GET /api/tickets/:id for unowned ticket returns 403 Forbidden for customer', async () => {
    // Alice (cust_1) trying to access Bob's or another ticket if unowned
    // Create ticket for Bob first
    const createRes = await fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-bob',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Bob Personal Ticket Title',
        description: 'Bob description for isolation testing',
        category: 'Account',
        urgency: 'Low'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const bobTicket = await createRes.json();

    // Alice tries to access Bob's ticket directly
    const accessRes = await fetch(`${BASE_URL}/tickets/${bobTicket.id}`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-alice' }
    });
    assert.strictEqual(accessRes.status, 403);
  });

  // 3. Internal Support Note Redaction Tests
  test('GET /api/tickets/:id redacts internal notes when requested by customer', async () => {
    // TKT-1001 contains internal notes in db.json
    const res = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-alice' }
    });
    assert.strictEqual(res.status, 200);
    const ticket = await res.json();
    assert.ok(Array.isArray(ticket.messages));
    const internalNotes = ticket.messages.filter(m => m.isInternal);
    assert.strictEqual(internalNotes.length, 0, 'Internal notes must be redacted for customers');
  });

  test('GET /api/tickets/:id includes internal notes when requested by support agent', async () => {
    const res = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-agent_charlie' }
    });
    assert.strictEqual(res.status, 200);
    const ticket = await res.json();
    const internalNotes = ticket.messages.filter(m => m.isInternal);
    assert.ok(internalNotes.length > 0, 'Internal notes must be visible to support agents');
  });

  // 4. Role Authorization Enforcement Tests
  test('POST /api/tickets/:id/notes returns 403 Forbidden for customer', async () => {
    const res = await fetch(`${BASE_URL}/tickets/TKT-1001/notes`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Unauthorized internal note attempt' })
    });
    assert.strictEqual(res.status, 403);
  });

  test('POST /api/tickets/:id/notes returns 200 for support agent', async () => {
    const res = await fetch(`${BASE_URL}/tickets/TKT-1001/notes`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-agent_charlie',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Agent legitimate internal note' })
    });
    assert.strictEqual(res.status, 200);
  });

  test('PATCH /api/tickets/:id reassigning to another agent returns 403 for agent, 200 for manager', async () => {
    // Agent Charlie trying to reassign TKT-1001 to Agent Diana (agent_2)
    const agentReassignRes = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-agent_charlie',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assignedTo: 'agent_2' })
    });
    assert.strictEqual(agentReassignRes.status, 403);

    // Manager Eve reassigning TKT-1001 to Agent Diana
    const managerReassignRes = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-manager_eve',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assignedTo: 'agent_2' })
    });
    assert.strictEqual(managerReassignRes.status, 200);
    const updatedTicket = await managerReassignRes.json();
    assert.strictEqual(updatedTicket.assignedTo, 'agent_2');
  });

  // 5. Validation & Lifecycle State Machine Tests
  test('POST /api/tickets with short title or description returns 400', async () => {
    const res = await fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Bad',
        description: 'Short',
        category: 'Billing',
        urgency: 'Low'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.errors && data.errors.length > 0);
  });

  test('PATCH /api/tickets/:id to resolved without resolutionSummary returns 400', async () => {
    const res = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-agent_charlie',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'resolved' })
    });
    assert.strictEqual(res.status, 400);
  });

  test('Customer reply to a ticket automatically reverts status to requires_attention', async () => {
    // 1. First resolve ticket as agent
    const resolveRes = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-agent_charlie',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'resolved',
        resolutionSummary: 'Issue settled and refund processed'
      })
    });
    assert.strictEqual(resolveRes.status, 200);

    // 2. Customer replies to resolved ticket
    const replyRes = await fetch(`${BASE_URL}/tickets/TKT-1001/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'I still have a question about this refund' })
    });
    assert.strictEqual(replyRes.status, 200);

    // 3. Verify status reverted to requires_attention
    const getRes = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-alice' }
    });
    const ticket = await getRes.json();
    assert.strictEqual(ticket.status, 'requires_attention');
  });
});
