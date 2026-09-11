# Customer Support Platform Monorepo

![Phase 7 Audit](https://img.shields.io/badge/Phase%207%20Audit-Completed-blue)
![Security Scanned](https://img.shields.io/badge/Security-Production%20Ready-success)
![Performance](https://img.shields.io/badge/Performance-Load%20Tested-success)

A production-grade, full-stack monorepo implementation of a multi-user customer support platform featuring a shared Node.js/Express REST API backend, a React Customer Portal, and an Angular Support Workspace.

---

## 🏗️ System Architecture & Engineering Highlights

This project is engineered as a decoupled, multi-client ecosystem:

```text
                      ┌─────────────────────────────────────────┐
                      │    Shared Node/Express REST API Server  │
                      │         JWT Auth + Bcrypt Hashing       │
                      └────────────────────┬────────────────────┘
                                           │ (Mongoose/MongoDB Node Driver)
                                           ▼
                                 ┌───────────────────┐
                                 │   MongoDB Atlas   │
                                 │ Cloud Persistence │
                                 └───────────────────┘
                                           ▲
                                           │ (HTTP + Socket.IO)
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
      ┌─────────────▼─────────────┐                 ┌─────────────▼─────────────┐
      │   React Customer Portal   │                 │  Angular Support Workspace│
      │         Vite + TS         │                 │         Angular 19        │
      │ (Customer: Alice / Bob)   │                 │ (Agent/Manager: Charlie/  │
      └───────────────────────────┘                 │  Diana / Eve)             │
                                                    └───────────────────────────┘
```

### 1. Persistent Shared REST API Backend (`/backend`)
* **MongoDB Atlas Persistence**: Fully migrated to cloud-native MongoDB Atlas for robust, transaction-safe data persistence. Includes strict failure handling (no silent memory fallback in production).
* **Robust Authentication (JWT + Bcrypt)**: Uses JSON Web Tokens (JWT) for secure, stateless session management, with `bcryptjs` hashing for all passwords.
* **Security Hardened**: Protected via `helmet`, `express-rate-limit`, strict environment-based CORS (for both Express and Socket.IO), and secure error handling preventing stack-trace leaks.
* **Role-Based Access Control (RBAC)**: Custom middlewares enforce session contexts via JWT. Non-owner customer sessions are prevented from viewing or modifying other tickets. Internal support notes (`isInternal: true`) are completely redacted from customer HTTP payloads.
* **Health & Readiness**: Exposes `/api/health` and `/api/ready` endpoints suitable for Kubernetes or cloud load-balancer probes.

### 2. React Customer Portal (`/customer-portal`)
* **Vite & TypeScript**: Engineered using React 18, TypeScript, and React Router v6.
* **Auth Session Caching**: Tracks customer logins via secure JWT storage. Route guards (`ProtectedRoute`) enforce authentication.
* **Real-time Updates**: Integrates Socket.IO for live ticket timeline updates.

### 3. Angular Support Workspace (`/support-workspace`)
* **Angular 19 Standalone Architecture**: Fully modular standalone component tree protected by `authGuard` and `roleGuard`.
* **High-Density Operational Dashboard**: Uses RxJS streams combined via `combineLatest` to instantly re-filter, search, and sort queues without reloading.
* **Manager Resource Analytics**: Accessible only by manager accounts (`/manager`), providing workload allocation charts, unresolved metrics, and agent assignment controls.

---

## 🔑 Evaluator Profiles

All pre-seeded test profiles share the default evaluation password: **`password`**

| Persona | Username | Full Name | Role | Accessible Client Application |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `alice` | Alice Johnson | Customer | React Customer Portal |
| **Customer** | `bob` | Bob Smith | Customer | React Customer Portal |
| **Agent** | `agent_charlie` | Charlie Davis | Agent | Angular Support Workspace |
| **Manager** | `manager_eve` | Eve Foster | Manager | Angular Support Workspace |

---

## 🚀 Deployment & Environment Setup

This platform requires the following external dependencies for production deployment:
1. **MongoDB Atlas Cluster** (or compatible MongoDB instance).
2. **Persistent Storage Volume** mapped to `/backend/uploads` for attachment storage (or migration to S3 if ephemeral).

### 1. Environment Configuration

You must create a `.env` file in the root directory (or inject these directly into your CI/CD pipeline). See `.env.example` for the template.

**Required Production Variables (`backend/.env`):**
```ini
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-address>/<dbname>?retryWrites=true&w=majority
MONGODB_DB_NAME=customer_support
PORT=5000
NODE_ENV=production
JWT_SECRET=<your-strong-random-64-char-secret>
ALLOWED_ORIGINS=https://customer.yourdomain.com,https://support.yourdomain.com
```

**Required Frontend Variables:**
* React (`customer-portal/.env`): `VITE_API_BASE_URL=https://api.yourdomain.com/api`
* Angular (`support-workspace/src/environments/environment.prod.ts`): `apiUrl: 'https://api.yourdomain.com/api'`

### 2. Production Build & Start Commands

**Backend:**
```bash
cd backend
npm install --omit=dev
node server.js
```

**React Customer Portal:**
```bash
cd customer-portal
npm install
npm run build
# Serve the `/dist` folder using Nginx, Caddy, or an S3/Cloudfront bucket
```

**Angular Support Workspace:**
```bash
cd support-workspace
npm install
npm run build --configuration=production
# Serve the `/dist/support-workspace/browser` folder using Nginx, Caddy, or S3
```

---

## 🧪 Automated Testing

The monorepo contains comprehensive test suites:

```bash
npm run install:all

# Run all tests
npm test

# Run individual suites
npm run test:backend
npm run test:portal
npm run test:workspace
```

### Performance & Security
* **Performance Testing**: A K6 load test script is available in `perf/load_test.js`. Run with `k6 run perf/load_test.js` targeting a staging environment.
* **Security Audits**: Run `npm run audit:security` to execute OWASP checks against the production dependencies.
