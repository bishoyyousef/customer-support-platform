import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function waitForServer(port, retries = 60) {
  for (let i = 0; i < retries; i++) {
    if (await isServerRunning(`http://localhost:${port}/`)) {
      return true;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

describe('Backend Security & Business Rules API Test Suite', () => {
  before(async () => {
    backupDb();
    
    const isPortAvailable = (port) => new Promise(resolve => {
      const s = net.createServer();
      s.once('error', () => resolve(false));
      s.once('listening', () => { s.close(() => resolve(true)); });
      s.listen(port);
    });

    let testPort = 5005;
    while (!(await isPortAvailable(testPort)) && testPort < 5030) {
      testPort++;
    }

    PORT = testPort;
    BASE_URL = `http://localhost:${PORT}/api`;
    serverProcess = spawn(process.execPath, ['server.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: PORT.toString(), NODE_ENV: 'test', USE_MEMORY_DB: 'true' },
      stdio: ['ignore', 'ignore', 'inherit']
    });
    const ok = await waitForServer(PORT, 80);
    if (!ok) {
      throw new Error(`Server failed to start on port ${PORT}`);
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
    assert.strictEqual(typeof data.token, 'string');
    assert.ok(data.token.length > 20);
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

  // 5. Pagination, Search, Filter, and Sort Tests (Phase 1)
  test('GET /api/tickets?page=1&limit=2 returns pagination headers and at most 2 tickets', async () => {
    const res = await fetch(`${BASE_URL}/tickets?page=1&limit=2`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-agent_charlie' }
    });
    assert.strictEqual(res.status, 200);
    const tickets = await res.json();
    assert.ok(Array.isArray(tickets));
    assert.ok(tickets.length <= 2);
    
    assert.strictEqual(res.headers.get('x-pagination-page'), '1');
    assert.strictEqual(res.headers.get('x-pagination-limit'), '2');
    assert.ok(res.headers.get('x-pagination-total-count'));
    assert.ok(res.headers.get('x-pagination-total-pages'));
  });

  test('GET /api/tickets?search=alice filters by customerName or title', async () => {
    const res = await fetch(`${BASE_URL}/tickets?search=alice`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-agent_charlie' }
    });
    assert.strictEqual(res.status, 200);
    const tickets = await res.json();
    assert.ok(tickets.length > 0);
    tickets.forEach(t => {
      const matchName = t.customerName.toLowerCase().includes('alice');
      const matchTitle = t.title.toLowerCase().includes('alice');
      const matchId = t.id.toLowerCase().includes('alice');
      assert.ok(matchName || matchTitle || matchId);
    });
  });

  test('GET /api/tickets?category=Technical filters by category', async () => {
    const res = await fetch(`${BASE_URL}/tickets?category=Technical`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-agent_charlie' }
    });
    assert.strictEqual(res.status, 200);
    const tickets = await res.json();
    tickets.forEach(t => {
      assert.strictEqual(t.category, 'Technical');
    });
  });

  test('GET /api/tickets?queue=attention filters unassigned/attention tickets', async () => {
    const res = await fetch(`${BASE_URL}/tickets?queue=attention`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-agent_charlie' }
    });
    assert.strictEqual(res.status, 200);
    const tickets = await res.json();
    tickets.forEach(t => {
      assert.ok(!t.assignedTo || t.status === 'requires_attention');
    });
  });

  test('GET /api/tickets?sort=urgency&order=desc sorts High urgency first', async () => {
    const res = await fetch(`${BASE_URL}/tickets?sort=urgency&order=desc`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-agent_charlie' }
    });
    assert.strictEqual(res.status, 200);
    const tickets = await res.json();
    const urgencyWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
    for (let i = 0; i < tickets.length - 1; i++) {
      const wA = urgencyWeight[tickets[i].urgency] || 0;
      const wB = urgencyWeight[tickets[i+1].urgency] || 0;
      assert.ok(wA >= wB, `Ticket at ${i} urgency should be >= ticket at ${i+1}`);
    }
  });

  // 6. Attachment Upload, Download, and Security Tests (Phase 2)
  test('POST /api/tickets/:id/attachments uploads a file successfully and GET /api/attachments/:id downloads it', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['hello world attachment'], { type: 'text/plain' }), 'hello.txt');

    // 1. Alice uploads to TKT-1001
    const uploadRes = await fetch(`${BASE_URL}/tickets/TKT-1001/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-alice'
      },
      body: formData
    });
    assert.strictEqual(uploadRes.status, 201);
    const msg = await uploadRes.json();
    assert.ok(msg.attachment);
    assert.strictEqual(msg.attachment.filename, 'hello.txt');
    const attachmentId = msg.attachment.id;

    // 2. Alice downloads attachment using query token
    const downloadRes = await fetch(`${BASE_URL}/attachments/${attachmentId}?token=mock-jwt-token-for-alice`);
    assert.strictEqual(downloadRes.status, 200);
    const text = await downloadRes.text();
    assert.strictEqual(text, 'hello world attachment');

    // 3. Bob attempts to download Alice's attachment -> 403 Forbidden
    const bobDownloadRes = await fetch(`${BASE_URL}/attachments/${attachmentId}?token=mock-jwt-token-for-bob`);
    assert.strictEqual(bobDownloadRes.status, 403);
  });

  test('POST /api/tickets/:id/attachments returns 403 Forbidden for non-owner customer', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['unauthorized upload'], { type: 'text/plain' }), 'hack.txt');

    // Bob tries to upload to Alice's TKT-1001
    const res = await fetch(`${BASE_URL}/tickets/TKT-1001/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-bob'
      },
      body: formData
    });
    assert.strictEqual(res.status, 403);
  });

  test('POST /api/tickets/:id/attachments returns 400 for invalid file extensions', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['executable code'], { type: 'application/octet-stream' }), 'malicious.exe');

    const res = await fetch(`${BASE_URL}/tickets/TKT-1001/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-alice'
      },
      body: formData
    });
    assert.strictEqual(res.status, 400);
  });

  // 7. Phase 3: Backend Hardening Tests
  test('Resolved tickets block messages & notes, and enforce status transition matrix', async () => {
    // 1. Resolve TKT-1001
    const resolveRes = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-manager_eve',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'resolved',
        resolutionSummary: 'Issue resolved successfully by support team.'
      })
    });
    assert.strictEqual(resolveRes.status, 200);

    // 2. Agent posting message on resolved ticket -> 400 Bad Request
    const msgRes = await fetch(`${BASE_URL}/tickets/TKT-1001/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-agent_charlie',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Trying to reply to resolved ticket' })
    });
    assert.strictEqual(msgRes.status, 400);
    const msgData = await msgRes.json();
    assert.strictEqual(msgData.message, 'Cannot add messages to a resolved ticket. Reopen it first.');

    // 3. Post internal note on resolved ticket -> 400 Bad Request
    const noteRes = await fetch(`${BASE_URL}/tickets/TKT-1001/notes`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-agent_charlie',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Trying to add internal note to resolved ticket' })
    });
    assert.strictEqual(noteRes.status, 400);
    const noteData = await noteRes.json();
    assert.strictEqual(noteData.message, 'Cannot add internal notes to a resolved ticket. Reopen it first.');

    // 4. Invalid status transition: resolved -> under_investigation -> 400 Bad Request
    const invalidTransRes = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-manager_eve',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'under_investigation' })
    });
    assert.strictEqual(invalidTransRes.status, 400);

    // 5. Valid status transition (reopen): resolved -> requires_attention -> 200 OK
    const validTransRes = await fetch(`${BASE_URL}/tickets/TKT-1001`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-manager_eve',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'requires_attention' })
    });
    assert.strictEqual(validTransRes.status, 200);
    const reopenedTicket = await validTransRes.json();
    assert.strictEqual(reopenedTicket.status, 'requires_attention');
  });

  // 8. Phase 4: Manager Aggregation Tests
  test('GET /api/manager/summary returns 200 for manager and 403 for agent/customer', async () => {
    // 1. Customer -> 403 Forbidden
    const custRes = await fetch(`${BASE_URL}/manager/summary`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-alice' }
    });
    assert.strictEqual(custRes.status, 403);

    // 2. Support Agent -> 403 Forbidden
    const agentRes = await fetch(`${BASE_URL}/manager/summary`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-agent_charlie' }
    });
    assert.strictEqual(agentRes.status, 403);

    // 3. Manager -> 200 OK with aggregated metrics payload
    const mgrRes = await fetch(`${BASE_URL}/manager/summary`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-manager_eve' }
    });
    assert.strictEqual(mgrRes.status, 200);
    const summary = await mgrRes.json();
    assert.ok(summary.totals);
    assert.strictEqual(typeof summary.totals.total, 'number');
    assert.ok(Array.isArray(summary.agentWorkloads));
    assert.ok(summary.urgencyBreakdown);
  });

  // 9. User Search History MongoDB Persistence Tests
  test('User search history endpoints persist search queries in MongoDB user document', async () => {
    const getRes = await fetch(`${BASE_URL}/users/me/search-history`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-alice' }
    });
    assert.strictEqual(getRes.status, 200);
    const initialList = await getRes.json();
    assert.ok(Array.isArray(initialList));

    const addRes = await fetch(`${BASE_URL}/users/me/search-history`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-for-alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'billing' })
    });
    assert.strictEqual(addRes.status, 200);
    const updatedList = await addRes.json();
    assert.ok(updatedList.includes('billing'));

    const delRes = await fetch(`${BASE_URL}/users/me/search-history?query=billing`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-alice' }
    });
    assert.strictEqual(delRes.status, 200);
    const finalDelList = await delRes.json();
    assert.strictEqual(finalDelList.includes('billing'), false);
  });

  test('GET /api/tickets/suggestions returns matching ticket and category suggestions', async () => {
    const res = await fetch(`${BASE_URL}/tickets/suggestions?q=bill`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token-for-alice' }
    });
    assert.strictEqual(res.status, 200);
    const suggestions = await res.json();
    assert.ok(Array.isArray(suggestions));
    assert.ok(suggestions.some(s => s.type === 'category' && s.text === 'Billing'));
  });
});
