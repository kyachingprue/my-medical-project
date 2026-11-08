import {notFound} from "next/navigation";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {BookingWizard} from "@/components/appointments/booking-wizard";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";

type Props={params:Promise<{locale:string;id:string}>};

export default async function AdminReschedulePage({params}:Props){
  await connection();
  const [{locale,id},t]=await Promise.all([params,getTranslations("appointments")]);
  await requireRole("ADMIN",locale);
  const appointment=await prisma.appointment.findFirst({where:{id,status:"CONFIRMED"},select:{id:true,doctorId:true,serviceId:true,startAt:true,patientName:true,patientPhone:true}});
  if(!appointment)notFound();
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("adminAppointments")}</span><h1>{t("reschedule")}</h1><p>{t("rescheduleIntroduction")}</p></div></header><BookingWizard mode="admin" appointment={{...appointment,patientPhone:appointment.patientPhone??undefined,startAt:appointment.startAt.toISOString()}}/></section>;
}
