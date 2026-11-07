import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {createReceptionistAppointment} from "@/lib/appointments/booking.service";
import {receptionistBookingSchema} from "@/lib/appointments/schemas";
import {listAppointments} from "@/lib/appointments/appointment-list.handlers";

export async function GET(request:Request){
  return listAppointments(request,[UserRole.RECEPTIONIST,UserRole.ADMIN]);
}

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=receptionistBookingSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_APPOINTMENT","Appointment details are invalid.",400,parsed.error.flatten());
  const result=await createReceptionistAppointment({id:access.user.id,role:access.user.role},parsed.data);
  if(result.kind==="failure")return apiError(result.code,result.message,result.status);
  return NextResponse.json({data:result.appointment},{status:201});
}
