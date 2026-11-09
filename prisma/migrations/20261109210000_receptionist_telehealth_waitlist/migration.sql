ALTER TYPE "UserRole" ADD VALUE 'DOCTOR';

CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'CONTACTED', 'BOOKED', 'CANCELLED');
CREATE TYPE "IntegrationChannel" AS ENUM ('SMS', 'GOOGLE_CALENDAR');
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
CREATE TYPE "IntegrationType" AS ENUM ('CONFIRMATION', 'RESCHEDULED', 'CANCELLATION', 'REMINDER', 'CALENDAR_SYNC');
ALTER TYPE "NotificationType" ADD VALUE 'WAITLIST_AVAILABLE';
ALTER TYPE "NotificationStatus" ADD VALUE 'PROCESSING';

ALTER TABLE "User"
ADD COLUMN "doctorId" TEXT,
ADD COLUMN "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "smsConsentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_doctorId_key" ON "User"("doctorId");

ALTER TABLE "Service"
ADD COLUMN "isOnlineConsultation" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Appointment"
ADD COLUMN "patientNote" VARCHAR(2000),
ADD COLUMN "staffNotes" VARCHAR(5000),
ADD COLUMN "videoRoomName" VARCHAR(100);

CREATE UNIQUE INDEX "Appointment_videoRoomName_key" ON "Appointment"("videoRoomName");

CREATE TABLE "AppointmentWaitlistEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "doctorId" TEXT,
    "fromDate" DATE NOT NULL,
    "throughDate" DATE NOT NULL,
    "notes" VARCHAR(1000),
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentWaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentWaitlistEntry_status_fromDate_throughDate_idx" ON "AppointmentWaitlistEntry"("status", "fromDate", "throughDate");
CREATE INDEX "AppointmentWaitlistEntry_patientId_status_idx" ON "AppointmentWaitlistEntry"("patientId", "status");
CREATE INDEX "AppointmentWaitlistEntry_serviceId_doctorId_status_idx" ON "AppointmentWaitlistEntry"("serviceId", "doctorId", "status");

CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "channel" "IntegrationChannel" NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationLog_idempotencyKey_key" ON "IntegrationLog"("idempotencyKey");
CREATE INDEX "IntegrationLog_status_createdAt_idx" ON "IntegrationLog"("status", "createdAt");
CREATE INDEX "IntegrationLog_appointmentId_channel_type_idx" ON "IntegrationLog"("appointmentId", "channel", "type");

ALTER TABLE "User"
ADD CONSTRAINT "User_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AppointmentWaitlistEntry"
ADD CONSTRAINT "AppointmentWaitlistEntry_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentWaitlistEntry"
ADD CONSTRAINT "AppointmentWaitlistEntry_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppointmentWaitlistEntry"
ADD CONSTRAINT "AppointmentWaitlistEntry_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IntegrationLog"
ADD CONSTRAINT "IntegrationLog_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
