import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {getCurrentUser} from "@/lib/auth/session";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {doctorPatchSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

type RouteContext={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:RouteContext){
  try{
    const [{id},user]=await Promise.all([params,getCurrentUser()]);
    const doctor=await prisma.doctor.findFirst({where:{id,...(user?.role===UserRole.ADMIN?{}:{isActive:true})},select:{
      id:true,name:true,profileImage:true,specialization:true,qualification:true,experienceYears:true,bio:true,isActive:true,
      ...(user?.role===UserRole.ADMIN?{email:true,phone:true,createdAt:true,updatedAt:true}:{}),
      services:{where:{service:{isActive:true}},include:{service:true}},
      workingHours:{where:{isActive:true},orderBy:{dayOfWeek:"asc"}},
    }});
    return doctor?NextResponse.json({data:doctor}):apiError("DOCTOR_NOT_FOUND","Doctor not found.",404);
  }catch(error){console.error("Could not load doctor:",error);return apiError("DOCTOR_READ_FAILED","Unable to load this doctor.",500)}
}

export async function PATCH(request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=doctorPatchSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_DOCTOR","Doctor details are invalid.",400,parsed.error.flatten());
  try{
    const {id}=await params;
    const doctor=await prisma.$transaction(async tx=>{
      const updated=await tx.doctor.update({where:{id},data:parsed.data});
      await logAdminAction(tx,access.user,parsed.data.isActive===undefined?"UPDATE":"SET_STATUS","Doctor",id,{isActive:updated.isActive});
      return updated;
    });
    return NextResponse.json({data:doctor});
  }catch(error){
    if(isRecordNotFound(error))return apiError("DOCTOR_NOT_FOUND","Doctor not found.",404);
    if(isUniqueError(error))return apiError("DOCTOR_EMAIL_EXISTS","A doctor with that email already exists.",409);
    console.error("Could not update doctor:",error);return apiError("DOCTOR_UPDATE_FAILED","Unable to update the doctor.",500);
  }
}

export async function DELETE(_request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  try{
    const {id}=await params;
    const doctor=await prisma.$transaction(async tx=>{
      const updated=await tx.doctor.update({where:{id},data:{isActive:false}});
      await logAdminAction(tx,access.user,"DEACTIVATE","Doctor",id);
      return updated;
    });
    return NextResponse.json({data:doctor});
  }catch(error){
    if(isRecordNotFound(error))return apiError("DOCTOR_NOT_FOUND","Doctor not found.",404);
    console.error("Could not deactivate doctor:",error);return apiError("DOCTOR_DEACTIVATE_FAILED","Unable to deactivate this doctor.",500);
  }
}

function isUniqueError(error:unknown){return typeof error==="object"&&error!==null&&"code" in error&&error.code==="P2002"}
function isRecordNotFound(error:unknown){return typeof error==="object"&&error!==null&&"code" in error&&error.code==="P2025"}
