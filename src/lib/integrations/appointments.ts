import {createHash} from "node:crypto";
import {IntegrationChannel,IntegrationStatus,IntegrationType,type Appointment,type Prisma} from "@prisma/client";
import {JWT} from "google-auth-library";
import {prisma} from "@/lib/prisma";

type Channel=IntegrationChannel;
type Type=IntegrationType;
type IntegrationAppointment=Prisma.AppointmentGetPayload<{include:{
  patient:{select:{name:true,email:true,phone:true}};
  doctor:{select:{name:true}};
  service:{select:{name:true}};
  chair:{select:{name:true}};
}}>;

export async function queueAppointmentIntegrations(
  tx:Prisma.TransactionClient,
  appointment:Pick<Appointment,"id"|"updatedAt">,
  type:Type,
  options:{phone?:string|null;smsEnabled?:boolean;calendar?:boolean}={},
){
  if(options.smsEnabled&&options.phone){
    await tx.integrationLog.upsert({
      where:{idempotencyKey:`${appointment.id}:SMS:${type}:${appointment.updatedAt.toISOString()}`},
      update:{},
      create:{
        appointmentId:appointment.id,
        channel:IntegrationChannel.SMS,
        type,
        idempotencyKey:`${appointment.id}:SMS:${type}:${appointment.updatedAt.toISOString()}`,
        recipient:options.phone,
        provider:"TWILIO",
      },
    });
  }
  if(options.calendar!==false){
    const key=`${appointment.id}:GOOGLE_CALENDAR:${appointment.updatedAt.toISOString()}`;
    await tx.integrationLog.upsert({
      where:{idempotencyKey:key},
      update:{},
      create:{
        appointmentId:appointment.id,
        channel:IntegrationChannel.GOOGLE_CALENDAR,
        type:IntegrationType.CALENDAR_SYNC,
        idempotencyKey:key,
        recipient:process.env.GOOGLE_CALENDAR_ID??"not-configured",
        provider:"GOOGLE_CALENDAR",
      },
    });
  }
}

export async function processPendingIntegrations(limit=20){
  await prisma.integrationLog.updateMany({
    where:{status:IntegrationStatus.PROCESSING,updatedAt:{lt:new Date(Date.now()-15*60_000)}},
    data:{status:IntegrationStatus.PENDING,providerMessage:"Requeued after an interrupted integration attempt."},
  });
  const pending=await prisma.integrationLog.findMany({
    where:{status:IntegrationStatus.PENDING},
    orderBy:{createdAt:"asc"},
    take:limit,
    select:{id:true,updatedAt:true},
  });
  let processed=0;
  for(const entry of pending){
    const claim=await prisma.integrationLog.updateMany({
      where:{id:entry.id,status:IntegrationStatus.PENDING,updatedAt:entry.updatedAt},
      data:{status:IntegrationStatus.PROCESSING},
    });
    if(claim.count===0)continue;
    await deliverIntegration(entry.id);
    processed++;
  }
  return processed;
}

export async function retryIntegration(id:string){
  const entry=await prisma.integrationLog.findUnique({where:{id},include:{appointment:{select:{status:true,startAt:true}}}});
  if(!entry)return null;
  if(entry.status!==IntegrationStatus.FAILED)return {error:"Only failed integration deliveries can be retried.",status:409};
  if(entry.attempts>=5)return {error:"The retry limit has been reached.",status:409};
  if(entry.type===IntegrationType.REMINDER&&(entry.appointment.status!=="CONFIRMED"||!isReminderDue(entry.appointment.startAt))){
    return {error:"This reminder is no longer eligible for delivery.",status:409};
  }
  const updated=await prisma.integrationLog.updateMany({
    where:{id,status:IntegrationStatus.FAILED,updatedAt:entry.updatedAt},
    data:{status:IntegrationStatus.PENDING,providerMessage:null},
  });
  if(!updated.count)return {error:"This integration is already being retried.",status:409};
  await processOneIntegration(id);
  return prisma.integrationLog.findUnique({where:{id}});
}

export async function processOneIntegration(id:string){
  const entry=await prisma.integrationLog.findUnique({where:{id}});
  if(!entry||entry.status!==IntegrationStatus.PENDING)return null;
  const claim=await prisma.integrationLog.updateMany({where:{id,status:IntegrationStatus.PENDING,updatedAt:entry.updatedAt},data:{status:IntegrationStatus.PROCESSING}});
  if(!claim.count)return {status:"skipped" as const};
  return deliverIntegration(id);
}

