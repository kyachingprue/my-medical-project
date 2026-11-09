import assert from "node:assert/strict";
import test from "node:test";
import {buildAppointmentEmail,getNotificationSubject,isAppointmentReminderDue} from "./email";

test("includes the updated appointment details in a reschedule email", () => {
  const appointment = {
    id: "apt_123",
    patientId: "user_123",
    patientName: "Alice Patient",
    startAt: new Date("2026-11-07T10:30:00Z"),
    endAt: new Date("2026-11-07T11:00:00Z"),
    patient: {id: "user_123", name: "Alice Patient", email: "alice@example.com", phone: null},
    doctor: {id: "doc_123", name: "Dr. Ahsan"},
    service: {id: "svc_123", name: "Dental Cleaning", durationMinutes: 30},
    chair: {name: "Chair 2"},
  } as Parameters<typeof buildAppointmentEmail>[1];

  const result = buildAppointmentEmail("APPOINTMENT_RESCHEDULED", appointment);
  assert.equal(getNotificationSubject("APPOINTMENT_RESCHEDULED"), "Your SmileCraft appointment has been rescheduled");
  assert.match(result.text, /updated by the clinic/);
  assert.match(result.text, /Dental Cleaning/);
  assert.match(result.text, /Dr\. Ahsan/);
  assert.match(result.text, /Chair 2/);
  assert.match(result.html, /Duration:<\/strong> 30 minutes/);
});

test("returns a confirmation email subject and body", () => {
  const appointment = {
    id: "apt_123",
    patientId: "user_123",
    patientName: "Alice Patient",
    startAt: new Date("2026-11-07T10:30:00Z"),
    endAt: new Date("2026-11-07T11:00:00Z"),
    patient: {id: "user_123", name: "Alice Patient", email: "alice@example.com", phone: null},
    doctor: {id: "doc_123", name: "Dr. Ahsan"},
    service: {id: "svc_123", name: "Dental Cleaning", durationMinutes: 30},
    chair: {name: "Chair 2"},
  } as Parameters<typeof buildAppointmentEmail>[1];

  const result = buildAppointmentEmail("APPOINTMENT_CONFIRMATION", appointment);
  assert.equal(getNotificationSubject("APPOINTMENT_CONFIRMATION"), "Your SmileCraft appointment is confirmed");
  assert.match(result.html, /Alice Patient/);
  assert.match(result.text, /Dental Cleaning/);
});

test("escapes patient-controlled values in the HTML email", () => {
  const appointment = {
    id: "apt_123",
    patientId: "user_123",
    patientName: "<img src=x onerror=alert(1)>",
    startAt: new Date("2026-11-07T10:30:00Z"),
    endAt: new Date("2026-11-07T11:00:00Z"),
    patient: {id: "user_123", name: "<img src=x onerror=alert(1)>", email: "alice@example.com", phone: null},
    doctor: {id: "doc_123", name: "Dr. Ahsan"},
    service: {id: "svc_123", name: "Dental Cleaning", durationMinutes: 30},
  } as Parameters<typeof buildAppointmentEmail>[1];

  const result = buildAppointmentEmail("APPOINTMENT_CONFIRMATION", appointment);
  assert.doesNotMatch(result.html, /<img src=x/);
  assert.match(result.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("sends reminders only within the configured 24-hour window",()=>{
  const now=new Date("2026-11-09T12:00:00.000Z");
  assert.equal(isAppointmentReminderDue(new Date("2026-11-10T12:00:00.000Z"),now),true);
  assert.equal(isAppointmentReminderDue(new Date("2026-11-10T12:06:00.000Z"),now),false);
  assert.equal(isAppointmentReminderDue(new Date("2026-11-10T11:54:00.000Z"),now),false);
});
