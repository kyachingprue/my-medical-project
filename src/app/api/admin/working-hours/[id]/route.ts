import {NextResponse} from "next/server";
import {Prisma,UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {logAdminAction} from "@/lib/management/audit";
import {workingHoursPatchSchema,workingHoursSchema} from "@/lib/management/schemas";
import {isPrismaCode,ScheduleOverlapError} from "../route";
import {prisma} from "@/lib/prisma";

type RouteContext={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=workingHoursPatchSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_WORKING_HOURS","Working hours are invalid.",400,parsed.error.flatten());
  try{
    const {id}=await params;
    const result=await prisma.$transaction(async tx=>{
      const current=await tx.workingHours.findUnique({where:{id}});
      if(!current)return null;
      const updated={...current,...parsed.data};
      const checked=workingHoursSchema.safeParse({doctorId:current.doctorId,dayOfWeek:current.dayOfWeek,startTime:updated.startTime,endTime:updated.endTime,isActive:updated.isActive});
      if(!checked.success)throw new InvalidScheduleError(checked.error.flatten());
      if(updated.isActive){
        const overlap=await tx.workingHours.findFirst({where:{id:{not:id},doctorId:current.doctorId,dayOfWeek:current.dayOfWeek,isActive:true,startTime:{lt:updated.endTime},endTime:{gt:updated.startTime}}});
        if(overlap)throw new ScheduleOverlapError(current.dayOfWeek);
      }
      const saved=await tx.workingHours.update({where:{id},data:parsed.data});
      await logAdminAction(tx,access.user,parsed.data.isActive===undefined?"UPDATE":"SET_STATUS","WorkingHours",id,{startTime:saved.startTime,endTime:saved.endTime,isActive:saved.isActive});
      return saved;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    return result?NextResponse.json({data:result}):apiError("SCHEDULE_NOT_FOUND","Schedule entry not found.",404);
  }catch(error){
    if(error instanceof InvalidScheduleError)return apiError("INVALID_WORKING_HOURS","Working hours are invalid.",400,error.details);
    if(error instanceof ScheduleOverlapError)return apiError("SCHEDULE_OVERLAP",`Schedule overlaps an existing entry on ${error.day}.`,409);
    if(isPrismaCode(error,"P2034"))return apiError("SCHEDULE_CONFLICT","The schedule changed concurrently. Refresh and try again.",409);
    console.error("Could not update working hours:",error);return apiError("WORKING_HOURS_UPDATE_FAILED","Unable to update working hours.",500);
  }
}

export async function DELETE(_request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  try{
    const {id}=await params;
    const record=await prisma.$transaction(async tx=>{
      const updated=await tx.workingHours.update({where:{id},data:{isActive:false}});
      await logAdminAction(tx,access.user,"DEACTIVATE","WorkingHours",id);
      return updated;
    });
    return NextResponse.json({data:record});
  }catch(error){
    if(isPrismaCode(error,"P2025"))return apiError("SCHEDULE_NOT_FOUND","Schedule entry not found.",404);
    console.error("Could not deactivate working hours:",error);return apiError("WORKING_HOURS_DELETE_FAILED","Unable to deactivate this schedule entry.",500);
  }
}

class InvalidScheduleError extends Error{constructor(public readonly details:unknown){super("Invalid schedule")}}
