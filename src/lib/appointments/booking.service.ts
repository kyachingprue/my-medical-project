import {AppointmentStatus,IntegrationType,Prisma,UserRole} from "@prisma/client";
import {randomBytes} from "node:crypto";
import {prisma} from "@/lib/prisma";
import {BOOKING_BUFFER_MINUTES,canPatientCancelAppointment} from "./time";
import {generateAvailableSlots} from "./slots.service";
import {createAppointmentNotification,scheduleAppointmentNotification} from "@/lib/notifications/email";
import {lockDoctorRow} from "@/lib/management/doctor-lock";
import {logUserAction} from "@/lib/management/audit";
import {queueAppointmentIntegrations} from "@/lib/integrations/appointments";
import {notifyWaitlistForOpenedAppointment} from "./waitlist.service";

type SlotInput={doctorId:string;serviceId:string;date:string;time:string};
type BookingActor={id:string;role:UserRole};
type BookingFailure={kind:"failure";status:number;code:string;message:string};

const appointmentDetails={
  patient:{select:{id:true,name:true,email:true,phone:true,smsNotificationsEnabled:true}},
  doctor:{select:{id:true,name:true,specialization:true,profileImage:true}},
  service:{select:{id:true,name:true,slug:true,durationMinutes:true,price:true,isOnlineConsultation:true}},
  chair:{select:{id:true,name:true}},
} satisfies Prisma.AppointmentInclude;

type BookingSuccess={kind:"success";appointment:Prisma.AppointmentGetPayload<{include:typeof appointmentDetails}>};
type BookingResult=BookingFailure|BookingSuccess;

export async function createPatientAppointment(actor:BookingActor,input:SlotInput):Promise<BookingResult>{
  return createAppointmentTransaction(actor,input,{patientId:actor.id});
}

export async function createReceptionistAppointment(actor:BookingActor,input:SlotInput&{patientId?:string;patientName?:string;patientPhone?:string}):Promise<BookingResult>{
  return createAppointmentTransaction(actor,input,{patientId:input.patientId,patientName:input.patientName,patientPhone:input.patientPhone});
}

async function createAppointmentTransaction(
  actor:BookingActor,
  input:SlotInput,
  patient:{patientId?:string;patientName?:string;patientPhone?:string},
):Promise<BookingResult>{
  try{
    const appointment=await prisma.$transaction(async tx=>{
      const now=new Date();
      const patientUser=patient.patientId?await lockPatientRow(tx,patient.patientId):null;
      if(patient.patientId&&!patientUser)return fail("PATIENT_NOT_FOUND","Patient account not found.",404);
      if(patientUser&&patientUser.role!==UserRole.PATIENT)return fail("INVALID_PATIENT","Appointments can only be assigned to patient accounts.",400);
      if(!await lockDoctorRow(tx,input.doctorId,true))return fail("DOCTOR_NOT_FOUND","Doctor not found.",404);
      if(patientUser){
        const upcoming=await tx.appointment.count({where:{patientId:patientUser.id,status:AppointmentStatus.CONFIRMED,startAt:{gte:now}}});
        if(upcoming>=2)return fail("PATIENT_BOOKING_LIMIT","A patient can have at most two upcoming appointments.",409);
      }

      const available=await generateAvailableSlots(tx,input);
      if(available.error)return fail(available.error.code,available.error.message,available.error.status);
      const slot=available.slots.find(candidate=>candidate.time===input.time);
      if(!slot)return fail("SLOT_UNAVAILABLE","This appointment slot is no longer available.",409);
      const service=await tx.service.findUnique({where:{id:input.serviceId},select:{isOnlineConsultation:true}});
      if(!service)return fail("SERVICE_NOT_FOUND","Service not found.",404);

      const chairId=await lockAvailableChair(tx,slot.startAt,slot.endAt);
      if(!chairId)return fail("SLOT_UNAVAILABLE","This appointment slot is no longer available.",409);

      const created=await tx.appointment.create({
        data:{
          patientId:patientUser?.id??null,
          patientName:patientUser?.name??patient.patientName??"",
          patientPhone:patientUser?.phone??patient.patientPhone??null,
          doctorId:input.doctorId,
          serviceId:input.serviceId,
          chairId,
          startAt:slot.startAt,
          endAt:slot.endAt,
          status:AppointmentStatus.CONFIRMED,
          createdById:actor.id,
          videoRoomName:service.isOnlineConsultation?createVideoRoomName():null,
        },
        include:appointmentDetails,
      });
      const notificationId=await createAppointmentNotification(tx,{
        type:"APPOINTMENT_CONFIRMATION",
        appointment:created,
        userId:created.patientId,
        recipientEmail:created.patient?.email,
      });
      await queueAppointmentIntegrations(tx,created,IntegrationType.CONFIRMATION,{
        phone:created.patient?.phone,
        smsEnabled:created.patient?.smsNotificationsEnabled,
      });
      await logUserAction(tx,actor.id,"CREATE","Appointment",created.id,{doctorId:created.doctorId,serviceId:created.serviceId,startAt:created.startAt.toISOString(),endAt:created.endAt.toISOString()});
      return {appointment:created,notificationId};
    },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,maxWait:10_000,timeout:30_000});
    if(isFailure(appointment))return appointment;
    if(appointment.notificationId)scheduleAppointmentNotification(appointment.notificationId,"appointment confirmation");
    return {kind:"success",appointment:appointment.appointment};
  }catch(error){
    if(isBookingConflict(error))return fail("SLOT_UNAVAILABLE","This appointment slot was booked by another request.",409);
    console.error("Could not create appointment:",error);
    return fail("APPOINTMENT_CREATE_FAILED","Unable to create the appointment.",500);
  }
}

