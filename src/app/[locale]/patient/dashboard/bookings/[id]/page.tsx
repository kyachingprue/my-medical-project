import {notFound} from "next/navigation";
import {connection} from "next/server";
import {AppointmentDetails} from "@/components/appointments/appointment-details";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";
type Props={params:Promise<{locale:string;id:string}>};
export default async function PatientAppointmentDetailsPage({params}:Props){
  await connection();
  const [{locale,id}]=await Promise.all([params]);
  const user=await requireRole("PATIENT",locale);
  const appointment=await prisma.appointment.findFirst({where:{id,patientId:user.id},include:{doctor:{select:{id:true,name:true,specialization:true}},service:{select:{id:true,name:true,durationMinutes:true,price:true}},chair:{select:{id:true,name:true}}}});
  if(!appointment)notFound();
  return <AppointmentDetails role="patient" appointment={{...appointment,startAt:appointment.startAt.toISOString(),endAt:appointment.endAt.toISOString(),service:{...appointment.service,price:Number(appointment.service.price)}}}/>;
}
