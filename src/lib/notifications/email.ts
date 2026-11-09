import {IntegrationType,NotificationStatus,NotificationType,type Prisma} from "@prisma/client";
import {after} from "next/server";
import {prisma} from "@/lib/prisma";
import {queueAppointmentIntegrations} from "@/lib/integrations/appointments";

type AppointmentNotificationType =
  | "APPOINTMENT_CONFIRMATION"
  | "APPOINTMENT_CANCELLATION"
  | "APPOINTMENT_RESCHEDULED"
  | "DOCTOR_LEAVE"
  | "APPOINTMENT_REMINDER"
  | "WAITLIST_AVAILABLE";

type NotificationContext = {
  type: AppointmentNotificationType;
  appointment: Prisma.AppointmentGetPayload<{
    include: {
      patient: {select: {id: true; name: true; email: true; phone: true}};
      doctor: {select: {id: true; name: true}};
      service: {select: {id: true; name: true; durationMinutes: true}};
      chair: {select: {name: true}};
    };
  }>;
  userId?: string | null;
  recipientEmail?: string | null;
  idempotencyKey?:string;
};

const clinicName = process.env.CLINIC_NAME ?? "SmileCraft Dental Clinic";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export async function createAppointmentNotification(tx:Prisma.TransactionClient,{type,appointment,userId,recipientEmail,idempotencyKey:providedIdempotencyKey}: NotificationContext) {
  if (!appointment?.id || !recipientEmail) return null;
  const idempotencyKey = providedIdempotencyKey??`${appointment.id}:${type}:${appointment.updatedAt.toISOString()}`;
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

export async function queueDueAppointmentReminders(now=new Date(),windowMinutes=5) {
  const windowMs=windowMinutes*60_000;
  const startAtMin=new Date(now.getTime()+24*60*60_000-windowMs);
  const startAtMax=new Date(now.getTime()+24*60*60_000+windowMs);
  const candidates=await prisma.appointment.findMany({
    where:{status:"CONFIRMED",patientId:{not:null},startAt:{gte:startAtMin,lte:startAtMax},patient:{email:{not:""}}},
    select:{id:true},
  });
  let queued=0;
  for(const candidate of candidates){
    const notificationId=await prisma.$transaction(async tx=>{
      const appointment=await tx.appointment.findFirst({
        where:{id:candidate.id,status:"CONFIRMED",startAt:{gte:startAtMin,lte:startAtMax}},
        include:{patient:{select:{id:true,name:true,email:true,phone:true,smsNotificationsEnabled:true}},doctor:{select:{id:true,name:true}},service:{select:{id:true,name:true,durationMinutes:true}},chair:{select:{name:true}}},
      });
      if(!appointment?.patient?.email)return null;
      const emailId=await createAppointmentNotification(tx,{
        type:"APPOINTMENT_REMINDER",
        appointment,
        userId:appointment.patient.id,
        recipientEmail:appointment.patient.email,
        idempotencyKey:`${appointment.id}:APPOINTMENT_REMINDER:${appointment.startAt.toISOString()}`,
      });
      await queueAppointmentIntegrations(tx,appointment,IntegrationType.REMINDER,{
        phone:appointment.patient.phone,
        smsEnabled:appointment.patient.smsNotificationsEnabled,
        calendar:false,
      });
      return emailId;
    });
    if(notificationId)queued++;
  }
  return queued;
}

export async function processPendingNotifications(limit = 20) {
  await prisma.notificationLog.updateMany({
    where:{status:NotificationStatus.PROCESSING,updatedAt:{lt:new Date(Date.now()-15*60_000)}},
    data:{status:NotificationStatus.PENDING,providerMessage:"Requeued after an interrupted email attempt."},
  });
  const records = await prisma.notificationLog.findMany({
    where: {status: NotificationStatus.PENDING},
    orderBy: {createdAt: "asc"},
    take: limit,
  });

  for (const record of records) {
    await processOneNotification(record.id);
  }

  return records.length;
}

export async function retryNotification(id: string) {
  const record = await prisma.notificationLog.findUnique({where: {id},include:{appointment:{select:{status:true,startAt:true}}}});
  if (!record) return null;
  if (record.status !== NotificationStatus.FAILED) return {error:"Only failed notifications can be retried.",status:409};
  if (record.attempts >= 5) return {error:"The retry limit has been reached.",status:409};
  if(record.type===NotificationType.APPOINTMENT_REMINDER&&(!record.appointment||record.appointment.status!=="CONFIRMED"||record.idempotencyKey!==`${record.appointmentId}:APPOINTMENT_REMINDER:${record.appointment.startAt.toISOString()}`||!isAppointmentReminderDue(record.appointment.startAt))){
    return {error:"This reminder is no longer eligible for delivery.",status:409};
  }
  const updated=await prisma.notificationLog.updateMany({
    where:{id:record.id,status:NotificationStatus.FAILED,updatedAt:record.updatedAt},
    data:{status:NotificationStatus.PENDING,providerMessage:null},
  });
  if(!updated.count)return {error:"This notification is already being retried.",status:409};
  return processOneNotification(record.id);
}

export async function deliverAppointmentNotification(id:string){
  return processOneNotification(id);
}

export function scheduleAppointmentNotification(id:string,event:"appointment confirmation"|"appointment reschedule"|"appointment cancellation"){
  after(async()=>{
    try{
      await deliverAppointmentNotification(id);
    }catch(error){
      console.error(`Could not deliver ${event} email:`,error);
    }
  });
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
    case "WAITLIST_AVAILABLE":
      return "An appointment has opened for your requested care";
    default:
      return "SmileCraft appointment update";
  }
}

