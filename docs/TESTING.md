# Testing

## Available checks

Run from the repository root:

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm test
npm run build
```

`npm test` runs Node's built-in test runner through `tsx`. Current tests cover appointment request schemas, business-time calculations, management/time-off validation, and email template output. They do not make real Firebase, Resend, browser, or PostgreSQL integration calls.

## Acceptance smoke checks

With a configured development Firebase project and database:

1. Register a patient and confirm Firebase sends the verification email.
2. Sign in, open the patient dashboard, and confirm only the current patient's appointments are listed.
3. Seed doctor availability and attempt a booking during Friday, lunch, leave, outside hours, and outside the 30-day window; each must be rejected.
4. Book an available appointment; verify it appears in the database and that an outbox record is created for a registered patient.
5. Configure a verified Resend sender and check delivery. Then test with an absent/invalid provider configuration and confirm the appointment remains stored while the notification is marked failed.
6. Use Admin/Receptionist controls to cancel or reschedule and verify the corresponding notification and audit event.
7. Verify an Admin can open the notification and audit pages, while Patients and Receptionists cannot read the complete audit log.
8. Inspect the application at mobile, tablet, and desktop sizes and test the light, dark, and system themes.

Do not run concurrency tests against production or an unidentified shared Neon database. A real PostgreSQL concurrency acceptance test needs a dedicated disposable test database and isolated fixture data; it has not been run as part of the current code checks.
