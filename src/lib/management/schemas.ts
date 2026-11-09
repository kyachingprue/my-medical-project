import {z} from "zod";

const optionalUrl=z.preprocess(value=>value===""?null:value,z.string().url().optional().nullable());

export const doctorSchema=z.object({
  name:z.string().trim().min(2).max(120),
  email:z.string().trim().email().max(254),
  phone:z.string().trim().min(5).max(30),
  profileImage:optionalUrl,
  specialization:z.string().trim().min(2).max(120),
  qualification:z.string().trim().min(2).max(200),
  experienceYears:z.number().int().min(0).max(70),
  bio:z.string().trim().min(10).max(5000),
  isActive:z.boolean().optional(),
});
export const doctorPatchSchema=doctorSchema.partial().refine(value=>Object.keys(value).length>0);

export const serviceSchema=z.object({
  name:z.string().trim().min(2).max(120),
  slug:z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  description:z.string().trim().min(10).max(5000),
  durationMinutes:z.number().int().min(5).max(480),
  price:z.number().finite().min(0).max(99999999.99),
  image:optionalUrl,
  isActive:z.boolean().optional(),
  isOnlineConsultation:z.boolean().optional(),
});
export const servicePatchSchema=serviceSchema.partial().refine(value=>Object.keys(value).length>0);

export const weekdays=["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"] as const;
export const weekdaySchema=z.enum(weekdays);
export const timeSchema=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const workingHoursSchema=z.object({
  doctorId:z.string().min(1),
  dayOfWeek:weekdaySchema,
  startTime:timeSchema,
  endTime:timeSchema,
  isActive:z.boolean().optional(),
  copyToDays:z.array(weekdaySchema).max(6).optional(),
}).superRefine((entry,context)=>{
  const start=timeToMinutes(entry.startTime);
  const end=timeToMinutes(entry.endTime);
  if(start>=end)context.addIssue({code:"custom",path:["endTime"],message:"End time must be after start time."});
  if(entry.dayOfWeek==="FRIDAY")context.addIssue({code:"custom",path:["dayOfWeek"],message:"The clinic is closed on Fridays."});
  if(start<600||end>1200)context.addIssue({code:"custom",path:["startTime"],message:"Hours must be between 10:00 and 20:00."});
  if(start<840&&end>780)context.addIssue({code:"custom",path:["startTime"],message:"Working hours cannot overlap the 13:00–14:00 lunch break."});
});
export const workingHoursPatchSchema=z.object({
  startTime:timeSchema.optional(),
  endTime:timeSchema.optional(),
  isActive:z.boolean().optional(),
}).refine(value=>Object.keys(value).length>0);

const localDateTimeSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine(isValidDhakaDateTime,"Enter a valid Dhaka date and time.");
export const timeOffSchema=z.object({
  doctorId:z.string().min(1),
  startAt:localDateTimeSchema,
  endAt:localDateTimeSchema,
  reason:z.string().trim().min(2).max(500),
}).refine(value=>dhakaDateTimeToUtc(value.startAt)<dhakaDateTimeToUtc(value.endAt),{path:["endAt"],message:"End must be after start."});
export const timeOffPatchSchema=z.object({
  startAt:localDateTimeSchema.optional(),
  endAt:localDateTimeSchema.optional(),
  reason:z.string().trim().min(2).max(500).optional(),
}).refine(value=>Object.keys(value).length>0);

export function mergeTimeOffUpdate(current:{doctorId:string;startAt:Date;endAt:Date;reason:string},patch:z.infer<typeof timeOffPatchSchema>){
  const startAt=patch.startAt?dhakaDateTimeToUtc(patch.startAt):current.startAt;
  const endAt=patch.endAt?dhakaDateTimeToUtc(patch.endAt):current.endAt;
  const reason=patch.reason??current.reason;
  const validated=timeOffSchema.safeParse({
    doctorId:current.doctorId,
    startAt:utcToDhakaDateTime(startAt),
    endAt:utcToDhakaDateTime(endAt),
    reason,
  });
  if(!validated.success)return {success:false as const,details:validated.error.flatten()};
  return {success:true as const,data:{startAt,endAt,reason}};
}

export const chairSchema=z.object({name:z.string().trim().min(2).max(100),description:z.string().trim().max(500).optional(),isActive:z.boolean().optional()});
export const chairPatchSchema=chairSchema.partial().refine(value=>Object.keys(value).length>0);
export const doctorServicesSchema=z.object({serviceIds:z.array(z.string().min(1)).max(100)});

export function timeToMinutes(value:string){const [hours,minutes]=value.split(":").map(Number);return hours*60+minutes}

export function isValidDhakaDateTime(value:string){
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if(!match)return false;
  const [,year,month,day,hour,minute]=match.map(Number);
  if(year<2000||hour>23)return false;
  const date=new Date(Date.UTC(year,month-1,day,hour,minute));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day&&date.getUTCHours()===hour&&date.getUTCMinutes()===minute;
}

export function dhakaDateTimeToUtc(value:string){
  const [date,time]=value.split("T");
  return new Date(`${date}T${time}:00+06:00`);
}

export function utcToDhakaDateTime(value:Date){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(value);
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
