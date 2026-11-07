import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {BookingWizard} from "@/components/appointments/booking-wizard";

export default async function AdminAppointmentNewPage(){
  await connection();
  const t=await getTranslations("appointments");
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("adminAppointments")}</span><h1>{t("newAppointment")}</h1><p>{t("guestBookingIntroduction")}</p></div></header><BookingWizard mode="receptionist"/></section>;
}
