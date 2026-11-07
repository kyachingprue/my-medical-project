import {AppointmentStatus,Prisma,UserRole} from "@prisma/client";
import {z} from "zod";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {addBusinessDays,businessDateAt} from "./time";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";

const rangeSchema=z.object({
  period:z.enum(["today","yesterday","last7days","last30days","last3months","last6months","thisYear","custom"]).default("last30days"),
  from:z.string().optional(),
  to:z.string().optional(),
});
type Range={start:Date;end:Date;previousStart:Date;previousEnd:Date;period:string;from:string;to:string};

export function parseAnalyticsRange(params:URLSearchParams):Range|{error:NextResponse}{
  const parsed=rangeSchema.safeParse(Object.fromEntries(params));
  if(!parsed.success)return {error:apiError("INVALID_DATE_RANGE","Analytics filters are invalid.",400,parsed.error.flatten())};
  const now=new Date();
  const today=businessDateAt(now);
  let from=today;
  let to=today;
  switch(parsed.data.period){
    case "yesterday":from=addBusinessDays(today,-1);to=from;break;
    case "last7days":from=addBusinessDays(today,-6);break;
    case "last30days":from=addBusinessDays(today,-29);break;
    case "last3months":from=addBusinessDays(today,-89);break;
    case "last6months":from=addBusinessDays(today,-179);break;
    case "thisYear":from=`${today.slice(0,4)}-01-01`;break;
    case "custom":
      if(!parsed.data.from||!parsed.data.to||!isValidDate(parsed.data.from)||!isValidDate(parsed.data.to)||parsed.data.from>parsed.data.to){
        return {error:apiError("INVALID_DATE_RANGE","Custom analytics ranges require valid start and end dates.",400)};
      }
      from=parsed.data.from;to=parsed.data.to;
      if(from<addBusinessDays(today,-730)||to>addBusinessDays(today,30)){
        return {error:apiError("DATE_RANGE_TOO_LARGE","Choose a date range within the last two years and next 30 days.",400)};
      }
      break;
  }
  const start=localDayStart(from);
  const end=localDayStart(addBusinessDays(to,1));
  const dayCount=Math.max(1,Math.round((end.getTime()-start.getTime())/86_400_000));
  const previousEnd=start;
  const previousStart=localDayStart(addBusinessDays(from,-dayCount));
  return {start,end,previousStart,previousEnd,period:parsed.data.period,from,to};
}

export async function adminAnalyticsHandler(request:Request,kind:"overview"|"appointments"|"status"|"weekly"|"monthly"|"doctors"|"services"|"no-shows"){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const range=parseAnalyticsRange(new URL(request.url).searchParams);
  if("error" in range)return range.error;
  try{
    const data=await getAnalytics(kind,range);
    return NextResponse.json({data,range:{from:range.from,to:range.to,timeZone:"Asia/Dhaka"}});
  }catch(error){
    console.error(`Could not load ${kind} analytics:`,error);
    return apiError("ANALYTICS_QUERY_FAILED","Unable to load analytics.",500);
  }
}

