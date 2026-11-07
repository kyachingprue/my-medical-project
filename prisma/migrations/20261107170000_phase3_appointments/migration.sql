CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TYPE "AppointmentStatus" RENAME VALUE 'SCHEDULED' TO 'CONFIRMED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';

ALTER TABLE "Appointment"
  ALTER COLUMN "patientId" DROP NOT NULL,
  ADD COLUMN "patientName" TEXT,
  ADD COLUMN "patientPhone" TEXT,
  ADD COLUMN "cancellationReason" VARCHAR(500),
  ADD COLUMN "createdById" TEXT;

UPDATE "Appointment" AS appointment
SET "patientName" = "User"."name",
    "patientPhone" = "User"."phone"
FROM "User"
WHERE appointment."patientId" = "User"."id";

UPDATE "Appointment"
SET "patientName" = 'Patient'
WHERE "patientName" IS NULL;

ALTER TABLE "Appointment"
  ALTER COLUMN "patientName" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'CONFIRMED',
  ADD CONSTRAINT "Appointment_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Appointment_doctorId_startAt_endAt_status_idx";
DROP INDEX IF EXISTS "Appointment_chairId_startAt_endAt_status_idx";
DROP INDEX IF EXISTS "Appointment_patientId_startAt_idx";

CREATE INDEX "Appointment_doctorId_startAt_status_idx"
  ON "Appointment"("doctorId", "startAt", "status");
CREATE INDEX "Appointment_chairId_startAt_status_idx"
  ON "Appointment"("chairId", "startAt", "status");
CREATE INDEX "Appointment_patientId_startAt_status_idx"
  ON "Appointment"("patientId", "startAt", "status");
CREATE INDEX "Appointment_status_startAt_idx"
  ON "Appointment"("status", "startAt");

ALTER TABLE "Appointment"
  ADD CONSTRAINT "prevent_doctor_booking_overlap"
    EXCLUDE USING GIST (
      "doctorId" WITH =,
      tstzrange("startAt", "endAt", '[)') WITH &&
    )
    WHERE ("status" <> 'CANCELLED'),
  ADD CONSTRAINT "prevent_chair_booking_overlap"
    EXCLUDE USING GIST (
      "chairId" WITH =,
      tstzrange("startAt", "endAt", '[)') WITH &&
    )
    WHERE ("status" <> 'CANCELLED');
