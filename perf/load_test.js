import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const apiResponseTime = new Trend('api_response_time', true);
const errorRate = new Rate('error_rate');

export const options = {
  // A realistic load curve simulating traffic up to 1,000 users
  stages: [
    { duration: '10s', target: 200 }, // Ramp-up to 200 users
    { duration: '15s', target: 1000 }, // Spike to 1,000 users
    { duration: '15s', target: 1000 }, // Sustain 1,000 users
    { duration: '10s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    // Explicit acceptance target: <= 100ms API response time
    'api_response_time': ['p(50)<=100', 'p(95)<=100', 'p(99)<=150'],
    'error_rate': ['rate<0.01'], // Less than 1% error rate
  },
};

const BASE_URL = 'http://localhost:5000/api';

export function setup() {
  // Login once to get an authentication token to be used by all VUs
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    username: 'agent_charlie',
    password: 'password'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (loginRes.status !== 200) {
    throw new Error('Setup failed: Login unsuccessful. Make sure backend is running and db is seeded.');
  }

  const token = loginRes.json('token');
  return { token };
}

export default function (data) {
  const headers = { 
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json'
  };

  // 1. Fetch tickets (simulating viewing the dashboard)
  const getTicketsRes = http.get(`${BASE_URL}/tickets?page=1&limit=20`, { headers });
  
  apiResponseTime.add(getTicketsRes.timings.duration);
  errorRate.add(getTicketsRes.status !== 200);

  check(getTicketsRes, {
    'GET /tickets is 200': (r) => r.status === 200,
  });

  // Short pause to simulate user think time
  sleep(Math.random() * 0.5 + 0.1); 

  // 2. Fetch specific ticket details (simulating clicking on a ticket)
  // Assuming TKT-1001 exists from the seed data
  const getTicketRes = http.get(`${BASE_URL}/tickets/TKT-1001`, { headers });
  
  apiResponseTime.add(getTicketRes.timings.duration);
  errorRate.add(getTicketRes.status !== 200);

  check(getTicketRes, {
    'GET /tickets/:id is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 0.5 + 0.1);
}
