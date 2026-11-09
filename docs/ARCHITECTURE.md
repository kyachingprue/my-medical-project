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

## Patient clinical data

Health records and prescriptions are linked to a patient account and the staff member who entered them, with an optional appointment reference. The admin clinical-record API validates entries and writes an audit record transactionally. Patient dashboard queries always scope records to the authenticated patient's user ID; never expose these queries without role checks. Apply the corresponding Prisma migration before using these routes.

## Notifications and audit

An eligible appointment change writes its notification record within the same database transaction. Email delivery is scheduled after the response, so a slow provider cannot delay or fail the appointment API response. Provider failure is recorded and does not roll back appointment data. A protected Vercel Cron route polls pending records as recovery for interrupted delivery attempts. Admins can inspect failures and retry them up to the configured attempt limit.

The same cron processes the SMS and shared Google Calendar outboxes. SMS is queued only when a patient has opted in and has a valid phone number. Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` for Twilio; configure `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, and `GOOGLE_CALENDAR_ID` and share that calendar with the service account. Integration failures are logged separately and administrators can retry eligible deliveries from Notifications. Email and integration workers use conditional status claims and recover stale processing records to avoid concurrent duplicate sends.

Doctor accounts must first register with the email on their Doctor profile; an administrator then assigns the Doctor role, which links the account to that profile. Appointment waiting-list requests are patient-scoped and limited to the next 30 days. When an appointment is cancelled, matching requests are contacted by email in creation order; a waiting-list notification does not reserve the released slot, so the patient must book it normally. Patient notes and staff remarks have separate role checks.

Services explicitly marked as online consultations receive a unique Jitsi room per appointment. The join link is restricted to the assigned patient and doctor and shown only near the scheduled time. `meet.jit.si` is a public service: an unguessable room name is not equivalent to authenticated meeting-room access, and the clinic should account for that limitation before using it for sensitive consultations.

Audit records are written server-side in the same transaction as covered appointment and management changes. Admin audit reads are paginated and filtered. Ordinary APIs do not expose audit mutations.

## Localization and styling

Translations live in `messages/en.json` and `messages/bn.json`. Global styles and design tokens are in `src/app/globals.css`; the theme provider uses `next-themes`.
