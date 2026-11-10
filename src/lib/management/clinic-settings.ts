import {z} from "zod";

export const clinicWeekdays=["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"] as const;

const timeSchema=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

const businessHoursEntrySchema=z.object({
  dayOfWeek:z.enum(clinicWeekdays),
  isOpen:z.boolean(),
  startTime:timeSchema,
  endTime:timeSchema,
  breakStart:timeSchema.nullable(),
  breakEnd:timeSchema.nullable(),
}).superRefine((entry,context)=>{
  if(!entry.isOpen)return;
  if(entry.startTime>=entry.endTime){
    context.addIssue({code:"custom",path:["endTime"],message:"Closing time must be after opening time."});
  }
  if((entry.breakStart===null)!==(entry.breakEnd===null)){
    context.addIssue({code:"custom",path:["breakStart"],message:"Set both break times or leave both empty."});
    return;
  }
  if(entry.breakStart&&entry.breakEnd&&(
    entry.breakStart>=entry.breakEnd||
    entry.breakStart<entry.startTime||
    entry.breakEnd>entry.endTime
  )){
    context.addIssue({code:"custom",path:["breakStart"],message:"The break must be inside the opening hours."});
  }
});

export const clinicSettingsSchema=z.object({
  bookingEnabled:z.boolean(),
  announcementEnabled:z.boolean(),
  announcement:z.string().trim().max(500),
  businessHours:z.array(businessHoursEntrySchema).length(clinicWeekdays.length),
}).superRefine((settings,context)=>{
  const days=settings.businessHours.map(entry=>entry.dayOfWeek);
  if(new Set(days).size!==clinicWeekdays.length){
    context.addIssue({code:"custom",path:["businessHours"],message:"Each weekday must be configured exactly once."});
  }
  if(settings.announcementEnabled&&!settings.announcement){
    context.addIssue({code:"custom",path:["announcement"],message:"Enter announcement text before publishing it."});
  }
});

export type ClinicSettingsInput=z.infer<typeof clinicSettingsSchema>;
