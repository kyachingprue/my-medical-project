import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {chairSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

export async function GET(){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  try{
    const data=await prisma.chair.findMany({include:{_count:{select:{appointments:true}}},orderBy:{name:"asc"}});
    return NextResponse.json({data});
  }catch(error){console.error("Could not list chairs:",error);return apiError("CHAIR_LIST_FAILED","Unable to load clinic chairs.",500)}
}

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=chairSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_CHAIR","Chair details are invalid.",400,parsed.error.flatten());
  try{
    const chair=await prisma.$transaction(async tx=>{
      const created=await tx.chair.create({data:parsed.data});
      await logAdminAction(tx,access.user,"CREATE","Chair",created.id,{name:created.name});
      return created;
    });
    return NextResponse.json({data:chair},{status:201});
  }catch(error){
    if(isPrismaCode(error,"P2002"))return apiError("CHAIR_NAME_EXISTS","A chair with that name already exists.",409);
    console.error("Could not create chair:",error);return apiError("CHAIR_CREATE_FAILED","Unable to create the chair.",500);
  }
}

export function isPrismaCode(error:unknown,code:string){return typeof error==="object"&&error!==null&&"code" in error&&error.code===code}
