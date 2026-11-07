import {NextResponse} from "next/server";
import {Prisma,UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {mergeTimeOffUpdate,timeOffPatchSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {lockDoctorRow} from "@/lib/management/doctor-lock";
import {isPrismaCode,overlappingAppointments} from "../route";
import {prisma} from "@/lib/prisma";

type RouteContext={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=timeOffPatchSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_TIME_OFF","Leave details are invalid.",400,parsed.error.flatten());
  try{
    const {id}=await params;
    const result=await prisma.$transaction(async tx=>{
      const current=await tx.timeOff.findUnique({where:{id}});
      if(!current)return {kind:"missing" as const};
      await lockDoctorRow(tx,current.doctorId);
      const merged=mergeTimeOffUpdate(current,parsed.data);
      if(!merged.success)return {kind:"invalid" as const,details:merged.details};
      const overlap=await tx.timeOff.findFirst({where:{id:{not:id},doctorId:current.doctorId,startAt:{lt:merged.data.endAt},endAt:{gt:merged.data.startAt}}});
      if(overlap)return {kind:"leave-overlap" as const};
      const appointments=await overlappingAppointments(tx,current.doctorId,merged.data.startAt,merged.data.endAt);
      if(appointments.length)return {kind:"appointment-conflict" as const,appointments};
      const updated=await tx.timeOff.update({where:{id},data:merged.data,include:{doctor:{select:{id:true,name:true}}}});
      await logAdminAction(tx,access.user,"UPDATE","TimeOff",id,{startAt:updated.startAt.toISOString(),endAt:updated.endAt.toISOString(),reason:updated.reason});
      return {kind:"updated" as const,record:updated};
    },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted});
    if(result.kind==="missing")return apiError("TIME_OFF_NOT_FOUND","Leave entry not found.",404);
    if(result.kind==="invalid")return apiError("INVALID_TIME_OFF","Leave details are invalid.",400,result.details);
    if(result.kind==="leave-overlap")return apiError("TIME_OFF_OVERLAP","This leave overlaps another leave entry.",409);
    if(result.kind==="appointment-conflict")return apiError("TIME_OFF_APPOINTMENT_CONFLICT","Resolve the affected appointments before saving this leave.",409,{appointments:result.appointments});
    return NextResponse.json({data:result.record,timeZone:"Asia/Dhaka"});
  }catch(error){
    if(isPrismaCode(error,"P2034"))return apiError("TIME_OFF_CONFLICT","Leave data changed concurrently. Refresh and try again.",409);
    console.error("Could not update doctor leave:",error);return apiError("TIME_OFF_UPDATE_FAILED","Unable to update doctor leave.",500);
  }
}

export async function DELETE(_request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  try{
    const {id}=await params;
    await prisma.$transaction(async tx=>{
      await tx.timeOff.delete({where:{id}});
      await logAdminAction(tx,access.user,"CANCEL","TimeOff",id);
    });
    return NextResponse.json({data:{id,cancelled:true}});
  }catch(error){
    if(isPrismaCode(error,"P2025"))return apiError("TIME_OFF_NOT_FOUND","Leave entry not found.",404);
    console.error("Could not cancel doctor leave:",error);return apiError("TIME_OFF_DELETE_FAILED","Unable to cancel doctor leave.",500);
  }
}
