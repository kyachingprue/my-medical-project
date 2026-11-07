import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi,readPagination} from "@/lib/api/responses";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const params=new URL(request.url).searchParams;
  const {page,limit,skip}=readPagination(params);
  const query=params.get("q")?.trim();
  const action=params.get("action")?.trim();
  const actor=params.get("actor")?.trim();
  const from=params.get("from");
  const to=params.get("to");
  const start=from?parseDate(from):undefined;
  const end=to?parseDate(to):undefined;
  if((from&&!start)||(to&&!end)||(start&&end&&start>end)){
    return apiError("INVALID_DATE_RANGE","Enter a valid audit-log date range.",400);
  }
  if(end)end.setTime(end.getTime()+86_400_000);
  const where={
    AND:[
      ...(query?[{OR:[
        {action:{contains:query,mode:"insensitive" as const}},
        {entity:{contains:query,mode:"insensitive" as const}},
        {entityId:{contains:query,mode:"insensitive" as const}},
        {actorUid:{contains:query,mode:"insensitive" as const}},
        {actorEmail:{contains:query,mode:"insensitive" as const}},
      ]}]:[]),
      ...(actor?[{OR:[
        {actorUid:{contains:actor,mode:"insensitive" as const}},
        {actorEmail:{contains:actor,mode:"insensitive" as const}},
      ]}]:[]),
      ...(action?[{action:{equals:action,mode:"insensitive" as const}}]:[]),
      ...((start||end)?[{createdAt:{...(start?{gte:start}:{}),...(end?{lt:end}:{})}}]:[]),
    ],
  };
  try{
    const [items,total]=await Promise.all([
      prisma.auditLog.findMany({where,skip,take:limit,orderBy:{createdAt:"desc"}}),
      prisma.auditLog.count({where}),
    ]);
    return NextResponse.json({data:items,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }catch(error){
    console.error("Could not load audit logs:",error);
    return apiError("AUDIT_LOG_READ_FAILED","Unable to load audit logs.",500);
  }

  function parseDate(value:string){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const date=new Date(`${value}T00:00:00+06:00`);
    return Number.isFinite(date.getTime())?date:null;
  }
}
