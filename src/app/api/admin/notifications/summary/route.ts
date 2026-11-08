import {NotificationStatus,Prisma,UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;

  const after=new URL(request.url).searchParams.get("after");
  const afterDate=after?new Date(after):null;
  if(after&&(!afterDate||!Number.isFinite(afterDate.getTime()))){
    return apiError("INVALID_NOTIFICATION_CURSOR","Notification cursor is invalid.",400);
  }

  try{
    const serverTime=new Date().toISOString();
    const [total,pending,failed,unreadCount,latest,items]=await Promise.all([
      prisma.notificationLog.count(),
      prisma.notificationLog.count({where:{status:NotificationStatus.PENDING}}),
      prisma.notificationLog.count({where:{status:NotificationStatus.FAILED}}),
      afterDate?prisma.notificationLog.count({where:{createdAt:{gt:afterDate}}}):Promise.resolve(0),
      prisma.notificationLog.findFirst({orderBy:{createdAt:"desc"},select:{createdAt:true}}),
      prisma.notificationLog.findMany({
        orderBy:{createdAt:"desc"},
        take:20,
        select:{
          id:true,type:true,status:true,subject:true,recipientEmail:true,createdAt:true,
          appointment:{select:{
            patientName:true,
            patient:{select:{name:true}},
            doctor:{select:{name:true}},
            service:{select:{name:true}},
            startAt:true,
          }},
        },
      }),
    ]);

    return Response.json({data:{total,pending,failed,actionable:pending+failed,unreadCount,latestCreatedAt:latest?.createdAt.toISOString()??null,serverTime,items}});
  }catch(error){
    console.error("Could not load notification summary:",error);
    if(error instanceof Prisma.PrismaClientInitializationError&&error.errorCode==="P1001"){
      return apiError("DATABASE_UNAVAILABLE","The clinic database is temporarily unavailable. Please try again shortly.",503);
    }
    return apiError("NOTIFICATION_SUMMARY_FAILED","Unable to load notifications right now.",500);
  }
}
