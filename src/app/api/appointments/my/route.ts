import {NextResponse} from "next/server";
import {AppointmentStatus,UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {appointmentDateRange,appointmentListQuerySchema} from "@/lib/appointments/schemas";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  const access=await authorizeApi([UserRole.PATIENT]);
  if(access.response)return access.response;
  const parsed=appointmentListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return apiError("INVALID_APPOINTMENT_FILTER","Appointment filters are invalid.",400,parsed.error.flatten());
  const {page,limit,date,from,to,status,period,q}=parsed.data;
  const now=new Date();
  const rangeFrom=date??from;
  const rangeTo=date??to;
  const startAt:Record<string,Date>={};
  if(period==="upcoming")startAt.gte=now;
  if(period==="previous")startAt.lt=now;
  if(rangeFrom){
    const boundary=appointmentDateRange(rangeFrom).start;
    if(!startAt.gte||boundary>startAt.gte)startAt.gte=boundary;
  }
  if(rangeTo)startAt.lt=appointmentDateRange(rangeTo).end;
  const where={
    patientId:access.user.id,
    ...(status?{status}:period==="cancelled"?{status:AppointmentStatus.CANCELLED}:period==="upcoming"?{status:AppointmentStatus.CONFIRMED}:{}),
    ...(Object.keys(startAt).length?{startAt}:{}),
    ...(q?{OR:[{doctor:{name:{contains:q,mode:"insensitive" as const}}},{service:{name:{contains:q,mode:"insensitive" as const}}}]}:{}),
  };
  try{
    const [data,total]=await Promise.all([
      prisma.appointment.findMany({where,skip:(page-1)*limit,take:limit,      orderBy:{startAt:period==="upcoming"?"asc":"desc"},include:{
        doctor:{select:{id:true,name:true,specialization:true,profileImage:true}},
        service:{select:{id:true,name:true,slug:true,durationMinutes:true,price:true}},
        chair:{select:{id:true,name:true}},
      }}),
      prisma.appointment.count({where}),
    ]);
    return NextResponse.json({data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }catch(error){
    console.error("Could not list patient appointments:",error);
    return apiError("APPOINTMENT_LIST_FAILED","Unable to load your appointments.",500);
  }
}
