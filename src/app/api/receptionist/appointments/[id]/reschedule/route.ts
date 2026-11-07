import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {reschedulePatientAppointment} from "@/lib/appointments/booking.service";
import {rescheduleSchema} from "@/lib/appointments/schemas";

type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=rescheduleSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_RESCHEDULE","New appointment details are invalid.",400,parsed.error.flatten());
  const {id}=await params;
  const result=await reschedulePatientAppointment({id:access.user.id,role:access.user.role},id,parsed.data);
  if(result.kind==="failure")return apiError(result.code,result.message,result.status);
  return NextResponse.json({data:result.appointment});
}
