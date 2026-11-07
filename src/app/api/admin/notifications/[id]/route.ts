import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {logUserAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

type Context={params:Promise<{id:string}>};

export async function DELETE(_request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const {id}=await params;

  try{
    const deleted=await prisma.$transaction(async tx=>{
      const notification=await tx.notificationLog.findUnique({where:{id},select:{id:true,type:true,status:true}});
      if(!notification)return null;
      await tx.notificationLog.delete({where:{id}});
      await logUserAction(tx,access.user.id,"DELETE","Notification",id,{type:notification.type,status:notification.status});
      return notification;
    });
    if(!deleted)return apiError("NOT_FOUND","Notification record not found.",404);
    return Response.json({data:{id:deleted.id}});
  }catch(error){
    console.error("Could not delete notification record:",error);
    return apiError("NOTIFICATION_DELETE_FAILED","Unable to delete this notification.",500);
  }
}