async function getAnalytics(kind:string,range:Range):Promise<unknown>{
  if(kind==="overview"){
    const [current,previous,today,upcoming,doctors,patients]=await Promise.all([
      statusCounts(range.start,range.end),
      statusCounts(range.previousStart,range.previousEnd),
      prisma.appointment.count({where:{startAt:{gte:localDayStart(businessDateAt(new Date())),lt:localDayStart(addBusinessDays(businessDateAt(new Date()),1))}}}),
      prisma.appointment.count({where:{status:AppointmentStatus.CONFIRMED,startAt:{gte:new Date()}}}),
      prisma.doctor.count({where:{isActive:true}}),
      prisma.user.count({where:{role:UserRole.PATIENT}}),
    ]);
    const total=sumStatuses(current);
    const previousTotal=sumStatuses(previous);
    const denominator=total-current.CANCELLED;
    return {
      totalAppointments:total,
      todayAppointments:today,
      upcomingAppointments:upcoming,
      completedAppointments:current.COMPLETED,
      cancelledAppointments:current.CANCELLED,
      noShowAppointments:current.NO_SHOW,
      activeDoctors:doctors,
      totalPatients:patients,
      noShowRate:denominator?current.NO_SHOW/denominator*100:0,
      previous:{totalAppointments:previousTotal,completedAppointments:previous.COMPLETED,cancelledAppointments:previous.CANCELLED,noShowAppointments:previous.NO_SHOW},
    };
  }
  if(kind==="status"){
    const counts=await statusCounts(range.start,range.end);
    return Object.entries(counts).map(([status,count])=>({status,appointments:count}));
  }
  if(kind==="weekly"){
    const rows=await prisma.$queryRaw<Array<{day:number;appointments:bigint}>>(Prisma.sql`
      SELECT EXTRACT(DOW FROM "startAt" AT TIME ZONE 'Asia/Dhaka')::int AS day, COUNT(*)::bigint AS appointments
      FROM "Appointment"
      WHERE "startAt" >= ${range.start} AND "startAt" < ${range.end}
      GROUP BY day ORDER BY day
    `);
    const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    return rows.map(row=>({day:days[row.day],appointments:Number(row.appointments)}));
  }
  if(kind==="appointments"||kind==="monthly"){
    const truncation=kind==="monthly"?"month":"day";
    const rows=await prisma.$queryRaw<Array<{bucket:string;appointments:bigint}>>(Prisma.sql`
      SELECT date_trunc(${truncation}, "startAt" AT TIME ZONE 'Asia/Dhaka')::text AS bucket, COUNT(*)::bigint AS appointments
      FROM "Appointment"
      WHERE "startAt" >= ${range.start} AND "startAt" < ${range.end}
      GROUP BY bucket ORDER BY bucket
    `);
    return rows.map(row=>({date:toLocalDateKey(row.bucket,kind==="monthly"),appointments:Number(row.appointments)}));
  }
  if(kind==="doctors"){
    const rows=await prisma.appointment.groupBy({by:["doctorId"],where:{startAt:{gte:range.start,lt:range.end}},_count:{id:true},orderBy:{_count:{id:"desc"}},take:10});
    const doctors=await prisma.doctor.findMany({where:{id:{in:rows.map(row=>row.doctorId)}},select:{id:true,name:true}});
    const byId=new Map(doctors.map(doctor=>[doctor.id,doctor.name]));
    return rows.map(row=>({doctorId:row.doctorId,doctor:byId.get(row.doctorId)??"Unknown",appointments:row._count.id}));
  }
  if(kind==="services"){
    const rows=await prisma.appointment.groupBy({by:["serviceId"],where:{startAt:{gte:range.start,lt:range.end}},_count:{id:true},orderBy:{_count:{id:"desc"}},take:10});
    const services=await prisma.service.findMany({where:{id:{in:rows.map(row=>row.serviceId)}},select:{id:true,name:true}});
    const byId=new Map(services.map(service=>[service.id,service.name]));
    return rows.map(row=>({serviceId:row.serviceId,service:byId.get(row.serviceId)??"Unknown",appointments:row._count.id}));
  }
  if(kind==="no-shows"){
    const counts=await statusCounts(range.start,range.end);
    const denominator=sumStatuses(counts)-counts.CANCELLED;
    return {noShows:counts.NO_SHOW,eligibleAppointments:denominator,rate:denominator?counts.NO_SHOW/denominator*100:0,denominator:"all non-cancelled appointments in the selected date range"};
  }
  return [];
}

async function statusCounts(start:Date,end:Date){
  const grouped=await prisma.appointment.groupBy({by:["status"],where:{startAt:{gte:start,lt:end}},_count:{_all:true}});
  const result:Record<AppointmentStatus,number>={CONFIRMED:0,COMPLETED:0,CANCELLED:0,NO_SHOW:0};
  for(const row of grouped)result[row.status]=row._count._all;
  return result;
}

function sumStatuses(counts:Record<AppointmentStatus,number>){
  return Object.values(counts).reduce((sum,value)=>sum+value,0);
}

function localDayStart(date:string){
  return new Date(`${date}T00:00:00+06:00`);
}

function isValidDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split("-").map(Number);
  const parsed=new Date(Date.UTC(year,month-1,day));
  return parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===day;
}

function toLocalDateKey(value:string,monthOnly:boolean){
  const [date]=value.split(" ");
  return monthOnly?date.slice(0,7):date;
}
