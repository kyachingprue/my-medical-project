import {NextResponse} from "next/server";
import {AppointmentStatus,UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {appointmentStatusSchema} from "@/lib/appointments/schemas";
import {createAppointmentNotification,deliverAppointmentNotification} from "@/lib/notifications/email";
import {logUserAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=appointmentStatusSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_APPOINTMENT_STATUS","Appointment status is invalid.",400,parsed.error.flatten());
  const {id}=await params;
  try{
    const result=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "Appointment" WHERE "id" = ${id} FOR UPDATE`;
      const current=await tx.appointment.findUnique({where:{id},select:{id:true,status:true}});
      if(!current)return null;
      if(current.status!==AppointmentStatus.CONFIRMED)return {conflict:true as const};
      const updated=await tx.appointment.update({
        where:{id},
        data:{status:parsed.data.status,cancellationReason:parsed.data.status===AppointmentStatus.CANCELLED?parsed.data.cancellationReason??null:null},
        include:{patient:{select:{id:true,name:true,email:true,phone:true}},doctor:{select:{id:true,name:true}},service:{select:{id:true,name:true,durationMinutes:true}},chair:{select:{id:true,name:true}}},
      });
      const notificationId=updated.status===AppointmentStatus.CANCELLED?await createAppointmentNotification(tx,{type:"APPOINTMENT_CANCELLATION",appointment:updated,userId:updated.patientId,recipientEmail:updated.patient?.email}):null;
      await logUserAction(tx,access.user.id,updated.status===AppointmentStatus.CANCELLED?"CANCEL":"STATUS_CHANGE","Appointment",id,{statusBefore:current.status,statusAfter:updated.status});
      return {appointment:updated,notificationId};
    });
    if(!result)return apiError("APPOINTMENT_NOT_FOUND","Appointment not found.",404);
    if("conflict" in result)return apiError("INVALID_STATUS_TRANSITION","Only confirmed appointments can change status.",409);
    if(result.notificationId)await deliverAppointmentNotification(result.notificationId).catch(error=>console.error("Could not deliver appointment cancellation email:",error));
    return NextResponse.json({data:result.appointment});
  }catch(error){
    console.error("Could not update appointment status:",error);
    return apiError("APPOINTMENT_STATUS_UPDATE_FAILED","Unable to update appointment status.",500);
  }
}