export function buildAppointmentEmail(type: AppointmentNotificationType, appointment: NotificationContext["appointment"],recipientName?:string) {
  const patientName = recipientName??appointment.patient?.name ?? appointment.patientName ?? "Patient";
  const doctorName = appointment.doctor?.name ?? "Your doctor";
  const serviceName = appointment.service?.name ?? "selected service";
  const durationMinutes=appointment.service?.durationMinutes;
  const chairName=appointment.chair?.name??"Clinic team";
  const appointmentDate = new Intl.DateTimeFormat("en-BD", {timeZone: "Asia/Dhaka", dateStyle: "full"}).format(new Date(appointment.startAt));
  const appointmentTime = new Intl.DateTimeFormat("en-BD", {timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true}).format(new Date(appointment.startAt));
  const subject = getNotificationSubject(type);
  const bodyMap = {
    confirmation: `Hello ${patientName},\n\nYour appointment with ${doctorName} for ${serviceName} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
    cancellation: `Hello ${patientName},\n\nYour appointment with ${doctorName} for ${serviceName} scheduled for ${appointmentDate} at ${appointmentTime} has been cancelled.`,
    rescheduled: `Hello ${patientName},\n\nYour appointment has been updated by the clinic. Your new appointment is ${serviceName} with ${doctorName} on ${appointmentDate} at ${appointmentTime}${durationMinutes?` for ${durationMinutes} minutes`:""}${appointment.chair?.name?` at ${chairName}`:""}.`,
    reminder: `Hello ${patientName},\n\nThis is a reminder that you have an appointment with ${doctorName} for ${serviceName} on ${appointmentDate} at ${appointmentTime}.`,
    leave: `Hello ${patientName},\n\nWe are updating your appointment schedule. Please visit ${appUrl} for the latest information.`,
    waitlist:`Hello ${patientName},\n\nA ${serviceName} appointment with ${doctorName} has opened on ${appointmentDate} at ${appointmentTime}. This time is available on a first-come basis. Visit ${appUrl} to book it.`,
  } as const;
  const body = bodyMap[type === "APPOINTMENT_CONFIRMATION" ? "confirmation" : type === "APPOINTMENT_CANCELLATION" ? "cancellation" : type === "APPOINTMENT_RESCHEDULED" ? "rescheduled" : type === "APPOINTMENT_REMINDER" ? "reminder" : type === "WAITLIST_AVAILABLE" ? "waitlist" : "leave"];

  const htmlEscape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));
  const safeBody=htmlEscape(body).replace(/\n/g,"<br>");
  const safeClinicName=htmlEscape(clinicName);
  const safeSubject=htmlEscape(subject);
  const safePatientName=htmlEscape(patientName);
  const safeDoctorName=htmlEscape(doctorName);
  const safeServiceName=htmlEscape(serviceName);
  const safeChairName=htmlEscape(chairName);
  const safeAppUrl=htmlEscape(appUrl);
  const appointmentDuration=durationMinutes?`<br><strong>Duration:</strong> ${durationMinutes} minutes`:"";
  const appointmentChair=appointment.chair?.name?`<br><strong>Chair:</strong> ${safeChairName}`:"";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeSubject}</title></head><body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,sans-serif;color:#1f2937"><div style="max-width:640px;margin:32px auto;padding:24px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb"><div style="margin-bottom:20px"><div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0f766e;font-weight:700">SmileCraft</div><div style="font-size:20px;font-weight:700;color:#111827">${safeClinicName}</div></div><h1 style="margin:0 0 16px;font-size:28px;color:#111827">${safeSubject}</h1><p style="margin:0 0 16px;line-height:1.7;font-size:16px">${safeBody}</p><div style="background:#f8fafc;border:1px solid #dbeafe;border-radius:12px;padding:16px;margin-top:20px"><div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Appointment details</div><div style="font-size:15px;line-height:1.7"><strong>Patient:</strong> ${safePatientName}<br><strong>Doctor:</strong> ${safeDoctorName}<br><strong>Service:</strong> ${safeServiceName}<br><strong>When:</strong> ${appointmentDate} at ${appointmentTime}${appointmentDuration}${appointmentChair}</div></div><p style="margin-top:20px;color:#475569;line-height:1.6">For help, please contact the clinic using the details on our website: <a href="${safeAppUrl}" style="color:#0f766e">${safeAppUrl}</a>.</p></div></body></html>`;

  return {subject, html, text: body};
}

export function isAppointmentReminderDue(startAt:Date,now=new Date(),windowMinutes=5){
  const difference=startAt.getTime()-now.getTime();
  const target=24*60*60_000;
  return difference>=target-windowMinutes*60_000&&difference<=target+windowMinutes*60_000;
}

async function deliverNotification(id: string) {
  const record = await prisma.notificationLog.findUnique({where: {id}});
  if (!record) return null;
  if(record.type===NotificationType.APPOINTMENT_REMINDER&&record.status!==NotificationStatus.PROCESSING)return null;

  const appointment = record.appointmentId ? await prisma.appointment.findUnique({
    where: {id: record.appointmentId},
    include: {
      patient: {select: {id: true, name: true, email: true, phone: true}},
      doctor: {select: {id: true, name: true}},
      service: {select: {id: true, name: true, durationMinutes: true}},
      chair: {select: {name: true}},
    },
  }) : null;

  if(record.type===NotificationType.APPOINTMENT_REMINDER&&(!appointment||appointment.status!=="CONFIRMED"||record.idempotencyKey!==`${appointment.id}:APPOINTMENT_REMINDER:${appointment.startAt.toISOString()}`||!isAppointmentReminderDue(appointment.startAt))){
    const message="The appointment changed or the 24-hour reminder window has passed.";
    await prisma.notificationLog.update({where:{id},data:{status:NotificationStatus.FAILED,provider:"INTERNAL",providerMessage:message}});
    return {status:"failed" as const,id,error:message};
  }

  if (!appointment || !record.recipientEmail) {
    const message = "Appointment details or the patient's email address are unavailable.";
    await prisma.notificationLog.update({
      where: {id},
      data: {status: NotificationStatus.FAILED, provider:"BREVO", providerMessage: message, attempts: {increment: 1}},
    });
    return {status: "failed" as const, id, error: message};
  }

  const recipient=record.type===NotificationType.WAITLIST_AVAILABLE&&record.userId
    ?await prisma.user.findUnique({where:{id:record.userId},select:{name:true,email:true}})
    :null;
  if(record.type===NotificationType.WAITLIST_AVAILABLE&&(!recipient||recipient.email!==record.recipientEmail)){
    const message="Waiting list account or email address is no longer available.";
    await prisma.notificationLog.update({where:{id},data:{status:NotificationStatus.FAILED,provider:"INTERNAL",providerMessage:message,attempts:{increment:1}}});
    return {status:"failed" as const,id,error:message};
  }
  const payload = buildAppointmentEmail(record.type as AppointmentNotificationType, appointment,recipient?.name);
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    const message = "BREVO_API_KEY is not configured.";
    await prisma.notificationLog.update({
      where: {id},
      data: {status: NotificationStatus.FAILED, provider:"BREVO", providerMessage: message, attempts: {increment: 1}},
    });
    return {status: "failed" as const, id, error: message};
  }

  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    const message = "EMAIL_FROM is not configured. Set it to a sender address verified in Brevo.";
    await prisma.notificationLog.update({
      where: {id},
      data: {status: NotificationStatus.FAILED, provider:"BREVO", providerMessage: message, attempts: {increment: 1}},
    });
    return {status: "failed" as const, id, error: message};
  }

  const senderMatch=from.match(/^(.*?)\s*<([^<>]+)>$/);
  const senderEmail=(senderMatch?.[2]??from).trim();
  const senderName=senderMatch?.[1].trim().replace(/^["']|["']$/g,"")||clinicName;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)){
    const message="EMAIL_FROM must contain a valid sender email address verified in Brevo.";
    await prisma.notificationLog.update({
      where:{id},
      data:{status:NotificationStatus.FAILED,provider:"BREVO",providerMessage:message,attempts:{increment:1}},
    });
    return {status:"failed" as const,id,error:message};
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {email:senderEmail,name:senderName},
        to: [{email:record.recipientEmail}],
        subject: payload.subject,
        htmlContent: payload.html,
        textContent: payload.text,
      }),
    });

    if (!response.ok) {
      throw new Error(await getBrevoFailureMessage(response));
    }

    await prisma.notificationLog.update({
      where: {id},
      data: {
        status: NotificationStatus.SENT,
        provider: "BREVO",
        providerMessage: null,
        attempts: {increment: 1},
        sentAt: new Date(),
      },
    });
    return {status: "sent" as const, id};
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("Brevo rejected the email request")
      ? error.message
      : "Could not reach Brevo. Check outbound network access and try again.";
    await prisma.notificationLog.update({
      where: {id},
      data: {
        status: NotificationStatus.FAILED,
        provider: "BREVO",
        providerMessage: message,
        attempts: {increment: 1},
      },
    });
    return {status: "failed" as const, id, error: message};
  }
}

async function processOneNotification(id:string){
  const record=await prisma.notificationLog.findUnique({where:{id},select:{id:true,status:true,updatedAt:true}});
  if(!record||record.status!==NotificationStatus.PENDING)return null;
  const claim=await prisma.notificationLog.updateMany({
    where:{id,status:NotificationStatus.PENDING,updatedAt:record.updatedAt},
    data:{status:NotificationStatus.PROCESSING},
  });
  if(!claim.count)return {status:"skipped" as const};
  return deliverNotification(id);
}

async function getBrevoFailureMessage(response: Response) {
  const fallback = `Brevo rejected the email request (HTTP ${response.status}).`;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return fallback;
  }

  if (typeof payload !== "object" || payload === null || !("message" in payload) || typeof payload.message !== "string") {
    return fallback;
  }

  const message = payload.message.trim().slice(0, 500);
  return message ? `Brevo rejected the email request: ${message}` : fallback;
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
    case "WAITLIST_AVAILABLE":
      return NotificationType.WAITLIST_AVAILABLE;
    default:
      return NotificationType.APPOINTMENT_CONFIRMATION;
  }
}
