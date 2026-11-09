import {NextResponse} from "next/server";
import {UserRole} from "@prisma/client";
import {z} from "zod";
import {apiError,authorizeApi} from "@/lib/api/responses";
import {prisma} from "@/lib/prisma";
import {logAdminAction} from "@/lib/management/audit";

const recordSchema=z.object({
  type:z.literal("record"),
  patientId:z.string().min(1),
  title:z.string().trim().min(2).max(160),
  diagnosis:z.string().trim().min(2).max(10_000),
  treatment:z.string().trim().min(2).max(10_000),
  notes:z.string().trim().max(10_000).optional(),
});

const prescriptionSchema=z.object({
  type:z.literal("prescription"),
  patientId:z.string().min(1),
  medication:z.string().trim().min(2).max(200),
  dosage:z.string().trim().min(1).max(120),
  frequency:z.string().trim().min(2).max(160),
  duration:z.string().trim().min(1).max(120),
  instructions:z.string().trim().max(10_000).optional(),
});

const clinicalEntrySchema=z.discriminatedUnion("type",[recordSchema,prescriptionSchema]);

export async function POST(request:Request){
  const access=await authorizeApi([UserRole.ADMIN]);
  if(access.response)return access.response;

  const parsed=clinicalEntrySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("INVALID_CLINICAL_ENTRY","Clinical entry details are invalid.",400);

  try{
    const patient=await prisma.user.findFirst({
      where:{id:parsed.data.patientId,role:UserRole.PATIENT},
      select:{id:true},
    });
    if(!patient)return apiError("PATIENT_NOT_FOUND","Patient account not found.",404);

    if(parsed.data.type==="record"){
      const {patientId,title,diagnosis,treatment,notes}=parsed.data;
      const record=await prisma.$transaction(async tx=>{
        const created=await tx.patientHealthRecord.create({
          data:{patientId,createdById:access.user.id,title,diagnosis,treatment,notes:notes||null},
          include:{patient:{select:{name:true}},createdBy:{select:{name:true}}},
        });
        await logAdminAction(tx,access.user,"CREATE","PatientHealthRecord",created.id,{patientId});
        return created;
      });
      return NextResponse.json({data:{type:"record",entry:record}},{status:201});
    }

    const {patientId,medication,dosage,frequency,duration,instructions}=parsed.data;
    const prescription=await prisma.$transaction(async tx=>{
      const created=await tx.prescription.create({
        data:{patientId,createdById:access.user.id,medication,dosage,frequency,duration,instructions:instructions||null},
        include:{patient:{select:{name:true}},createdBy:{select:{name:true}}},
      });
      await logAdminAction(tx,access.user,"CREATE","Prescription",created.id,{patientId});
      return created;
    });
    return NextResponse.json({data:{type:"prescription",entry:prescription}},{status:201});
  }catch(error){
    console.error("Could not save patient clinical information:",error);
    return apiError("CLINICAL_ENTRY_FAILED","Could not save this clinical entry.",500);
  }
}
