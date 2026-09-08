# OWASP Top 10 Security Audit Checklist

## A01:2021-Broken Access Control
- [ ] Customers can only access their own tickets (`/api/tickets`).
- [ ] Customers cannot add/view internal notes.
- [ ] Only agents/managers can change ticket status/assignment.
- [ ] RBAC is strictly enforced across all endpoints.

## A02:2021-Cryptographic Failures
- [ ] Sensitive data (passwords) is hashed (bcrypt).
- [ ] Passwords are not returned in API responses.
- [ ] Communications should be over HTTPS in production.

## A03:2021-Injection
- [ ] No SQL/NoSQL injection vulnerabilities (Mongoose/MongoDB driver used safely).
- [ ] Input validation is applied to all incoming data.

## A04:2021-Insecure Design
- [ ] State transitions for tickets are validated (cannot transition invalid states).
- [ ] File uploads have strict type/extension validation.

## A05:2021-Security Misconfiguration
- [ ] CORS is configured appropriately.
- [ ] Express security headers (e.g., helmet) or appropriate configuration is used.
- [ ] Detailed stack traces are not exposed in production errors.

## A06:2021-Vulnerable and Outdated Components
- [ ] Automated dependency auditing (`npm audit`) runs in CI.
- [ ] No known high/critical vulnerabilities exist.

## A07:2021-Identification and Authentication Failures
- [ ] JWT tokens are used and properly validated.
- [ ] Token expiry and signing secrets are secure.

## A08:2021-Software and Data Integrity Failures
- [ ] CI/CD pipeline validates code integrity.

## A09:2021-Security Logging and Monitoring Failures
- [ ] High-risk actions (login, role change) are auditable (even if just basic logging for now).

## A10:2021-Server-Side Request Forgery (SSRF)
- [ ] Backend does not fetch external URLs based on user input.
