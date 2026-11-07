import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {logUserAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";
import {retryNotification} from "@/lib/notifications/email";

type Context = {params: Promise<{id: string}>};

export async function PATCH(_request: Request, {params}: Context) {
  const access = await authorizeApi([UserRole.ADMIN]);
  if (access.response) return access.response;
  const {id} = await params;
  const result = await retryNotification(id);
  if (!result) return apiError("NOT_FOUND","Notification record not found.",404);
  if ("error" in result) return apiError("NOTIFICATION_RETRY_REJECTED",result.error,result.status);
  await prisma.$transaction(tx=>logUserAction(tx,access.user.id,"RETRY","Notification",id));
  return Response.json({data: result});
}
