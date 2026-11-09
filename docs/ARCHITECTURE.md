# Architecture

## Runtime

- `src/app/[locale]` contains the localized App Router pages. `src/proxy.ts` delegates locale routing to `next-intl`.
- `src/app/api` contains route handlers. Protected handlers call `authorizeApi`, which verifies the Firebase session cookie through Firebase Admin and reads the role from Prisma.
- `src/lib/auth` contains session verification and role-based page guards.
- `src/lib/appointments` contains Dhaka-time conversion, available-slot generation, validation, analytics, and transactional booking workflows.
- `src/lib/management` contains schemas, audit helpers, and doctor locking shared by booking and leave writes.
- `src/lib/notifications` contains the Prisma-backed outbox and Brevo delivery.
- `prisma/schema.prisma` and sequential SQL migrations define the PostgreSQL data model.

## Authentication and authorization

The browser authenticates through Firebase. The server verifies ID tokens and creates a five-day HTTP-only, SameSite=Lax session cookie. The Firebase UID maps to a `User`; new public users are created as `PATIENT`. Server pages and APIs re-read the user's database role instead of trusting a client role.

## Appointment data and concurrency

Appointments reference patient (optional for guests), doctor, service, and chair. Slots are calculated using the service duration, the doctor's working hours and leave, Dhaka calendar boundaries, and chair occupancy. Booking transactions fail fast if another write holds the patient or doctor lock, then lock one available chair while checking its five-minute buffer. Concurrent requests for the same doctor or last available chair return a slot conflict instead of waiting until the transaction expires. PostgreSQL exclusion constraints reject overlapping doctor and chair intervals. Do not bypass these service methods for appointment writes.

## Notifications and audit

An eligible appointment change writes its notification record within the same database transaction. Email delivery is scheduled after the response, so a slow provider cannot delay or fail the appointment API response. Provider failure is recorded and does not roll back appointment data. A protected Vercel Cron route polls pending records as recovery for interrupted delivery attempts. Admins can inspect failures and retry them up to the configured attempt limit.

Audit records are written server-side in the same transaction as covered appointment and management changes. Admin audit reads are paginated and filtered. Ordinary APIs do not expose audit mutations.

## Localization and styling

Translations live in `messages/en.json` and `messages/bn.json`. Global styles and design tokens are in `src/app/globals.css`; the theme provider uses `next-themes`.
