import {notFound} from "next/navigation";
import {connection} from "next/server";
import {BookingWizard} from "@/components/appointments/booking-wizard";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";
import {getTranslations} from "next-intl/server";
type Props={params:Promise<{locale:string;id:string}>};
export default async function PatientReschedulePage({params}:Props){
  await connection();
  const [{locale,id},t]=await Promise.all([params,getTranslations("appointments")]);
  const user=await requireRole("PATIENT",locale);
  const appointment=await prisma.appointment.findFirst({where:{id,patientId:user.id,status:"CONFIRMED"},select:{id:true,doctorId:true,serviceId:true,startAt:true,patientName:true,patientPhone:true}});
  if(!appointment)notFound();
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("patientPortal")}</span><h1>{t("reschedule")}</h1><p>{t("rescheduleIntroduction")}</p></div></header><BookingWizard mode="patient" appointment={{...appointment,patientPhone:appointment.patientPhone??undefined,startAt:appointment.startAt.toISOString()}}/></section>;
}
