# Assumptions and Known Limitations

## 1. Engineering Assumptions

1. **Local Evaluation Environment**: Assumes the application is evaluated in a local development environment where services run on default ports (`http://localhost:5000` for backend, `http://localhost:5173` for React portal, `http://localhost:4200` for Angular workspace).
2. **Mock Token Authentication**: Assumes session contexts are passed using a deterministic token convention (`mock-jwt-token-for-<username>`). This provides session state resolution without introducing external OAuth/JWT signing key dependencies.
3. **Pre-seeded Evaluation Password**: All pre-seeded accounts utilize the default password `password` to facilitate immediate local testing across customer, agent, and manager roles.
4. **Short Polling for Real-Time Synchronization**: Assumes a 5-second periodic short-polling interval in frontend detail views provides sufficient real-time interaction feedback without requiring WebSocket or Server-Sent Events (SSE) infrastructure.

---

## 2. Known Technical Limitations

1. **Flat-File Database Persistence Scope**: The `db.json` file-based atomic write engine (`db.json.tmp` -> `db.json`) guarantees data safety under single-instance Node process execution. It is not designed for distributed multi-server scaling across clustered cloud containers.
2. **Plaintext Password Storage**: Passwords in `db.json` are stored in plaintext for evaluator convenience. Production deployments would require bcrypt password hashing.
3. **Hardcoded API URLs in Client Code**: The baseline implementation references `http://localhost:5000/api` directly in frontend service files. (Environment variable extraction scheduled for Phase 2 remediation).
4. **Lack of Automated Unit Test Coverage**: The initial repository contains manual API test scripts (`api_test.ps1`, `persistence_test.js`) but lacks automated Jest/React Testing Library and Angular spec files. (Automated test suite additions scheduled for Phase 3–5 remediation).
5. **Fixed-Grid Responsiveness on Angular Ticket Detail**: The Angular ticket detail view utilizes a 3-column fixed grid layout (`200px 1fr 260px`) that requires responsive media query adjustments for small screen viewports. (Responsive polish scheduled for Phase 5 remediation).
