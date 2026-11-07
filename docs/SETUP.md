# Local setup

## Requirements

- Node.js supported by the installed Next.js 16 version
- A development Neon/PostgreSQL database
- A Firebase project with Email/Password and Google providers enabled
- Optional Resend account and verified sending domain for email delivery

## Environment

Copy `.env.example` to `.env` and replace placeholders:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL URL used by Prisma runtime and migration commands |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key (public project identifier) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project identifier for the Web SDK |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web app identifier |
| `FIREBASE_PROJECT_ID` | Firebase Admin project identifier (server only) |
| `FIREBASE_CLIENT_EMAIL` | Service-account email (server only) |
| `FIREBASE_PRIVATE_KEY` | Service-account private key (server only); `\\n` sequences are expanded by the Admin initialization |
| `RESEND_API_KEY` | Optional Resend API secret (server only) |
| `EMAIL_FROM` | Sender identity verified by Resend |
| `APP_URL` | Canonical application URL used in email links |
| `CLINIC_NAME` | Email clinic display name |
| `CRON_SECRET` | Random bearer secret authorizing Vercel Cron to process pending outbox notifications |
| `SEED_ADMIN_UID` | Optional Firebase UID of a trusted Admin provisioned outside public registration |
| `SEED_RECEPTIONIST_UID` | Optional Firebase UID of a trusted Receptionist provisioned outside public registration |

Do not add real credentials to `.env.example`, source control, or client-exposed `NEXT_PUBLIC_` variables. Keep development and production databases and Firebase projects separate.

## Firebase

1. Create a Firebase project and register a Web app.
2. Enable Email/Password and Google in Authentication → Sign-in method.
3. Add local development hostnames (usually `localhost`) under Authentication → Settings → Authorized domains.
4. Copy the Web app identifiers to the `NEXT_PUBLIC_FIREBASE_*` variables.
5. Create a service account with the Firebase Admin SDK permissions required for Authentication, then set the three server-only `FIREBASE_*` values.
6. Never download or commit a service-account JSON file. For a multiline private key stored as an environment variable, preserve line breaks or use escaped `\\n`.

The actual Admin variable names consumed in this repository are `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

## Database and seed data

For a new development database:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` is intended for development. It may create migrations interactively. To apply already-reviewed migrations to a database, use `npm run db:deploy` only after confirming `DATABASE_URL`. The seed script upserts sample doctors, services, hours, chairs, and optionally trusted staff roles; it does not create password credentials or public Admin registration.

For the optional staff accounts, first create the accounts in Firebase Console, then set their UIDs in the environment and run the seed script.
