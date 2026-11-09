import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {logUserAction} from "@/lib/management/audit";
import {retryIntegration} from "@/lib/integrations/appointments";
import {prisma} from "@/lib/prisma";

type Context={params:Promise<{id:string}>};
export async function PATCH(_request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;
  const {id}=await params;
  try{
    const result=await retryIntegration(id);
    if(!result)return apiError("NOT_FOUND","Integration record not found.",404);
    if("error" in result)return apiError("INTEGRATION_RETRY_REJECTED",result.error,result.status);
    await prisma.$transaction(tx=>logUserAction(tx,access.user.id,"RETRY","IntegrationLog",id));
    if(result.status==="FAILED")return apiError("INTEGRATION_DELIVERY_FAILED","Integration retry failed. Review server settings before trying again.",502);
    return Response.json({data:result});
  }catch(error){
    console.error("Could not retry integration delivery:",error);
    return apiError("INTEGRATION_RETRY_FAILED","Unable to retry this integration delivery.",500);
  }
}
