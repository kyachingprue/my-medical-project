CREATE TABLE "PatientHealthRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "appointmentId" TEXT,
    "title" VARCHAR(160) NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientHealthRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "appointmentId" TEXT,
    "medication" VARCHAR(200) NOT NULL,
    "dosage" VARCHAR(120) NOT NULL,
    "frequency" VARCHAR(160) NOT NULL,
    "duration" VARCHAR(120) NOT NULL,
    "instructions" TEXT,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientHealthRecord_patientId_recordedAt_idx" ON "PatientHealthRecord"("patientId", "recordedAt");
CREATE INDEX "PatientHealthRecord_createdById_createdAt_idx" ON "PatientHealthRecord"("createdById", "createdAt");
CREATE INDEX "PatientHealthRecord_appointmentId_idx" ON "PatientHealthRecord"("appointmentId");
CREATE INDEX "Prescription_patientId_issuedAt_idx" ON "Prescription"("patientId", "issuedAt");
CREATE INDEX "Prescription_createdById_createdAt_idx" ON "Prescription"("createdById", "createdAt");
CREATE INDEX "Prescription_appointmentId_idx" ON "Prescription"("appointmentId");

ALTER TABLE "PatientHealthRecord"
ADD CONSTRAINT "PatientHealthRecord_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientHealthRecord"
ADD CONSTRAINT "PatientHealthRecord_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientHealthRecord"
ADD CONSTRAINT "PatientHealthRecord_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Prescription"
ADD CONSTRAINT "Prescription_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Prescription"
ADD CONSTRAINT "Prescription_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prescription"
ADD CONSTRAINT "Prescription_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
