import {AppointmentStatus} from "@prisma/client";
import {z} from "zod";
import {appointmentDateSchema,slotTimeSchema} from "./time";

export const slotQuerySchema=z.object({
  doctorId:z.string().min(1),
  serviceId:z.string().min(1),
  date:appointmentDateSchema,
});

export const patientBookingSchema=slotQuerySchema.extend({time:slotTimeSchema});
export const receptionistBookingSchema=patientBookingSchema.extend({
  patientId:z.string().min(1).optional(),
  patientName:z.string().trim().min(2).max(120).optional(),
  patientPhone:z.string().trim().min(5).max(30).optional(),
}).superRefine((booking,context)=>{
  if(!booking.patientId&&(!booking.patientName||!booking.patientPhone)){
    context.addIssue({code:"custom",path:["patientName"],message:"A guest name and phone number are required."});
  }
});
export const cancellationSchema=z.object({reason:z.string().trim().max(500).optional()});
export const rescheduleSchema=patientBookingSchema;
export const appointmentStatusSchema=z.object({status:z.enum(AppointmentStatus),cancellationReason:z.string().trim().max(500).optional()});

export const appointmentListQuerySchema=z.object({
  page:z.coerce.number().int().min(1).default(1),
  limit:z.coerce.number().int().min(1).max(100).default(20),
  date:appointmentDateSchema.optional(),
  from:appointmentDateSchema.optional(),
  to:appointmentDateSchema.optional(),
  status:z.enum(AppointmentStatus).optional(),
  doctorId:z.string().min(1).optional(),
  q:z.string().trim().max(120).optional(),
  period:z.enum(["upcoming","previous","cancelled","all"]).default("upcoming"),
});

export function appointmentDateRange(date:string){
  const [year,month,day]=date.split("-").map(Number);
  const nextDate=new Date(Date.UTC(year,month-1,day+1)).toISOString().slice(0,10);
  return {start:new Date(`${date}T00:00:00+06:00`),end:new Date(`${nextDate}T00:00:00+06:00`)};
}
