import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {omitStaffNotes} from "@/lib/appointments/patient-data";
import {prisma} from "@/lib/prisma";

type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.PATIENT,UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const {id}=await params;
  try{
    const appointment=await prisma.appointment.findFirst({
      where:{id,...(access.user.role===UserRole.PATIENT?{patientId:access.user.id}:{})},
      include:{doctor:{select:{id:true,name:true,specialization:true,profileImage:true}},service:{select:{id:true,name:true,slug:true,durationMinutes:true,price:true}},chair:{select:{id:true,name:true}},patient:{select:{id:true,name:true,phone:true,email:true}}},
    });
    if(!appointment)return apiError("APPOINTMENT_NOT_FOUND","Appointment not found.",404);
    return NextResponse.json({data:access.user.role===UserRole.PATIENT?omitStaffNotes(appointment):appointment});
  }catch(error){
    console.error("Could not load appointment details:",error);
    return apiError("APPOINTMENT_READ_FAILED","Unable to load appointment details.",500);
  }
}
