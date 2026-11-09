ALTER TABLE "NotificationLog"
ALTER COLUMN "provider" SET DEFAULT 'BREVO';

UPDATE "NotificationLog"
SET "providerMessage" = 'Email provider changed to Brevo. Retry this notification to send it through the new provider.'
WHERE "status" = 'FAILED'
  AND "providerMessage" ILIKE '%resend%';

UPDATE "NotificationLog"
SET "provider" = 'BREVO'
WHERE "status" = 'FAILED'
  AND "provider" = 'RESEND';