export async function reschedulePatientAppointment(actor:BookingActor,id:string,input:SlotInput):Promise<BookingResult>{
  try{
    const appointment=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "Appointment" WHERE "id" = ${id} FOR UPDATE`;
      const current=await tx.appointment.findUnique({where:{id}});
      if(!current)return fail("APPOINTMENT_NOT_FOUND","Appointment not found.",404);
      if(actor.role===UserRole.PATIENT&&current.patientId!==actor.id)return fail("APPOINTMENT_NOT_FOUND","Appointment not found.",404);
      if(current.status!==AppointmentStatus.CONFIRMED)return fail("APPOINTMENT_NOT_RESCHEDULABLE","Only confirmed appointments can be rescheduled.",409);
      const now=new Date();
      if(!await lockDoctorRow(tx,input.doctorId,true))return fail("DOCTOR_NOT_FOUND","Doctor not found.",404);
      if(current.startAt<=now)return fail("APPOINTMENT_NOT_RESCHEDULABLE","Past appointments cannot be rescheduled.",409);
      if(current.doctorId===input.doctorId&&current.serviceId===input.serviceId){
        const currentLocal=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(current.startAt);
        const currentDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(current.startAt);
        if(currentLocal===input.time&&currentDate===input.date)return fail("SAME_APPOINTMENT_SLOT","Choose a different appointment slot.",400);
      }
      const available=await generateAvailableSlots(tx,{...input,excludeAppointmentId:id,now});
      if(available.error)return fail(available.error.code,available.error.message,available.error.status);
      const slot=available.slots.find(candidate=>candidate.time===input.time);
      if(!slot)return fail("SLOT_UNAVAILABLE","This appointment slot is no longer available.",409);

      const chairId=await lockAvailableChair(tx,slot.startAt,slot.endAt,id);
      if(!chairId)return fail("SLOT_UNAVAILABLE","This appointment slot is no longer available.",409);
      const service=await tx.service.findUnique({where:{id:input.serviceId},select:{isOnlineConsultation:true}});
      if(!service)return fail("SERVICE_NOT_FOUND","Service not found.",404);
      const updated=await tx.appointment.update({where:{id},data:{
        doctorId:input.doctorId,
        serviceId:input.serviceId,
        chairId,
        startAt:slot.startAt,
        endAt:slot.endAt,
        videoRoomName:service.isOnlineConsultation?current.videoRoomName??createVideoRoomName():null,
      },include:appointmentDetails});
      const notificationId=actor.role===UserRole.ADMIN||actor.role===UserRole.RECEPTIONIST
        ?await createAppointmentNotification(tx,{
          type:"APPOINTMENT_RESCHEDULED",
          appointment:updated,
          userId:updated.patientId,
          recipientEmail:updated.patient?.email,
        })
        :null;
      await queueAppointmentIntegrations(tx,updated,IntegrationType.RESCHEDULED,{
        phone:updated.patient?.phone,
        smsEnabled:updated.patient?.smsNotificationsEnabled,
      });
      await logUserAction(tx,actor.id,"RESCHEDULE","Appointment",id,{before:{doctorId:current.doctorId,serviceId:current.serviceId,startAt:current.startAt.toISOString(),endAt:current.endAt.toISOString()},after:{doctorId:updated.doctorId,serviceId:updated.serviceId,startAt:updated.startAt.toISOString(),endAt:updated.endAt.toISOString()}});
      return {appointment:updated,notificationId};
    },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,maxWait:10_000,timeout:30_000});
    if(isFailure(appointment))return appointment;
    if(appointment.notificationId)scheduleAppointmentNotification(appointment.notificationId,"appointment reschedule");
    return {kind:"success",appointment:appointment.appointment};
  }catch(error){
    if(isBookingConflict(error))return fail("SLOT_UNAVAILABLE","This appointment slot was booked by another request.",409);
    console.error("Could not reschedule appointment:",error);
    return fail("APPOINTMENT_RESCHEDULE_FAILED","Unable to reschedule the appointment.",500);
  }
}

export async function cancelAppointment(actor:BookingActor,id:string,reason?:string){
  try{
    const result=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "Appointment" WHERE "id" = ${id} FOR UPDATE NOWAIT`;
      const appointment=await tx.appointment.findUnique({where:{id}});
      if(!appointment)return fail("APPOINTMENT_NOT_FOUND","Appointment not found.",404);
      if(actor.role===UserRole.PATIENT&&appointment.patientId!==actor.id)return fail("APPOINTMENT_NOT_FOUND","Appointment not found.",404);
      if(appointment.status!==AppointmentStatus.CONFIRMED)return fail("APPOINTMENT_NOT_CANCELLABLE","Only confirmed appointments can be cancelled.",409);
      if(actor.role===UserRole.PATIENT&&!canPatientCancelAppointment(appointment.startAt))return fail("CANCELLATION_WINDOW_CLOSED","Patients must cancel at least two hours before the appointment.",409);
      const updated=await tx.appointment.update({where:{id},data:{status:AppointmentStatus.CANCELLED,cancellationReason:reason??null},include:appointmentDetails});
      const notificationId=await createAppointmentNotification(tx,{
        type:"APPOINTMENT_CANCELLATION",
        appointment:updated,
        userId:updated.patientId,
        recipientEmail:updated.patient?.email,
      });
      await queueAppointmentIntegrations(tx,updated,IntegrationType.CANCELLATION,{
        phone:updated.patient?.phone,
        smsEnabled:updated.patient?.smsNotificationsEnabled,
      });
      await notifyWaitlistForOpenedAppointment(tx,updated);
      await logUserAction(tx,actor.id,"CANCEL","Appointment",id,{statusBefore:appointment.status,statusAfter:updated.status,reason:reason??null});
      return {appointment:updated,notificationId};
    },{maxWait:10_000,timeout:20_000});
    if(isFailure(result))return result;
    if(result.notificationId)scheduleAppointmentNotification(result.notificationId,"appointment cancellation");
    return {kind:"success" as const,appointment:result.appointment};
  }catch(error){
    if(isBookingConflict(error))return fail("APPOINTMENT_BUSY","This appointment is being updated. Refresh and try again.",409);
    console.error("Could not cancel appointment:",error);
    return fail("APPOINTMENT_CANCELLATION_FAILED","Unable to cancel the appointment.",500);
  }
}