async function deliverIntegration(id:string){
  const entry=await prisma.integrationLog.findUnique({
    where:{id},
    include:{appointment:{include:{patient:{select:{name:true,email:true,phone:true}},doctor:{select:{name:true}},service:{select:{name:true}},chair:{select:{name:true}}}}},
  });
  if(!entry)return null;
  try{
    if(entry.type===IntegrationType.REMINDER&&(entry.appointment.status!=="CONFIRMED"||!isReminderDue(entry.appointment.startAt))){
      throw new Error("The appointment is no longer eligible for a 24-hour reminder.");
    }
    if(entry.channel===IntegrationChannel.SMS)await sendSms(entry.recipient,entry.type,entry.appointment);
    else await syncCalendar(entry.appointment);
    await prisma.integrationLog.update({where:{id},data:{status:IntegrationStatus.SENT,providerMessage:null,attempts:{increment:1},sentAt:new Date()}});
    return {status:"sent" as const,id};
  }catch(error){
    const message=integrationFailure(entry.channel,error);
    await prisma.integrationLog.update({where:{id},data:{status:IntegrationStatus.FAILED,providerMessage:message,attempts:{increment:1}}});
    console.error(`Could not deliver ${entry.channel} integration:`,error);
    return {status:"failed" as const,id,error:message};
  }
}

function isReminderDue(startAt:Date,now=new Date()){
  return Math.abs(startAt.getTime()-(now.getTime()+24*60*60_000))<=5*60_000;
}

async function sendSms(to:string,type:Type,appointment:IntegrationAppointment){
  const sid=process.env.TWILIO_ACCOUNT_SID;
  const token=process.env.TWILIO_AUTH_TOKEN;
  const from=process.env.TWILIO_FROM_NUMBER;
  if(!sid||!token||!from)throw new Error("Twilio credentials are not configured.");
  if(!/^\+[1-9]\d{7,14}$/.test(to))throw new Error("The patient phone number is not in E.164 format.");
  const date=new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(appointment.startAt);
  const messages:Partial<Record<Type,string>>={
    CONFIRMATION:`Appointment confirmed with ${appointment.doctor.name} on ${date}.`,
    RESCHEDULED:`Your appointment with ${appointment.doctor.name} is now scheduled for ${date}.`,
    CANCELLATION:`Your appointment with ${appointment.doctor.name} on ${date} was cancelled.`,
    REMINDER:`Reminder: appointment with ${appointment.doctor.name} on ${date}.`,
  };
  const body=messages[type];
  if(!body)return;
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{
    method:"POST",
    headers:{
      Authorization:`Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type":"application/x-www-form-urlencoded",
    },
    body:new URLSearchParams({From:from,To:to,Body:body}),
  });
  if(!response.ok)throw new Error(`Twilio rejected the message (HTTP ${response.status}).`);
}

async function syncCalendar(appointment:{id:string;status:string;startAt:Date;endAt:Date;patientName:string;patient:{name:string;email:string;phone:string|null}|null;doctor:{name:string};service:{name:string};chair:{name:string}}){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g,"\n");
  const calendarId=process.env.GOOGLE_CALENDAR_ID;
  if(!email||!privateKey||!calendarId)throw new Error("Google Calendar service account settings are not configured.");
  const auth=new JWT({email,key:privateKey,scopes:["https://www.googleapis.com/auth/calendar.events"]});
  const {token}=await auth.getAccessToken();
  if(!token)throw new Error("Google Calendar access could not be authorized.");
  const eventId=createHash("sha256").update(appointment.id).digest("hex");
  const endpoint=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
  if(appointment.status==="CANCELLED"){
    const response=await fetch(endpoint,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
    if(response.ok||response.status===404)return;
    throw new Error(`Google Calendar rejected the deletion (HTTP ${response.status}).`);
  }
  const event={
    id:eventId,
    summary:`${appointment.service.name} — ${appointment.patient?.name??appointment.patientName}`,
    description:`Appointment with ${appointment.doctor.name}.`,
    start:{dateTime:appointment.startAt.toISOString(),timeZone:"Asia/Dhaka"},
    end:{dateTime:appointment.endAt.toISOString(),timeZone:"Asia/Dhaka"},
    ...(appointment.patient?.email?{attendees:[{email:appointment.patient.email}]}:{}),
  };
  const response=await fetch(endpoint,{method:"PUT",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(event)});
  if(response.ok)return;
  if(response.status===404){
    const insert=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,{
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify(event),
    });
    if(insert.ok)return;
    throw new Error(`Google Calendar rejected the event (HTTP ${insert.status}).`);
  }
  throw new Error(`Google Calendar rejected the event (HTTP ${response.status}).`);
}

function integrationFailure(channel:Channel,error:unknown){
  const message=error instanceof Error?error.message:"Integration delivery failed.";
  if(channel===IntegrationChannel.SMS&&message.startsWith("Twilio rejected"))return message;
  if(channel===IntegrationChannel.GOOGLE_CALENDAR&&message.startsWith("Google Calendar rejected"))return message;
  return message.includes("not configured")||message.includes("E.164")?message:`${channel} delivery failed. Check integration settings and try again.`;
}

export function getIntegrationReminderWindow(now=new Date(),windowMinutes=5){
  const target=now.getTime()+24*60*60_000;
  const tolerance=windowMinutes*60_000;
  return {from:new Date(target-tolerance),to:new Date(target+tolerance)};
}
