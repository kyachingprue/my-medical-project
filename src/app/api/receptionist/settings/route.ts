import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {clinicSettingsSchema,clinicWeekdays} from "@/lib/management/clinic-settings";
import {logAdminAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

const clinicId="clinic";

export async function GET(){
  const access=await authorizeApi([UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  try{
    const [settings,businessHours]=await Promise.all([
      prisma.clinicSettings.findUnique({where:{id:clinicId}}),
      prisma.clinicBusinessHours.findMany({orderBy:{dayOfWeek:"asc"}}),
    ]);
    if(!settings||businessHours.length!==clinicWeekdays.length){
      return apiError("CLINIC_SETTINGS_UNAVAILABLE","Clinic settings have not been initialized.",503);
    }
    return NextResponse.json({data:{
      bookingEnabled:settings.bookingEnabled,
      announcementEnabled:settings.announcementEnabled,
      announcement:settings.announcement??"",
      businessHours,
    }});
  }catch(error){
    console.error("Could not load clinic settings:",error);
    return apiError("CLINIC_SETTINGS_LOAD_FAILED","Unable to load clinic settings.",500);
  }
}

export async function PATCH(request:Request){
  const access=await authorizeApi([UserRole.RECEPTIONIST,UserRole.ADMIN]);
  if(access.response)return access.response;
  const parsed=clinicSettingsSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_CLINIC_SETTINGS","Clinic settings are invalid.",400,parsed.error.flatten());
  try{
    const saved=await prisma.$transaction(async tx=>{
      const settings=await tx.clinicSettings.upsert({
        where:{id:clinicId},
        update:{
          bookingEnabled:parsed.data.bookingEnabled,
          announcementEnabled:parsed.data.announcementEnabled,
          announcement:parsed.data.announcement||null,
        },
        create:{
          id:clinicId,
          bookingEnabled:parsed.data.bookingEnabled,
          announcementEnabled:parsed.data.announcementEnabled,
          announcement:parsed.data.announcement||null,
        },
      });
      for(const entry of parsed.data.businessHours){
        await tx.clinicBusinessHours.upsert({
          where:{dayOfWeek:entry.dayOfWeek},
          update:{
            isOpen:entry.isOpen,
            startTime:entry.startTime,
            endTime:entry.endTime,
            breakStart:entry.breakStart,
            breakEnd:entry.breakEnd,
          },
          create:entry,
        });
      }
      await logAdminAction(tx,access.user,"UPDATE","ClinicSettings",clinicId,{
        bookingEnabled:settings.bookingEnabled,
        announcementEnabled:settings.announcementEnabled,
        announcement:settings.announcement,
        businessHours:parsed.data.businessHours,
      });
      return settings;
    },{maxWait:10_000,timeout:20_000});
    return NextResponse.json({data:{...saved,businessHours:parsed.data.businessHours}});
  }catch(error){
    console.error("Could not save clinic settings:",error);
    return apiError("CLINIC_SETTINGS_SAVE_FAILED","Unable to save clinic settings.",500);
  }
}
