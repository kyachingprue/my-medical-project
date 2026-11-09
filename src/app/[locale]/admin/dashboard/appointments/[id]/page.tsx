import {notFound} from "next/navigation";
import {connection} from "next/server";
import {AppointmentDetails} from "@/components/appointments/appointment-details";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";
type Props={params:Promise<{locale:string;id:string}>};
export default async function AdminAppointmentDetailsPage({params}:Props){
  await connection();
  const {locale,id}=await params;
  await requireRole("ADMIN",locale);
  const appointment=await prisma.appointment.findUnique({where:{id},include:{doctor:{select:{id:true,name:true,specialization:true}},service:{select:{id:true,name:true,durationMinutes:true,price:true,isOnlineConsultation:true}},chair:{select:{id:true,name:true}}}});
  if(!appointment)notFound();
  return <AppointmentDetails role="admin" appointment={{...appointment,startAt:appointment.startAt.toISOString(),endAt:appointment.endAt.toISOString(),service:{...appointment.service,price:Number(appointment.service.price)}}}/>;
}
