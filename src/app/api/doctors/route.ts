import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {getCurrentUser} from "@/lib/auth/session";
import {apiError,authorizeApi,readPagination} from "@/lib/api/responses";
import {doctorSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  try{
    const user=await getCurrentUser();
    const params=new URL(request.url).searchParams;
    const {page,limit,skip}=readPagination(params);
    const q=params.get("q")?.trim();
    const specialization=params.get("specialization")?.trim();
    const serviceId=params.get("serviceId")?.trim();
    const status=params.get("status");
    const where={
      ...(user?.role===UserRole.ADMIN?(status==="active"?{isActive:true}:status==="inactive"?{isActive:false}:{ }):{isActive:true}),
      ...(q?{OR:[{name:{contains:q,mode:"insensitive" as const}},...(user?.role===UserRole.ADMIN?[{email:{contains:q,mode:"insensitive" as const}}]:[]),{specialization:{contains:q,mode:"insensitive" as const}}]}:{}),
      ...(specialization?{specialization:{equals:specialization,mode:"insensitive" as const}}:{}),
      ...(serviceId?{services:{some:{serviceId}}}:{}),
    };
    const [data,total]=await Promise.all([
      prisma.doctor.findMany({where,skip,take:limit,orderBy:{name:"asc"},select:{
        id:true,name:true,profileImage:true,specialization:true,qualification:true,experienceYears:true,bio:true,isActive:true,
        ...(user?.role===UserRole.ADMIN?{email:true,phone:true,createdAt:true,updatedAt:true}:{}),
        services:{where:{service:{isActive:true}},select:{service:{select:{id:true,name:true,slug:true,durationMinutes:true,price:true}}}},
      }}),
      prisma.doctor.count({where}),
    ]);
    return NextResponse.json({data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }catch(error){console.error("Could not list doctors:",error);return apiError("DOCTOR_LIST_FAILED","Unable to load doctors right now.",500)}
}

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=doctorSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_DOCTOR","Doctor details are invalid.",400,parsed.error.flatten());
  try{
    const doctor=await prisma.$transaction(async tx=>{
      const created=await tx.doctor.create({data:parsed.data});
      await logAdminAction(tx,access.user,"CREATE","Doctor",created.id,{name:created.name});
      return created;
    });
    return NextResponse.json({data:doctor},{status:201});
  }catch(error){
    if(isUniqueError(error))return apiError("DOCTOR_EMAIL_EXISTS","A doctor with that email already exists.",409);
    console.error("Could not create doctor:",error);return apiError("DOCTOR_CREATE_FAILED","Unable to create the doctor.",500);
  }
}

function isUniqueError(error:unknown):error is {code:"P2002"}{return typeof error==="object"&&error!==null&&"code" in error&&error.code==="P2002"}
