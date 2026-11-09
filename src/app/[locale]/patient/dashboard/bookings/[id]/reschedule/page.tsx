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
  return <section className="tw-management-page grid gap-[22px] max-w-[length:1180px] m-[0_auto]"><header className="tw-management-page-header flex items-end justify-between gap-[20px] [&_h1]:m-[8px_0] [&_h1]:text-[length:clamp(28px,4vw,40px)] [&_h1]:tracking-[-1.6px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("patientPortal")}</span><h1>{t("reschedule")}</h1><p>{t("rescheduleIntroduction")}</p></div></header><BookingWizard mode="patient" appointment={{...appointment,patientPhone:appointment.patientPhone??undefined,startAt:appointment.startAt.toISOString()}}/></section>;
}
