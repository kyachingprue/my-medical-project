import {NextResponse} from "next/server";
import {AppointmentStatus,Prisma,UserRole} from "@prisma/client";
import {apiError,authorizeApi,readPagination} from "@/lib/api/responses";
import {dhakaDateTimeToUtc,timeOffSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {lockDoctorRow} from "@/lib/management/doctor-lock";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  const access=await authorizeApi([UserRole.ADMIN,UserRole.RECEPTIONIST]);
  if(access.response)return access.response;
  const params=new URL(request.url).searchParams;
  const {page,limit,skip}=readPagination(params);
  const doctorId=params.get("doctorId")||undefined;
  const period=params.get("period");
  const now=new Date();
  const where={
    ...(doctorId?{doctorId}:{}),
    ...(period==="upcoming"?{endAt:{gte:now}}:period==="previous"?{endAt:{lt:now}}:{}),
  };
  try{
    const [data,total]=await Promise.all([
      prisma.timeOff.findMany({where,skip,take:limit,include:{doctor:{select:{id:true,name:true,specialization:true,isActive:true}}},orderBy:{startAt:"asc"}}),
      prisma.timeOff.count({where}),
    ]);
    return NextResponse.json({data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)},timeZone:"Asia/Dhaka"});
  }catch(error){console.error("Could not list doctor leave:",error);return apiError("TIME_OFF_LIST_FAILED","Unable to load doctor leave.",500)}
}

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=timeOffSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_TIME_OFF","Leave details are invalid.",400,parsed.error.flatten());
  const startAt=dhakaDateTimeToUtc(parsed.data.startAt);
  const endAt=dhakaDateTimeToUtc(parsed.data.endAt);
  try{
    const result=await prisma.$transaction(async tx=>{
      if(!await lockDoctorRow(tx,parsed.data.doctorId))return {kind:"doctor-missing" as const};
      const doctor=await tx.doctor.findUnique({where:{id:parsed.data.doctorId},select:{id:true,isActive:true}});
      if(!doctor)return {kind:"doctor-missing" as const};
      if(!doctor.isActive)return {kind:"doctor-inactive" as const};
      const overlap=await tx.timeOff.findFirst({where:{doctorId:doctor.id,startAt:{lt:endAt},endAt:{gt:startAt}}});
      if(overlap)return {kind:"leave-overlap" as const};
      const appointments=await overlappingAppointments(tx,doctor.id,startAt,endAt);
      if(appointments.length)return {kind:"appointment-conflict" as const,appointments};
      const record=await tx.timeOff.create({data:{doctorId:doctor.id,startAt,endAt,reason:parsed.data.reason},include:{doctor:{select:{id:true,name:true}}}});
      await logAdminAction(tx,access.user,"CREATE","TimeOff",record.id,{doctorId:doctor.id,startAt:parsed.data.startAt,endAt:parsed.data.endAt,reason:record.reason});
      return {kind:"created" as const,record};
    },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,maxWait:10_000,timeout:20_000});
    if(result.kind==="doctor-missing")return apiError("DOCTOR_NOT_FOUND","Doctor not found.",404);
    if(result.kind==="doctor-inactive")return apiError("DOCTOR_INACTIVE","Cannot add leave for an inactive doctor.",409);
    if(result.kind==="leave-overlap")return apiError("TIME_OFF_OVERLAP","This leave overlaps another leave entry.",409);
    if(result.kind==="appointment-conflict")return apiError("TIME_OFF_APPOINTMENT_CONFLICT","Resolve the affected appointments before saving this leave.",409,{appointments:result.appointments});
    return NextResponse.json({data:result.record,timeZone:"Asia/Dhaka"},{status:201});
  }catch(error){
    if(isPrismaCode(error,"P2034"))return apiError("TIME_OFF_CONFLICT","Leave data changed concurrently. Refresh and try again.",409);
    console.error("Could not create doctor leave:",error);return apiError("TIME_OFF_CREATE_FAILED","Unable to save doctor leave.",500);
  }
}

export async function overlappingAppointments(tx:Prisma.TransactionClient,doctorId:string,startAt:Date,endAt:Date){
  return tx.appointment.findMany({
    where:{doctorId,status:{not:AppointmentStatus.CANCELLED},startAt:{lt:endAt},endAt:{gt:startAt}},
    select:{id:true,startAt:true,endAt:true,status:true,patient:{select:{name:true,email:true}},service:{select:{name:true}},chair:{select:{name:true}}},
    orderBy:{startAt:"asc"},
  });
}
export function isPrismaCode(error:unknown,code:string){return typeof error==="object"&&error!==null&&"code" in error&&error.code===code}
