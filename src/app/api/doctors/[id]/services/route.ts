import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {getCurrentUser} from "@/lib/auth/session";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {doctorServicesSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

type RouteContext={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:RouteContext){
  try{
    const [{id},user]=await Promise.all([params,getCurrentUser()]);
    const doctor=await prisma.doctor.findFirst({where:{id,...(user?.role===UserRole.ADMIN?{}:{isActive:true})},include:{services:{where:{service:{isActive:true}},include:{service:true}}}});
    return doctor?NextResponse.json({data:doctor.services.map(item=>item.service)}):apiError("DOCTOR_NOT_FOUND","Doctor not found.",404);
  }catch(error){console.error("Could not load doctor services:",error);return apiError("DOCTOR_SERVICES_READ_FAILED","Unable to load doctor services.",500)}
}

export async function PUT(request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=doctorServicesSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_SERVICES","Provide a valid list of service IDs.",400,parsed.error.flatten());
  if(new Set(parsed.data.serviceIds).size!==parsed.data.serviceIds.length)return apiError("DUPLICATE_SERVICES","A service may only be assigned once.",400);
  try{
    const {id}=await params;
    const result=await prisma.$transaction(async tx=>{
      const doctor=await tx.doctor.findUnique({where:{id},select:{id:true}});
      if(!doctor)return null;
      const services=await tx.service.findMany({where:{id:{in:parsed.data.serviceIds}},select:{id:true}});
      if(services.length!==parsed.data.serviceIds.length)return {invalidServices:true as const};
      await tx.doctorService.deleteMany({where:{doctorId:id}});
      if(parsed.data.serviceIds.length)await tx.doctorService.createMany({data:parsed.data.serviceIds.map(serviceId=>({doctorId:id,serviceId}))});
      await logAdminAction(tx,access.user,"REPLACE_SERVICES","Doctor",id,{serviceIds:parsed.data.serviceIds});
      return {services:await tx.doctorService.findMany({where:{doctorId:id},include:{service:true}})};
    });
    if(!result)return apiError("DOCTOR_NOT_FOUND","Doctor not found.",404);
    if("invalidServices" in result)return apiError("SERVICE_NOT_FOUND","One or more selected services do not exist.",404);
    return NextResponse.json({data:result.services});
  }catch(error){console.error("Could not assign doctor services:",error);return apiError("DOCTOR_SERVICES_UPDATE_FAILED","Unable to update doctor services.",500)}
}
