import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {AppointmentList} from "@/components/appointments/appointment-list";

export default async function PatientBookingsPage(){
  await connection();
  const [ui,dashboard]=await Promise.all([getTranslations("appointmentUi"),getTranslations("dashboard")]);
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{ui("patientPortal")}</span><h1>{dashboard("myBookings")}</h1><p>{ui("bookingIntroduction")}</p></div></header><AppointmentList role="patient" display="table" initialPeriod="all"/></section>;
}
