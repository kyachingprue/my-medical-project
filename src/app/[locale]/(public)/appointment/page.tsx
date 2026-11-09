import {Suspense} from "react";
import {redirect} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {BookingWizard} from "@/components/appointments/booking-wizard";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {getCurrentUser} from "@/lib/auth/session";

type Props={params:Promise<{locale:string}>};

export default function AppointmentPage({params}:Props) {
  return <Suspense fallback={<DashboardLoading kind="booking" label="Loading appointment booking"/>}><AppointmentContent params={params}/></Suspense>;
}

async function AppointmentContent({params}:Props) {
  await connection();
  const {locale} = await params;
  const user = await getCurrentUser();
  const t = await getTranslations("appointments");
  const ui = await getTranslations("appointmentUi");

  if (user && user.role !== "PATIENT") redirect(`/${locale}/${user.role.toLowerCase()}/dashboard`);

  return <section className="tw-management-page grid gap-[22px] max-w-[length:1180px] m-[0_auto]">
    <header className="tw-management-page-header flex items-end justify-between gap-[20px] [&_h1]:m-[8px_0] [&_h1]:text-[length:clamp(28px,4vw,40px)] [&_h1]:tracking-[-1.6px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col">
      <div>
        <span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{ui("patientPortal")}</span>
        <h1>{t("bookAppointment")}</h1>
        <p>{ui("bookingIntroduction")}</p>
      </div>
    </header>
    <BookingWizard mode="patient" canBook={Boolean(user)} />
  </section>;
}
