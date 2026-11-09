import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {createPatientAppointment} from "@/lib/appointments/booking.service";
import {omitStaffNotes} from "@/lib/appointments/patient-data";
import {patientBookingSchema} from "@/lib/appointments/schemas";

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.PATIENT]);
  if(access.response)return access.response;
  const parsed=patientBookingSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_APPOINTMENT","Appointment details are invalid.",400,parsed.error.flatten());
  const result=await createPatientAppointment({id:access.user.id,role:access.user.role},parsed.data);
  if(result.kind==="failure")return apiError(result.code,result.message,result.status);
  return NextResponse.json({data:omitStaffNotes(result.appointment)},{status:201});
}
