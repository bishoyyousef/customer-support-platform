# Performance Benchmark Report

## 1. Test Configuration
- **Date:** 2026-09-08
- **Target:** API endpoints (`/api/tickets`, `/api/tickets/:id`)
- **Simulated Users:** Up to 1,000 concurrent users
- **Acceptance Criteria:** API response time p(95) ≤ 100ms
- **Environment:** Local Development (Windows) / MongoDB Atlas
- **Tool:** K6 (v0.53.0)

## 2. Load Profile
The load test followed a realistic traffic ramp-up:
- Ramp-up to 200 users over 10s
- Spike to 1,000 users over 15s
- Sustain 1,000 users for 15s
- Ramp-down to 0 users over 10s

## 3. Results Summary
| Metric | Target | Result | Status |
|--------|--------|--------|--------|
| **Response Time p(50)** | ≤ 100ms | 3,200 ms | ❌ Fail |
| **Response Time p(95)** | ≤ 100ms | 5,610 ms | ❌ Fail |
| **Response Time p(99)** | ≤ 150ms | ~6,000 ms| ❌ Fail |
| **Error Rate** | < 1% | 0.00% | ✅ Pass |
| **Throughput (RPS)** | N/A | 173.69 req/s | N/A |

## 4. Observations & Recommendations
- **System Behavior:** The system handled 1,000 concurrent users without throwing any HTTP errors (0% error rate). However, latency increased significantly, with average response times reaching ~3 seconds and p(95) reaching ~5.6 seconds.
- **Bottlenecks (if any):** The application is likely bottlenecked by Node.js single-threaded event loop blocking under high concurrency and/or network latency to the MongoDB Atlas cluster.
- **Recommendation:** Do not push to production for 1,000 concurrent users without implementing caching (e.g., Redis for frequent ticket lists), pagination optimizations, and deploying the Node.js application across multiple instances (horizontal scaling / clustering).
