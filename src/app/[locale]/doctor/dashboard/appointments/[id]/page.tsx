import {notFound} from "next/navigation";
import {connection} from "next/server";
import {AppointmentDetails} from "@/components/appointments/appointment-details";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";

export default async function DoctorAppointmentDetailsPage({params}:{params:Promise<{locale:string;id:string}>}){
  await connection();
  const {locale,id}=await params;
  const user=await requireRole("DOCTOR",locale);
  if(!user.doctorId)notFound();
  const appointment=await prisma.appointment.findFirst({
    where:{id,doctorId:user.doctorId},
    include:{
      doctor:{select:{id:true,name:true,specialization:true}},
      service:{select:{id:true,name:true,durationMinutes:true,price:true,isOnlineConsultation:true}},
      chair:{select:{id:true,name:true}},
    },
  });
  if(!appointment)notFound();
  return <AppointmentDetails role="doctor" appointment={{
    ...appointment,
    startAt:appointment.startAt.toISOString(),
    endAt:appointment.endAt.toISOString(),
    service:{...appointment.service,price:Number(appointment.service.price)},
  }}/>;
}
