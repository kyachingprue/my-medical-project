CREATE TABLE "ClinicSettings" (
    "id" TEXT NOT NULL DEFAULT 'clinic',
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT false,
    "announcement" VARCHAR(500),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicBusinessHours" (
    "dayOfWeek" "Weekday" NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "startTime" VARCHAR(5) NOT NULL DEFAULT '10:00',
    "endTime" VARCHAR(5) NOT NULL DEFAULT '20:00',
    "breakStart" VARCHAR(5),
    "breakEnd" VARCHAR(5),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicBusinessHours_pkey" PRIMARY KEY ("dayOfWeek")
);

INSERT INTO "ClinicSettings" ("id") VALUES ('clinic');

INSERT INTO "ClinicBusinessHours" ("dayOfWeek", "isOpen", "startTime", "endTime", "breakStart", "breakEnd")
VALUES
    ('SUNDAY', true, '10:00', '20:00', '13:00', '14:00'),
    ('MONDAY', true, '10:00', '20:00', '13:00', '14:00'),
    ('TUESDAY', true, '10:00', '20:00', '13:00', '14:00'),
    ('WEDNESDAY', true, '10:00', '20:00', '13:00', '14:00'),
    ('THURSDAY', true, '10:00', '20:00', '13:00', '14:00'),
    ('FRIDAY', false, '10:00', '20:00', NULL, NULL),
    ('SATURDAY', true, '10:00', '20:00', '13:00', '14:00');
