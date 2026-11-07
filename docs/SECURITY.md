# Security notes

## Verified implementation

- Firebase ID tokens are verified server-side before session-cookie issuance; Firebase session cookies are checked for revocation.
- Session cookies are HTTP-only, SameSite=Lax, and Secure in production.
- Logout clears the cookie and asks Firebase Admin to revoke the user's refresh tokens, invalidating that user's other sessions as well.
- Protected API routes authorize using the user's database role. Public account provisioning only creates patient-role records.
- Appointment reads for Patients include an ownership condition; write inputs are validated with Zod and prices/durations are loaded from the database.
- Doctor and chair locks, PostgreSQL exclusion constraints, and transactional slot checks protect appointment writes.
- Audit reads and notification retry require Admin authorization. Audit rows are created by server code.
- `.env*`, `node_modules`, `.next`, and service-account `.pem` files are ignored. No credential file is included in the repository snapshot.
- Global response headers include `nosniff`, frame denial, a strict referrer policy, a restrictive permissions policy, and production HSTS.
- Email HTML interpolations are escaped; provider errors are stored as a bounded safe status instead of raw provider response content.

## Remaining production controls

- No distributed rate limiter is configured for auth or sensitive routes. Add a shared rate-limit service (or a database-backed limiter with operational safeguards) before public launch.
- There is no strict Content Security Policy. A correct policy must account for Next.js nonce handling, Firebase Auth/Google popup origins, and any clinic assets; validate it in report-only mode before enforcing.
- No independent penetration test or external security review has been performed.
- Email, database, and Firebase production credentials/domains still require configuration and verification.
- Appointment reminders are not implemented. The outbox poller runs only after Vercel deployment with a configured `CRON_SECRET`; failed messages still require Admin review and retry.
- The database audit table is append-only through the application API, but database administrators can still modify records directly. Restrict production database access and consider an external immutable audit sink for stronger tamper evidence.

Review these items before representing the system as production-ready. Never print or commit actual credentials, ID tokens, or service-account private keys.
