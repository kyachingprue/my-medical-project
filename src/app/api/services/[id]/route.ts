import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {getCurrentUser} from "@/lib/auth/session";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {servicePatchSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

type RouteContext={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:RouteContext){
  try{
    const [{id},user]=await Promise.all([params,getCurrentUser()]);
    const service=await prisma.service.findFirst({where:{id,...(user?.role===UserRole.ADMIN?{}:{isActive:true})},include:{doctors:{where:{doctor:{isActive:true}},include:{doctor:{select:{id:true,name:true,specialization:true,qualification:true,profileImage:true}}}}}});
    return service?NextResponse.json({data:service}):apiError("SERVICE_NOT_FOUND","Service not found.",404);
  }catch(error){console.error("Could not load service:",error);return apiError("SERVICE_READ_FAILED","Unable to load this service.",500)}
}

export async function PATCH(request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=servicePatchSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_SERVICE","Service details are invalid.",400,parsed.error.flatten());
  try{
    const {id}=await params;
    const service=await prisma.$transaction(async tx=>{
      const updated=await tx.service.update({where:{id},data:parsed.data});
      await logAdminAction(tx,access.user,parsed.data.isActive===undefined?"UPDATE":"SET_STATUS","Service",id,{isActive:updated.isActive});
      return updated;
    });
    return NextResponse.json({data:service});
  }catch(error){
    if(isRecordNotFound(error))return apiError("SERVICE_NOT_FOUND","Service not found.",404);
    if(isUniqueError(error))return apiError("SERVICE_SLUG_EXISTS","A service with that slug already exists.",409);
    console.error("Could not update service:",error);return apiError("SERVICE_UPDATE_FAILED","Unable to update the service.",500);
  }
}

export async function DELETE(_request:Request,{params}:RouteContext){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  try{
    const {id}=await params;
    const service=await prisma.$transaction(async tx=>{
      const updated=await tx.service.update({where:{id},data:{isActive:false}});
      await logAdminAction(tx,access.user,"DEACTIVATE","Service",id);
      return updated;
    });
    return NextResponse.json({data:service});
  }catch(error){
    if(isRecordNotFound(error))return apiError("SERVICE_NOT_FOUND","Service not found.",404);
    console.error("Could not deactivate service:",error);return apiError("SERVICE_DEACTIVATE_FAILED","Unable to deactivate this service.",500);
  }
}

function isUniqueError(error:unknown){return typeof error==="object"&&error!==null&&"code" in error&&error.code==="P2002"}
function isRecordNotFound(error:unknown){return typeof error==="object"&&error!==null&&"code" in error&&error.code==="P2025"}
