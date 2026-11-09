import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {BookingWizard} from "@/components/appointments/booking-wizard";

export default async function AdminAppointmentNewPage(){
  await connection();
  const t=await getTranslations("appointments");
  return <section className="tw-management-page grid gap-[22px] max-w-[length:1180px] m-[0_auto]"><header className="tw-management-page-header flex items-end justify-between gap-[20px] [&_h1]:m-[8px_0] [&_h1]:text-[length:clamp(28px,4vw,40px)] [&_h1]:tracking-[-1.6px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("adminAppointments")}</span><h1>{t("newAppointment")}</h1><p>{t("guestBookingIntroduction")}</p></div></header><BookingWizard mode="receptionist"/></section>;
}
