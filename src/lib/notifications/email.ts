import {NotificationStatus,NotificationType,type Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";

type AppointmentNotificationType =
  | "APPOINTMENT_CONFIRMATION"
  | "APPOINTMENT_CANCELLATION"
  | "APPOINTMENT_RESCHEDULED"
  | "DOCTOR_LEAVE"
  | "APPOINTMENT_REMINDER";

type NotificationContext = {
  type: AppointmentNotificationType;
  appointment: Prisma.AppointmentGetPayload<{
    include: {
      patient: {select: {id: true; name: true; email: true; phone: true}};
      doctor: {select: {id: true; name: true}};
      service: {select: {id: true; name: true; durationMinutes: true}};
    };
  }>;
  userId?: string | null;
  recipientEmail?: string | null;
};

const clinicName = process.env.CLINIC_NAME ?? "SmileCraft Dental Clinic";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export async function createAppointmentNotification(tx:Prisma.TransactionClient,{type,appointment,userId,recipientEmail}: NotificationContext) {
  if (!appointment?.id || !recipientEmail) return null;
  const idempotencyKey = `${appointment.id}:${type}:${appointment.updatedAt.toISOString()}`;
  const subject = getNotificationSubject(type);

  const record = await tx.notificationLog.upsert({
    where: {idempotencyKey},
    update: {},
    create: {
      idempotencyKey,
      appointmentId: appointment.id,
      userId: userId ?? appointment.patientId ?? null,
      type: toNotificationType(type),
      recipientEmail,
      subject,
      status: NotificationStatus.PENDING,
    },
  });

  return record.id;
}

export async function processPendingNotifications(limit = 20) {
  const records = await prisma.notificationLog.findMany({
    where: {status: NotificationStatus.PENDING},
    orderBy: {createdAt: "asc"},
    take: limit,
  });

  for (const record of records) {
    await deliverNotification(record.id);
  }

  return records.length;
}

export async function retryNotification(id: string) {
  const record = await prisma.notificationLog.findUnique({where: {id}});
  if (!record) return null;
  if (record.status !== NotificationStatus.FAILED) return {error:"Only failed notifications can be retried.",status:409};
  if (record.attempts >= 5) return {error:"The retry limit has been reached.",status:409};
  return deliverNotification(record.id);
}

export async function deliverAppointmentNotification(id:string){
  return deliverNotification(id);
}

export function getNotificationSubject(type: AppointmentNotificationType) {
  switch (type) {
    case "APPOINTMENT_CONFIRMATION":
      return "Your SmileCraft appointment is confirmed";
    case "APPOINTMENT_CANCELLATION":
      return "Your SmileCraft appointment has been cancelled";
    case "APPOINTMENT_RESCHEDULED":
      return "Your SmileCraft appointment has been rescheduled";
    case "DOCTOR_LEAVE":
      return "A change to your dental appointment schedule";
    case "APPOINTMENT_REMINDER":
      return "Reminder: your SmileCraft appointment is coming up";
    default:
      return "SmileCraft appointment update";
  }
}

export function buildAppointmentEmail(type: AppointmentNotificationType, appointment: NotificationContext["appointment"]) {
  const patientName = appointment.patient?.name ?? appointment.patientName ?? "Patient";
  const doctorName = appointment.doctor?.name ?? "Your doctor";
  const serviceName = appointment.service?.name ?? "selected service";
  const appointmentDate = new Intl.DateTimeFormat("en-BD", {timeZone: "Asia/Dhaka", dateStyle: "full"}).format(new Date(appointment.startAt));
  const appointmentTime = new Intl.DateTimeFormat("en-BD", {timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true}).format(new Date(appointment.startAt));
  const subject = getNotificationSubject(type);
  const bodyMap = {
    confirmation: `Hello ${patientName},\n\nYour appointment with ${doctorName} for ${serviceName} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
    cancellation: `Hello ${patientName},\n\nYour appointment with ${doctorName} for ${serviceName} scheduled for ${appointmentDate} at ${appointmentTime} has been cancelled.`,
    rescheduled: `Hello ${patientName},\n\nYour appointment with ${doctorName} for ${serviceName} has been rescheduled to ${appointmentDate} at ${appointmentTime}.`,
    reminder: `Hello ${patientName},\n\nThis is a reminder that you have an appointment with ${doctorName} for ${serviceName} on ${appointmentDate} at ${appointmentTime}.`,
    leave: `Hello ${patientName},\n\nWe are updating your appointment schedule. Please visit ${appUrl} for the latest information.`,
  } as const;
  const body = bodyMap[type === "APPOINTMENT_CONFIRMATION" ? "confirmation" : type === "APPOINTMENT_CANCELLATION" ? "cancellation" : type === "APPOINTMENT_RESCHEDULED" ? "rescheduled" : type === "APPOINTMENT_REMINDER" ? "reminder" : "leave"];

  const htmlEscape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));
  const safeBody=htmlEscape(body).replace(/\n/g,"<br>");
  const safeClinicName=htmlEscape(clinicName);
  const safeSubject=htmlEscape(subject);
  const safePatientName=htmlEscape(patientName);
  const safeDoctorName=htmlEscape(doctorName);
  const safeServiceName=htmlEscape(serviceName);
  const safeAppUrl=htmlEscape(appUrl);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeSubject}</title></head><body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,sans-serif;color:#1f2937"><div style="max-width:640px;margin:32px auto;padding:24px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb"><div style="margin-bottom:20px"><div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0f766e;font-weight:700">SmileCraft</div><div style="font-size:20px;font-weight:700;color:#111827">${safeClinicName}</div></div><h1 style="margin:0 0 16px;font-size:28px;color:#111827">${safeSubject}</h1><p style="margin:0 0 16px;line-height:1.7;font-size:16px">${safeBody}</p><div style="background:#f8fafc;border:1px solid #dbeafe;border-radius:12px;padding:16px;margin-top:20px"><div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Appointment details</div><div style="font-size:15px;line-height:1.7"><strong>Patient:</strong> ${safePatientName}<br><strong>Doctor:</strong> ${safeDoctorName}<br><strong>Service:</strong> ${safeServiceName}<br><strong>When:</strong> ${appointmentDate} at ${appointmentTime}</div></div><p style="margin-top:20px;color:#475569;line-height:1.6">For help, please contact the clinic using the details on our website: <a href="${safeAppUrl}" style="color:#0f766e">${safeAppUrl}</a>.</p></div></body></html>`;

  return {subject, html, text: body};
}

async function deliverNotification(id: string) {
  const record = await prisma.notificationLog.findUnique({where: {id}});
  if (!record) return null;

  const appointment = record.appointmentId ? await prisma.appointment.findUnique({
    where: {id: record.appointmentId},
    include: {
      patient: {select: {id: true, name: true, email: true, phone: true}},
      doctor: {select: {id: true, name: true}},
      service: {select: {id: true, name: true, durationMinutes: true}},
    },
  }) : null;

  if (!appointment || !record.recipientEmail) {
    await prisma.notificationLog.update({
      where: {id},
      data: {status: NotificationStatus.FAILED, providerMessage: "Appointment payload is unavailable for delivery.", attempts: {increment: 1}},
    });
    return null;
  }

  const payload = buildAppointmentEmail(record.type as AppointmentNotificationType, appointment);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    await prisma.notificationLog.update({
      where: {id},
      data: {status: NotificationStatus.FAILED, providerMessage: "RESEND_API_KEY is not configured.", attempts: {increment: 1}},
    });
    return null;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": record.idempotencyKey,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "SmileCraft <noreply@smilecraft.local>",
        to: [record.recipientEmail],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email provider returned HTTP ${response.status}.`);
    }

    await prisma.notificationLog.update({
      where: {id},
      data: {
        status: NotificationStatus.SENT,
        provider: "RESEND",
        providerMessage: null,
        attempts: {increment: 1},
        sentAt: new Date(),
      },
    });
    return {status: "sent", id};
  } catch (error) {
    const message = error instanceof Error && /^Email provider returned HTTP \d{3}\.$/.test(error.message)
      ? error.message
      : "Email delivery failed. Check the Resend configuration and provider dashboard.";
    await prisma.notificationLog.update({
      where: {id},
      data: {
        status: NotificationStatus.FAILED,
        provider: "RESEND",
        providerMessage: message,
        attempts: {increment: 1},
      },
    });
    return {status: "failed", id};
  }
}

function toNotificationType(value: AppointmentNotificationType): NotificationType {
  switch (value) {
    case "APPOINTMENT_CONFIRMATION":
      return NotificationType.APPOINTMENT_CONFIRMATION;
    case "APPOINTMENT_CANCELLATION":
      return NotificationType.APPOINTMENT_CANCELLATION;
    case "APPOINTMENT_RESCHEDULED":
      return NotificationType.APPOINTMENT_RESCHEDULED;
    case "DOCTOR_LEAVE":
      return NotificationType.DOCTOR_LEAVE;
    case "APPOINTMENT_REMINDER":
      return NotificationType.APPOINTMENT_REMINDER;
    default:
      return NotificationType.APPOINTMENT_CONFIRMATION;
  }
}
