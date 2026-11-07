import {NextResponse} from "next/server";
import {apiError} from "@/lib/api/responses";
import {slotQuerySchema} from "@/lib/appointments/schemas";
import {generateAvailableSlots,slotErrorResponse} from "@/lib/appointments/slots.service";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  const parsed=slotQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return apiError("INVALID_SLOT_QUERY","Provide a valid doctor, service, and date.",400,parsed.error.flatten());
  try{
    const result=await generateAvailableSlots(prisma,parsed.data);
    if(result.error)return slotErrorResponse(result.error);
    return NextResponse.json({data:result.slots.map(({time,startAt,endAt,durationMinutes})=>({time,startAt:startAt.toISOString(),endAt:endAt.toISOString(),durationMinutes})),timeZone:"Asia/Dhaka",bufferMinutes:5});
  }catch(error){
    console.error("Could not load appointment slots:",error);
    return apiError("SLOT_LOOKUP_FAILED","Unable to load appointment availability.",500);
  }
}
