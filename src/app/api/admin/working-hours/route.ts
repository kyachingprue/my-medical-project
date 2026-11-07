import {NextResponse} from "next/server";
import {Prisma,UserRole,Weekday} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {logAdminAction} from "@/lib/management/audit";
import {workingHoursSchema} from "@/lib/management/schemas";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  const access=await authorizeApi([UserRole.ADMIN,UserRole.RECEPTIONIST]);
  if(access.response)return access.response;
  const params=new URL(request.url).searchParams;
  const doctorId=params.get("doctorId")||undefined;
  const day=params.get("dayOfWeek");
  if(day&&!Object.values(Weekday).includes(day as Weekday))return apiError("INVALID_WEEKDAY","Invalid weekday.",400);
  try{
    const data=await prisma.workingHours.findMany({
      where:{...(doctorId?{doctorId}:{}),...(day?{dayOfWeek:day as Weekday}:{}),...(access.user.role===UserRole.RECEPTIONIST?{isActive:true}:{})},
      include:{doctor:{select:{id:true,name:true,specialization:true,isActive:true}}},
      orderBy:[{doctor:{name:"asc"}},{dayOfWeek:"asc"},{startTime:"asc"}],
    });
    return NextResponse.json({data});
  }catch(error){console.error("Could not list working hours:",error);return apiError("WORKING_HOURS_LIST_FAILED","Unable to load working hours.",500)}
}

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=workingHoursSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_WORKING_HOURS","Working hours are invalid.",400,parsed.error.flatten());
  const {doctorId,startTime,endTime,isActive=true}=parsed.data;
  const days=[...new Set([parsed.data.dayOfWeek,...(parsed.data.copyToDays??[])])];
  if(days.includes(Weekday.FRIDAY))return apiError("FRIDAY_CLOSED","The clinic is closed on Fridays.",400);
  try{
    const records=await prisma.$transaction(async tx=>{
      const doctor=await tx.doctor.findUnique({where:{id:doctorId},select:{id:true}});
      if(!doctor)return null;
      const created=[];
      for(const dayOfWeek of days){
        const overlap=await tx.workingHours.findFirst({where:{doctorId,dayOfWeek,isActive:true,startTime:{lt:endTime},endTime:{gt:startTime}}});
        if(overlap)throw new ScheduleOverlapError(dayOfWeek);
        const record=await tx.workingHours.create({data:{doctorId,dayOfWeek,startTime,endTime,isActive}});
        await logAdminAction(tx,access.user,"CREATE","WorkingHours",record.id,{doctorId,dayOfWeek,startTime,endTime});
        created.push(record);
      }
      return created;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    return records?NextResponse.json({data:records},{status:201}):apiError("DOCTOR_NOT_FOUND","Doctor not found.",404);
  }catch(error){
    if(error instanceof ScheduleOverlapError)return apiError("SCHEDULE_OVERLAP",`Schedule overlaps an existing entry on ${error.day}.`,409);
    if(isPrismaCode(error,"P2002"))return apiError("SCHEDULE_EXISTS","A schedule entry already exists for this doctor and time.",409);
    if(isPrismaCode(error,"P2034"))return apiError("SCHEDULE_CONFLICT","The schedule changed concurrently. Refresh and try again.",409);
    console.error("Could not create working hours:",error);return apiError("WORKING_HOURS_CREATE_FAILED","Unable to save working hours.",500);
  }
}

export class ScheduleOverlapError extends Error{constructor(public readonly day:Weekday){super("Overlapping schedule")}}
export function isPrismaCode(error:unknown,code:string){return typeof error==="object"&&error!==null&&"code" in error&&error.code===code}
