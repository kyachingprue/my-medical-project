# Vercel deployment

Deployment has not been performed from this repository environment. Use the checklist below with a dedicated production Firebase project and Neon database.

1. Push the reviewed repository to a private or approved GitHub repository. Confirm `.env` and service-account files are not tracked.
2. Import the repository in Vercel and keep the standard Next.js build command (`npm run build`).
3. Configure all required production environment variables from `.env.example` in Vercel. Use the production Neon URL, Firebase Web settings, Firebase Admin credentials, `APP_URL`, and a Brevo API key plus verified `EMAIL_FROM` if email is enabled.
4. In Firebase Authentication, add the production hostname to Authorized domains and confirm Email/Password and Google providers are enabled.
5. Before migrations, back up production data and inspect the SQL and current migration history. Run `npx prisma migrate deploy` against the intended production `DATABASE_URL` as a controlled release step. Do not run `prisma migrate reset` or `prisma migrate dev` against production.
6. Deploy the application. Do not make the production deployment contingent on seed data; run `npm run db:seed` only if sample directory records are desired and after checking its upsert behavior and staff UID environment.
7. Verify the production domain, HTTPS, Firebase sign-in, role-specific route protection, appointment availability, and notification delivery with a controlled test account and appointment.
8. Monitor Vercel function logs, Neon connections, and Brevo transactional email logs. Do not share full logs publicly because they can contain operational data.

The repository includes a Vercel Cron schedule that calls `/api/cron/notifications` every five minutes. Set a high-entropy `CRON_SECRET` in Vercel so Vercel can send it as a bearer token; the route rejects calls when the secret is unset or incorrect. Verify the cron invocation and Brevo delivery after deployment. This job only processes pending outbox notifications; it does not send appointment reminders.

The Prisma schema currently uses `DATABASE_URL` for both runtime and migration access; there is no separate `DIRECT_URL` setting in the schema.
