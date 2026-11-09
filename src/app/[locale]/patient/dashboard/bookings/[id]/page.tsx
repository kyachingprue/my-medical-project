import {Suspense} from "react";
import {notFound} from "next/navigation";
import {connection} from "next/server";
import {AppointmentDetails} from "@/components/appointments/appointment-details";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";
import {omitStaffNotes} from "@/lib/appointments/patient-data";
type Props={params:Promise<{locale:string;id:string}>};
export default function PatientAppointmentDetailsPage({params}:Props){
  return <Suspense fallback={<DashboardLoading kind="workspace" label="Loading appointment details"/>}><PatientAppointmentDetails params={params}/></Suspense>;
}

async function PatientAppointmentDetails({params}:Props){
  await connection();
  const [{locale,id}]=await Promise.all([params]);
  const user=await requireRole("PATIENT",locale);
  const appointment=await prisma.appointment.findFirst({where:{id,patientId:user.id},include:{doctor:{select:{id:true,name:true,specialization:true}},service:{select:{id:true,name:true,durationMinutes:true,price:true,isOnlineConsultation:true}},chair:{select:{id:true,name:true}}}});
  if(!appointment)notFound();
  const patientAppointment=omitStaffNotes(appointment);
  return <AppointmentDetails role="patient" appointment={{...patientAppointment,staffNotes:null,startAt:appointment.startAt.toISOString(),endAt:appointment.endAt.toISOString(),service:{...appointment.service,price:Number(appointment.service.price)}}}/>;
}
