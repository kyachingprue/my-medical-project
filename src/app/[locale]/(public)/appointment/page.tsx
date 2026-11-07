import {redirect} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {BookingWizard} from "@/components/appointments/booking-wizard";
import {getCurrentUser} from "@/lib/auth/session";

export default async function AppointmentPage({params}: {params: Promise<{locale: string}>}) {
  await connection();
  const {locale} = await params;
  const user = await getCurrentUser();
  const t = await getTranslations("appointments");
  const ui = await getTranslations("appointmentUi");

  if (user && user.role !== "PATIENT") redirect(`/${locale}/${user.role.toLowerCase()}/dashboard`);

  return <section className="management-page">
    <header className="management-page-header">
      <div>
        <span className="section-kicker">{ui("patientPortal")}</span>
        <h1>{t("bookAppointment")}</h1>
        <p>{ui("bookingIntroduction")}</p>
      </div>
    </header>
    <BookingWizard mode="patient" canBook={Boolean(user)} />
  </section>;
}
