import {adminAnalyticsHandler} from "@/lib/appointments/analytics.service";
export async function GET(request:Request){return adminAnalyticsHandler(request,"services")}
