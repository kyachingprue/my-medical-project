import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {getCurrentUser} from "@/lib/auth/session";
import {apiError,authorizeApi,readPagination} from "@/lib/api/responses";
import {serviceSchema} from "@/lib/management/schemas";
import {logAdminAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  try{
    const user=await getCurrentUser();
    const params=new URL(request.url).searchParams;
    const {page,limit,skip}=readPagination(params);
    const q=params.get("q")?.trim();
    const status=params.get("status");
    const where={
      ...(user?.role===UserRole.ADMIN?(status==="active"?{isActive:true}:status==="inactive"?{isActive:false}:{ }):{isActive:true}),
      ...(q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{description:{contains:q,mode:"insensitive" as const}}]}:{}),
    };
    const [data,total]=await Promise.all([
      prisma.service.findMany({where,skip,take:limit,orderBy:{name:"asc"},include:{doctors:{where:{doctor:{isActive:true}},include:{doctor:{select:{id:true,name:true,specialization:true,profileImage:true}}}}}}),
      prisma.service.count({where}),
    ]);
    return NextResponse.json({data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }catch(error){console.error("Could not list services:",error);return apiError("SERVICE_LIST_FAILED","Unable to load services right now.",500)}
}

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=serviceSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_SERVICE","Service details are invalid.",400,parsed.error.flatten());
  try{
    const service=await prisma.$transaction(async tx=>{
      const created=await tx.service.create({data:{...parsed.data,price:parsed.data.price}});
      await logAdminAction(tx,access.user,"CREATE","Service",created.id,{name:created.name,slug:created.slug});
      return created;
    });
    return NextResponse.json({data:service},{status:201});
  }catch(error){
    if(isUniqueError(error))return apiError("SERVICE_SLUG_EXISTS","A service with that slug already exists.",409);
    console.error("Could not create service:",error);return apiError("SERVICE_CREATE_FAILED","Unable to create the service.",500);
  }
}

function isUniqueError(error:unknown){return typeof error==="object"&&error!==null&&"code" in error&&error.code==="P2002"}