function fail(code:string,message:string,status:number):BookingFailure{
  return {kind:"failure",code,message,status};
}

function isFailure(value:unknown):value is BookingFailure{
  return typeof value==="object"&&value!==null&&"kind" in value&&value.kind==="failure";
}

async function lockPatientRow(tx:Prisma.TransactionClient,id:string){
  const rows=await tx.$queryRaw<Array<{id:string;name:string;phone:string|null;role:UserRole}>>`SELECT "id","name","phone","role" FROM "User" WHERE "id" = ${id} FOR UPDATE NOWAIT`;
  return rows[0]??null;
}

async function lockAvailableChair(tx:Prisma.TransactionClient,startAt:Date,endAt:Date,excludeAppointmentId?:string){
  const bufferMs=BOOKING_BUFFER_MINUTES*60_000;
  const bufferedStart=new Date(startAt.getTime()-bufferMs);
  const bufferedEnd=new Date(endAt.getTime()+bufferMs);
  const rows=await tx.$queryRaw<Array<{id:string}>>`
    SELECT chair."id"
    FROM "Chair" AS chair
    WHERE chair."isActive" = true
      AND NOT EXISTS (
        SELECT 1
        FROM "Appointment" AS appointment
        WHERE appointment."chairId" = chair."id"
          AND appointment."status" <> 'CANCELLED'
          AND appointment."startAt" < ${bufferedEnd}
          AND appointment."endAt" > ${bufferedStart}
          AND (${excludeAppointmentId ?? null}::text IS NULL OR appointment."id" <> ${excludeAppointmentId ?? null})
      )
    ORDER BY chair."id"
    LIMIT 1
    FOR UPDATE OF chair SKIP LOCKED
  `;
  return rows[0]?.id??null;
}

function isBookingConflict(error:unknown){
  if(typeof error!=="object"||error===null)return false;
  const candidate=error as {code?:string;meta?:{code?:string;database_error?:string;message?:string};message?:string};
  const message=[candidate.message,candidate.meta?.database_error,candidate.meta?.message].filter(Boolean).join(" ");
  return candidate.code==="P2004"||candidate.meta?.code==="23P01"||candidate.meta?.code==="55P03"||/55P03|could not obtain lock/i.test(message)||message.includes("prevent_doctor_booking_overlap")||message.includes("prevent_chair_booking_overlap");
}

function createVideoRoomName(){
  return `smilecraft-${randomBytes(24).toString("hex")}`;
}
