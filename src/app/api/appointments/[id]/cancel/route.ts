import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {cancelAppointment} from "@/lib/appointments/booking.service";
import {omitStaffNotes} from "@/lib/appointments/patient-data";
import {cancellationSchema} from "@/lib/appointments/schemas";

type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.PATIENT,UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const body=await request.json().catch(()=>({}));
  const parsed=cancellationSchema.safeParse(body);
  if(!parsed.success)return apiError("INVALID_CANCELLATION","Cancellation reason is invalid.",400,parsed.error.flatten());
  const {id}=await params;
  const result=await cancelAppointment({id:access.user.id,role:access.user.role},id,parsed.data.reason);
  if(result.kind==="failure")return apiError(result.code,result.message,result.status);
  return NextResponse.json({data:access.user.role===UserRole.PATIENT?omitStaffNotes(result.appointment):result.appointment});
}
