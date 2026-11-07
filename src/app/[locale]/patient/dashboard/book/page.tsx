import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {BookingWizard} from "@/components/appointments/booking-wizard";

export default async function PatientBookingPage(){
  await connection();
  const t=await getTranslations("appointments");
  const ui=await getTranslations("appointmentUi");
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{ui("patientPortal")}</span><h1>{t("bookAppointment")}</h1><p>{ui("bookingIntroduction")}</p></div></header><BookingWizard mode="patient"/></section>;
}
