import {NextResponse} from "next/server";
import {Prisma,UserRole} from "@prisma/client";
import {z} from "zod";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {logAdminAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

const schema=z.object({role:z.nativeEnum(UserRole)});
type Context={params:Promise<{id:string}>};

export async function PATCH(request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_ROLE","Choose a valid user role.",400);
  const {id}=await params;
  if(id===access.user.id&&parsed.data.role!==UserRole.ADMIN)return apiError("CANNOT_CHANGE_OWN_ROLE","You cannot remove your own Admin role.",409);

  try{
    const result=await prisma.$transaction(async tx=>{
      const current=await tx.user.findUnique({where:{id},select:{id:true,role:true}});
      if(!current)return {kind:"missing" as const};
      if(current.role===parsed.data.role)return {kind:"unchanged" as const,role:current.role};
      if(current.role===UserRole.ADMIN&&parsed.data.role!==UserRole.ADMIN){
        const admins=await tx.user.count({where:{role:UserRole.ADMIN}});
        if(admins<=1)return {kind:"last-admin" as const};
      }
      const updated=await tx.user.update({where:{id},data:{role:parsed.data.role},select:{id:true,role:true}});
      await logAdminAction(tx,access.user,"ROLE_CHANGE","User",id,{roleBefore:current.role,roleAfter:updated.role});
      return {kind:"updated" as const,user:updated};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    if(result.kind==="missing")return apiError("USER_NOT_FOUND","User not found.",404);
    if(result.kind==="last-admin")return apiError("LAST_ADMIN_REQUIRED","At least one Admin account must remain.",409);
    if(result.kind==="unchanged")return NextResponse.json({data:{id,role:result.role}});
    return NextResponse.json({data:result.user});
  }catch(error){
    if(typeof error==="object"&&error!==null&&"code" in error&&error.code==="P2034")return apiError("ROLE_CHANGE_CONFLICT","User roles changed concurrently. Refresh and try again.",409);
    console.error("Could not update user role:",error);
    return apiError("ROLE_UPDATE_FAILED","Unable to update the user role.",500);
  }
}
