import {NotificationStatus,UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {prisma} from "@/lib/prisma";

export async function GET(){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;

  try{
    const [pending,failed,items]=await Promise.all([
      prisma.notificationLog.count({where:{status:NotificationStatus.PENDING}}),
      prisma.notificationLog.count({where:{status:NotificationStatus.FAILED}}),
      prisma.notificationLog.findMany({
        orderBy:{createdAt:"desc"},
        take:5,
        select:{
          id:true,type:true,status:true,subject:true,recipientEmail:true,createdAt:true,
          appointment:{select:{
            patientName:true,
            patient:{select:{name:true}},
            doctor:{select:{name:true}},
          }},
        },
      }),
    ]);

    return Response.json({data:{pending,failed,actionable:pending+failed,items}});
  }catch(error){
    console.error("Could not load notification summary:",error);
    return apiError("NOTIFICATION_SUMMARY_FAILED","Unable to load notifications right now.",500);
  }
}
