import {Weekday} from "@prisma/client";
import {z} from "zod";

export const BUSINESS_TIME_ZONE="Asia/Dhaka";
export const BOOKING_BUFFER_MINUTES=5;
export const PATIENT_CANCELLATION_WINDOW_MINUTES = 120;

export function canPatientCancelAppointment(startAt: Date, now = new Date()) {
  return startAt.getTime() - now.getTime() >= PATIENT_CANCELLATION_WINDOW_MINUTES * 60_000;
}
export const SLOT_INTERVAL_MINUTES=15;
export const appointmentDateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidBusinessDate,"Enter a valid appointment date.");
export const slotTimeSchema=z.string().regex(/^(?:1[0-9]|20):(?:00|15|30|45)$/);

const weekdayByIndex=[Weekday.SUNDAY,Weekday.MONDAY,Weekday.TUESDAY,Weekday.WEDNESDAY,Weekday.THURSDAY,Weekday.FRIDAY,Weekday.SATURDAY] as const;

export function isValidBusinessDate(value:string){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(!match)return false;
  const [,year,month,day]=match.map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}

export function businessDateAt(now:Date){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:BUSINESS_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addBusinessDays(date:string,days:number){
  const [year,month,day]=date.split("-").map(Number);
  return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10);
}

export function businessDayOfWeek(date:string){
  const [year,month,day]=date.split("-").map(Number);
  return weekdayByIndex[new Date(Date.UTC(year,month-1,day,12)).getUTCDay()];
}

export function businessLocalDateTimeToUtc(date:string,time:string){
  return new Date(`${date}T${time}:00+06:00`);
}

export function utcToBusinessLocalDateTime(value:Date){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:BUSINESS_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(value);
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??"";
  return {date:`${part("year")}-${part("month")}-${part("day")}`,time:`${part("hour")}:${part("minute")}`};
}

export function minutesAfter(value:string,minutes:number){
  const [hour,minute]=value.split(":").map(Number);
  const total=hour*60+minute+minutes;
  return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}

export function timeToMinutes(value:string){
  const [hour,minute]=value.split(":").map(Number);
  return hour*60+minute;
}

export function intervalsOverlap(startA:Date,endA:Date,startB:Date,endB:Date){
  return startA<endB&&endA>startB;
}
