import {AppointmentStatus,Prisma,PrismaClient} from "@prisma/client";
import {apiError} from "@/lib/api/responses";
import {
  addBusinessDays,
  appointmentDateSchema,
  BOOKING_BUFFER_MINUTES,
  businessDateAt,
  businessDayOfWeek,
  businessLocalDateTimeToUtc,
  intervalsOverlap,
  SLOT_INTERVAL_MINUTES,
  timeToMinutes,
} from "./time";

type Db=PrismaClient|Prisma.TransactionClient;
type SlotInput={doctorId:string;serviceId:string;date:string;excludeAppointmentId?:string;now?:Date};
type SlotError={status:number;code:string;message:string};
export type AvailableSlot={date:string;time:string;startAt:Date;endAt:Date;durationMinutes:number};
export type SlotResult={slots:AvailableSlot[];error?:never}|{slots?:never;error:SlotError};

export async function generateAvailableSlots(db:Db,input:SlotInput):Promise<SlotResult>{
  const {doctorId,serviceId,date,excludeAppointmentId,now=new Date()}=input;
  if(!appointmentDateSchema.safeParse(date).success)return fail(400,"INVALID_DATE","Enter a valid appointment date.");
  const today=businessDateAt(now);
  if(date<today)return fail(400,"PAST_DATE","Appointments cannot be booked in the past.");
  if(date>addBusinessDays(today,30))return fail(400,"BOOKING_WINDOW_EXCEEDED","Appointments can only be booked 30 days in advance.");
  const day=businessDayOfWeek(date);

  const [assignment,workingHours,chairs,clinicHours]=await Promise.all([
    db.doctorService.findFirst({where:{doctorId,serviceId,doctor:{isActive:true},service:{isActive:true}},select:{service:{select:{durationMinutes:true}}}}),
    db.workingHours.findMany({where:{doctorId,dayOfWeek:day,isActive:true},orderBy:{startTime:"asc"}}),
    db.chair.findMany({where:{isActive:true},select:{id:true}}),
    db.clinicBusinessHours.findUnique({where:{dayOfWeek:day}}),
  ]);
  if(!assignment)return fail(404,"DOCTOR_SERVICE_UNAVAILABLE","This doctor is not available for the selected service.");
  if(!clinicHours)return fail(503,"CLINIC_HOURS_UNAVAILABLE","Clinic business hours are not configured.");
  if(!clinicHours.isOpen)return fail(400,"CLINIC_CLOSED","The clinic is closed on this day.");
  if(!workingHours.length)return {slots:[]};
  if(!chairs.length)return fail(409,"NO_CHAIRS_AVAILABLE","No clinic chairs are currently available.");

  const dayStart=businessLocalDateTimeToUtc(date,"00:00");
  const dayEnd=businessLocalDateTimeToUtc(addBusinessDays(date,1),"00:00");
  const [timeOff,appointments]=await Promise.all([
    db.timeOff.findMany({where:{doctorId,startAt:{lt:dayEnd},endAt:{gt:dayStart}},select:{startAt:true,endAt:true}}),
    db.appointment.findMany({
      where:{startAt:{lt:dayEnd},endAt:{gt:dayStart},status:{not:AppointmentStatus.CANCELLED},...(excludeAppointmentId?{id:{not:excludeAppointmentId}}:{})},
      select:{doctorId:true,chairId:true,startAt:true,endAt:true},
    }),
  ]);
  const durationMinutes=assignment.service.durationMinutes;
  const occupiedDoctor=appointments.filter(item=>item.doctorId===doctorId);
  const slots:AvailableSlot[]=[];

  for(const hours of workingHours){
    const earliest=Math.max(timeToMinutes(hours.startTime),timeToMinutes(clinicHours.startTime));
    const latest=Math.min(timeToMinutes(hours.endTime),timeToMinutes(clinicHours.endTime));
    let startMinute=Math.ceil(earliest/SLOT_INTERVAL_MINUTES)*SLOT_INTERVAL_MINUTES;
    for(;startMinute+durationMinutes+BOOKING_BUFFER_MINUTES<=latest;startMinute+=SLOT_INTERVAL_MINUTES){
      const endMinute=startMinute+durationMinutes;
      const blockedEndMinute=endMinute+BOOKING_BUFFER_MINUTES;
      if(clinicHours.breakStart&&clinicHours.breakEnd&&startMinute<timeToMinutes(clinicHours.breakEnd)&&blockedEndMinute>timeToMinutes(clinicHours.breakStart))continue;
      const time=`${String(Math.floor(startMinute/60)).padStart(2,"0")}:${String(startMinute%60).padStart(2,"0")}`;
      const endAt=businessLocalDateTimeToUtc(date,`${String(Math.floor(endMinute/60)).padStart(2,"0")}:${String(endMinute%60).padStart(2,"0")}`);
      const startAt=businessLocalDateTimeToUtc(date,time);
      if(startAt<=now)continue;
      const blockedEnd=new Date(endAt.getTime()+BOOKING_BUFFER_MINUTES*60_000);
      if(timeOff.some(leave=>intervalsOverlap(startAt,blockedEnd,leave.startAt,leave.endAt)))continue;
      if(occupiedDoctor.some(appointment=>intervalsOverlap(startAt,blockedEnd,appointment.startAt,new Date(appointment.endAt.getTime()+BOOKING_BUFFER_MINUTES*60_000))))continue;
      const occupiedChairs=new Set(appointments.filter(appointment=>intervalsOverlap(startAt,blockedEnd,appointment.startAt,new Date(appointment.endAt.getTime()+BOOKING_BUFFER_MINUTES*60_000))).map(appointment=>appointment.chairId));
      if(chairs.every(chair=>occupiedChairs.has(chair.id)))continue;
      slots.push({date,time,startAt,endAt,durationMinutes});
    }
  }
  return {slots};
}

function fail(status:number,code:string,message:string):SlotResult{
  return {error:{status,code,message}};
}

export function slotErrorResponse(error:SlotError){
  return apiError(error.code,error.message,error.status);
}
