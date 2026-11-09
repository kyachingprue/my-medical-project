import {NextResponse} from "next/server";
import {AppointmentStatus,UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {appointmentDateRange,appointmentListQuerySchema} from "./schemas";
import {prisma} from "@/lib/prisma";

export async function listAppointments(request:Request,roles:UserRole[]){
  const access=await authorizeApi(roles);
  if(access.response)return access.response;
  const parsed=appointmentListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return apiError("INVALID_APPOINTMENT_FILTER","Appointment filters are invalid.",400,parsed.error.flatten());
  const {page,limit,date,from,to,status,period,q,doctorId,serviceId}=parsed.data;
  const now=new Date();
  const startAt:Record<string,Date>={};
  if(date){startAt.gte=appointmentDateRange(date).start;startAt.lt=appointmentDateRange(date).end}
  else if(from||to){if(from)startAt.gte=appointmentDateRange(from).start;if(to)startAt.lt=appointmentDateRange(to).end}
  else if(period==="upcoming")startAt.gte=now;
  else if(period==="previous")startAt.lt=now;
  const effectiveStatus=status??(period==="cancelled"?AppointmentStatus.CANCELLED:undefined);
  const where={
    ...(Object.keys(startAt).length?{startAt}:{}),
    ...(effectiveStatus?{status:effectiveStatus}:{}),
    ...(doctorId?{doctorId}:{}),
    ...(serviceId?{serviceId}:{}),
    ...(q?{OR:[{patientName:{contains:q,mode:"insensitive" as const}},{patientPhone:{contains:q}},{doctor:{name:{contains:q,mode:"insensitive" as const}}},{service:{name:{contains:q,mode:"insensitive" as const}}}]}:{}),
  };
  try{
    const [data,total]=await Promise.all([
      prisma.appointment.findMany({
        where,skip:(page-1)*limit,take:limit,orderBy:{startAt:period==="previous"?"desc":"asc"},
        include:{doctor:{select:{id:true,name:true,specialization:true}},service:{select:{id:true,name:true,durationMinutes:true,price:true,isOnlineConsultation:true}},chair:{select:{id:true,name:true}}},
      }),
      prisma.appointment.count({where}),
    ]);
    return NextResponse.json({data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }catch(error){
    console.error("Could not list appointments:",error);
    return apiError("APPOINTMENT_LIST_FAILED","Unable to load appointments.",500);
  }
}
