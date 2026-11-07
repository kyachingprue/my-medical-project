# SmileCraft

SmileCraft is a localized dental-clinic appointment system built with Next.js, Firebase Authentication, PostgreSQL, and Prisma. The application supports patient self-service, receptionist booking operations, clinic management, appointment analytics, audit trails, and transactional email notifications.

## Features

- English and Bengali public pages and dashboards.
- Firebase email/password and Google sign-in, email verification, and server-verified session cookies.
- Database-backed `PATIENT`, `RECEPTIONIST`, and `ADMIN` roles.
- Doctor, service, chair, working-hours, and time-off management.
- Dhaka-time slot generation with service durations, clinic hours, lunch closure, and doctor leave.
- Patient booking, guest reception bookings, rescheduling, cancellation rules, and status changes.
- PostgreSQL exclusion constraints plus transaction locking for concurrent booking protection.
- Database-backed dashboards and Recharts analytics.
- Server-side audit records and an Admin audit-log interface.
- Transactional notification outbox, Resend delivery, Admin delivery status and bounded manual retry.
- Optional Vercel Cron polling for pending notification outbox records (requires `CRON_SECRET`).
- Light/dark theme provider and responsive layouts.

## Technology

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Firebase Web SDK and Firebase Admin SDK
- Neon PostgreSQL and Prisma 6
- Zod, React Hook Form, Recharts, Lucide, Framer Motion, next-intl, next-themes

## Quick start

1. Use a supported Node.js release and install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values described in [docs/SETUP.md](./docs/SETUP.md). Never commit `.env`.

3. Generate Prisma Client and apply development migrations to a **development database**:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

   For an existing migration history, use `npm run db:deploy` only after verifying that the configured URL points to the intended database. Never use `migrate reset` for production.

4. Optionally add the repeatable clinic directory and trusted staff accounts:

   ```bash
   npm run db:seed
   ```

   Seeded staff UIDs must refer to accounts already provisioned in Firebase. Public registration cannot grant staff roles.

5. Start the development server:

   ```bash
   npm run dev
   ```

The localized site is available at `/en` and `/bn`. Authentication pages are `/en/sign-in`, `/en/register`, and `/en/forgot-password`; role dashboards are under `/en/patient/dashboard`, `/en/receptionist/dashboard`, and `/en/admin/dashboard`.

## Roles and business rules

| Role | Main capabilities |
|---|---|
| Patient | Manage own profile and appointments, book available appointments, and cancel eligible future bookings |
| Receptionist | Search and manage clinic appointments, book for patients or guests, and view operational schedules |
| Admin | Manage clinic resources, review analytics, notifications, and audit events |

Clinic hours are 10:00–20:00 Saturday through Thursday, with a 13:00–14:00 lunch closure and Fridays closed. Appointment times use `Asia/Dhaka`, services determine appointment duration, and slots include a five-minute buffer. Booking is limited to 30 days ahead and two upcoming confirmed appointments per patient. Patients must cancel at least two hours before an appointment; staff can handle later cancellations.

## Documentation

- [Setup and Firebase configuration](./docs/SETUP.md)
- [Vercel deployment](./docs/DEPLOYMENT.md)
- [Architecture and data model](./docs/ARCHITECTURE.md)
- [Testing and acceptance checks](./docs/TESTING.md)
- [Security notes and remaining risks](./docs/SECURITY.md)

## Validation commands

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm test
npm run build
```

See [docs/TESTING.md](./docs/TESTING.md) for what these checks cover and which external-service or live-database tests still require separate setup.

## Deployment status and limitations

This repository is prepared for deployment, but no Vercel deployment or Firebase/Resend production configuration has been performed from this environment. Email delivery requires valid Resend configuration and a verified sender domain. Appointment reminders are not implemented. The included Vercel Cron only recovers pending outbox delivery attempts when configured. Refer to [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) before deploying.

Sample contact details and directory records are demonstration data and must be confirmed or replaced by the clinic before launch. The app does not claim production readiness until the manual setup and acceptance checks in the deployment and security guides are complete.
