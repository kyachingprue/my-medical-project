import {NextResponse} from "next/server";
import {UserRole,WaitlistStatus} from "@prisma/client";
import {z} from "zod";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {logUserAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

const statusSchema=z.object({status:z.enum(["CONTACTED","BOOKED","CANCELLED"])});
type Context={params:Promise<{id:string}>};

export async function PATCH(request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=statusSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_WAITLIST_STATUS","Choose a valid waiting list status.",400);
  const {id}=await params;
  try{
    const result=await prisma.$transaction(async tx=>{
      const current=await tx.appointmentWaitlistEntry.findUnique({where:{id},select:{id:true,status:true}});
      if(!current)return null;
      const entry=await tx.appointmentWaitlistEntry.update({where:{id},data:{status:parsed.data.status as WaitlistStatus}});
      await logUserAction(tx,access.user.id,"STATUS_CHANGE","AppointmentWaitlistEntry",id,{statusBefore:current.status,statusAfter:entry.status});
      return entry;
    });
    return result?NextResponse.json({data:result}):apiError("WAITLIST_ENTRY_NOT_FOUND","Waiting list entry not found.",404);
  }catch(error){
    console.error("Could not update waiting list entry:",error);
    return apiError("WAITLIST_UPDATE_FAILED","Unable to update this waiting list entry.",500);
  }
}

export async function DELETE(_request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.PATIENT,UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const {id}=await params;
  try{
    const result=await prisma.$transaction(async tx=>{
      const current=await tx.appointmentWaitlistEntry.findFirst({
        where:{id,...(access.user.role===UserRole.PATIENT?{patientId:access.user.id}:{})},
        select:{id:true,status:true},
      });
      if(!current)return null;
      const entry=await tx.appointmentWaitlistEntry.update({where:{id},data:{status:WaitlistStatus.CANCELLED}});
      await logUserAction(tx,access.user.id,"CANCEL","AppointmentWaitlistEntry",id,{statusBefore:current.status});
      return entry;
    });
    return result?NextResponse.json({data:result}):apiError("WAITLIST_ENTRY_NOT_FOUND","Waiting list entry not found.",404);
  }catch(error){
    console.error("Could not cancel waiting list entry:",error);
    return apiError("WAITLIST_CANCEL_FAILED","Unable to cancel this waiting list request.",500);
  }
}
