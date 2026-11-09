import {NextResponse} from "next/server";
import {UserRole,WaitlistStatus} from "@prisma/client";
import {z} from "zod";
import {apiError,authorizeApi,readPagination} from "@/lib/api/responses";
import {addBusinessDays,businessDateAt,appointmentDateSchema} from "@/lib/appointments/time";
import {logUserAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

const createSchema=z.object({
  serviceId:z.string().min(1),
  doctorId:z.string().min(1).optional(),
  fromDate:appointmentDateSchema,
  throughDate:appointmentDateSchema,
  notes:z.string().trim().max(1000).optional(),
}).superRefine((entry,context)=>{
  const today=businessDateAt(new Date());
  if(entry.fromDate<today)context.addIssue({code:"custom",path:["fromDate"],message:"Start date cannot be in the past."});
  if(entry.throughDate<entry.fromDate)context.addIssue({code:"custom",path:["throughDate"],message:"End date must be on or after the start date."});
  if(entry.throughDate>addBusinessDays(today,30))context.addIssue({code:"custom",path:["throughDate"],message:"Waiting list requests are limited to the next 30 days."});
});

export async function GET(request:Request){
  const access=await authorizeApi([UserRole.PATIENT,UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const params=new URL(request.url).searchParams;
  const {page,limit,skip}=readPagination(params);
  const where=access.user.role===UserRole.PATIENT?{patientId:access.user.id}:params.get("status")&&Object.values(WaitlistStatus).includes(params.get("status") as WaitlistStatus)?{status:params.get("status") as WaitlistStatus}:{};
  try{
    const [data,total]=await Promise.all([
      prisma.appointmentWaitlistEntry.findMany({
        where,skip,take:limit,orderBy:{createdAt:"desc"},
        include:{patient:{select:{id:true,name:true,email:true}},doctor:{select:{id:true,name:true}},service:{select:{id:true,name:true}}},
      }),
      prisma.appointmentWaitlistEntry.count({where}),
    ]);
    return NextResponse.json({data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }catch(error){
    console.error("Could not load appointment waiting list:",error);
    return apiError("WAITLIST_READ_FAILED","Unable to load the waiting list.",500);
  }
}

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.PATIENT]);
  if(access.response)return access.response;
  const parsed=createSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_WAITLIST_ENTRY","Waiting list details are invalid.",400);
  try{
    const entry=await prisma.$transaction(async tx=>{
      const service=await tx.service.findFirst({where:{id:parsed.data.serviceId,isActive:true},select:{id:true}});
      if(!service)return {kind:"service-missing" as const};
      if(parsed.data.doctorId){
        const assignment=await tx.doctorService.findFirst({where:{doctorId:parsed.data.doctorId,serviceId:service.id,doctor:{isActive:true}},select:{doctorId:true}});
        if(!assignment)return {kind:"doctor-unavailable" as const};
      }
      const created=await tx.appointmentWaitlistEntry.create({
        data:{
          patientId:access.user.id,
          serviceId:service.id,
          doctorId:parsed.data.doctorId??null,
          fromDate:new Date(`${parsed.data.fromDate}T00:00:00.000Z`),
          throughDate:new Date(`${parsed.data.throughDate}T00:00:00.000Z`),
          notes:parsed.data.notes||null,
        },
        include:{patient:{select:{id:true,name:true,email:true}},doctor:{select:{id:true,name:true}},service:{select:{id:true,name:true}}},
      });
      await logUserAction(tx,access.user.id,"CREATE","AppointmentWaitlistEntry",created.id,{serviceId:created.serviceId,doctorId:created.doctorId});
      return {kind:"created" as const,entry:created};
    });
    if(entry.kind==="service-missing")return apiError("SERVICE_NOT_FOUND","Service not found.",404);
    if(entry.kind==="doctor-unavailable")return apiError("DOCTOR_SERVICE_UNAVAILABLE","This doctor is not available for the selected service.",409);
    return NextResponse.json({data:entry.entry},{status:201});
  }catch(error){
    console.error("Could not add waiting list entry:",error);
    return apiError("WAITLIST_CREATE_FAILED","Unable to add this request to the waiting list.",500);
  }
}
