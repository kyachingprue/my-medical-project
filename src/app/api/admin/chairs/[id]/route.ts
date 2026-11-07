import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {chairPatchSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {isPrismaCode} from "../route";
import {prisma} from "@/lib/prisma";

type RouteContext={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=chairPatchSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_CHAIR","Chair details are invalid.",400,parsed.error.flatten());
  try{
    const {id}=await params;
    if(parsed.data.isActive===false){
      const futureAppointments=await prisma.appointment.count({where:{chairId:id,status:{not:"CANCELLED"},startAt:{gte:new Date()}}});
      if(futureAppointments)return apiError("CHAIR_HAS_APPOINTMENTS","This chair has future appointments and cannot be deactivated.",409,{futureAppointments});
    }
    const chair=await prisma.$transaction(async tx=>{
      const updated=await tx.chair.update({where:{id},data:parsed.data});
      await logAdminAction(tx,access.user,parsed.data.isActive===undefined?"UPDATE":"SET_STATUS","Chair",id,{isActive:updated.isActive});
      return updated;
    });
    return NextResponse.json({data:chair});
  }catch(error){
    if(isPrismaCode(error,"P2025"))return apiError("CHAIR_NOT_FOUND","Chair not found.",404);
    if(isPrismaCode(error,"P2002"))return apiError("CHAIR_NAME_EXISTS","A chair with that name already exists.",409);
    console.error("Could not update chair:",error);return apiError("CHAIR_UPDATE_FAILED","Unable to update the chair.",500);
  }
}
