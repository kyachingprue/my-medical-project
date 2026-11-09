import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {processPendingNotifications,queueDueAppointmentReminders} from "@/lib/notifications/email";
import {processPendingIntegrations} from "@/lib/integrations/appointments";

export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret)return NextResponse.json({error:"Notification processing is not configured."},{status:503});
  const authorization=request.headers.get("authorization")??"";
  const provided=authorization.replace(/^Bearer\s+/i,"");
  if(!provided||provided.length!==secret.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(secret))){
    return NextResponse.json({error:"Unauthorized."},{status:401});
  }
  try{
    const remindersQueued=await queueDueAppointmentReminders();
    const processed=await processPendingNotifications(20);
    const integrationsProcessed=await processPendingIntegrations(20);
    return NextResponse.json({remindersQueued,processed,integrationsProcessed});
  }catch(error){
    console.error("Scheduled notification processing failed:",error);
    return NextResponse.json({error:"Unable to process pending notifications."},{status:500});
  }
}
