import {connection,NextResponse} from "next/server";
import {Prisma} from "@prisma/client";
import type {User,UserRole} from "@prisma/client";
import {getCurrentUser} from "@/lib/auth/session";

type GuardResult={user:User;response?:never}|{user?:never;response:NextResponse};

export async function authorizeApi(roles:readonly UserRole[]):Promise<GuardResult>{
  await connection();
  try{
    const user=await getCurrentUser();
    if(!user)return {response:apiError("UNAUTHENTICATED","Sign in to continue.",401)};
    if(!roles.includes(user.role))return {response:apiError("FORBIDDEN","You do not have permission to perform this action.",403)};
    return {user};
  }catch(error){
    console.error("API authorization failed:",error);
    if(error instanceof Prisma.PrismaClientInitializationError&&error.errorCode==="P1001"){
      return {response:apiError("DATABASE_UNAVAILABLE","The clinic database is temporarily unavailable. Please try again shortly.",503)};
    }
    return {response:apiError("AUTHORIZATION_FAILED","Unable to verify your access right now.",500)};
  }
}

export function apiError(code:string,message:string,status:number,details?:unknown){
  return NextResponse.json({error:{code,message,...(details===undefined?{}:{details})}},{status});
}

export function readPagination(searchParams:URLSearchParams){
  const rawPage=Number(searchParams.get("page")??"1");
  const rawLimit=Number(searchParams.get("limit")??"20");
  const page=Number.isInteger(rawPage)&&rawPage>0?rawPage:1;
  const limit=Number.isInteger(rawLimit)&&rawLimit>0?Math.min(rawLimit,100):20;
  return {page,limit,skip:(page-1)*limit};
}
