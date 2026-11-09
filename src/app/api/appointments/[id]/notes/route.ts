import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {z} from "zod";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {logUserAction} from "@/lib/management/audit";
import {prisma} from "@/lib/prisma";

const notesSchema=z.object({
  patientNote:z.string().trim().max(2000).optional(),
  staffNotes:z.string().trim().max(5000).optional(),
}).refine(value=>value.patientNote!==undefined||value.staffNotes!==undefined);
type Context={params:Promise<{id:string}>};

export async function PATCH(request:Request,{params}:Context){
  const access=await authorizeApi([UserRole.PATIENT,UserRole.RECEPTIONIST,UserRole.ADMIN,UserRole.DOCTOR]);
  if(access.response)return access.response;
  const parsed=notesSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_APPOINTMENT_NOTES","Appointment notes are invalid.",400);
  if(access.user.role===UserRole.PATIENT&&parsed.data.staffNotes!==undefined)return apiError("INVALID_APPOINTMENT_NOTES","Patient accounts can update only their own note.",403);
  if(access.user.role!==UserRole.PATIENT&&parsed.data.patientNote!==undefined)return apiError("INVALID_APPOINTMENT_NOTES","Staff accounts can update only clinic remarks.",403);
  const {id}=await params;
  try{
    const appointment=await prisma.$transaction(async tx=>{
      const current=await tx.appointment.findFirst({
        where:{id,...(access.user.role===UserRole.PATIENT?{patientId:access.user.id}:{}),...(access.user.role===UserRole.DOCTOR?{doctorId:access.user.doctorId??"__unassigned__"}:{})},
        select:{id:true,patientNote:true,staffNotes:true},
      });
      if(!current)return null;
      const updated=await tx.appointment.update({
        where:{id},
        data:{
          ...(parsed.data.patientNote===undefined?{}:{patientNote:parsed.data.patientNote||null}),
          ...(parsed.data.staffNotes===undefined?{}:{staffNotes:parsed.data.staffNotes||null}),
        },
        select:{id:true,patientNote:true,staffNotes:true},
      });
      await logUserAction(tx,access.user.id,"UPDATE_NOTES","Appointment",id,{
        patientNoteChanged:parsed.data.patientNote!==undefined,
        staffNotesChanged:parsed.data.staffNotes!==undefined,
      });
      return updated;
    });
    return appointment?NextResponse.json({data:appointment}):apiError("APPOINTMENT_NOT_FOUND","Appointment not found.",404);
  }catch(error){
    console.error("Could not save appointment notes:",error);
    return apiError("APPOINTMENT_NOTES_FAILED","Unable to save appointment notes.",500);
  }
}
