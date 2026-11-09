import {Suspense} from "react";
import {redirect} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {BookingWizard} from "@/components/appointments/booking-wizard";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {getCurrentUser} from "@/lib/auth/session";
import {CalendarCheck,Clock3,Mail,ShieldCheck,Stethoscope} from "lucide-react";
import type {LucideIcon} from "lucide-react";

type Props={params:Promise<{locale:string}>};

export default function AppointmentPage({params}:Props) {
  return <Suspense fallback={<DashboardLoading kind="booking" label="Loading appointment booking"/>}><AppointmentContent params={params}/></Suspense>;
}

async function AppointmentContent({params}:Props) {
  await connection();
  const {locale} = await params;
  const user = await getCurrentUser();
  const ui = await getTranslations("appointmentUi");
  const clinical = await getTranslations("clinical");

  if (user && user.role !== "PATIENT") redirect(`/${locale}/${user.role.toLowerCase()}/dashboard`);

  return <section className="mx-auto grid w-full max-w-[1180px] gap-7">
    <header className="relative overflow-hidden rounded-[26px] border border-[var(--line)] bg-[linear-gradient(125deg,color-mix(in_srgb,var(--teal)_16%,var(--surface)),var(--surface)_72%)] p-6 sm:p-9 lg:p-11">
      <div className="relative z-10 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--teal)_25%,var(--line))] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-bold tracking-[.13em] text-[var(--teal)]"><Stethoscope size={14}/>{ui("patientPortal")}</span>
        <h1 className="mb-2 mt-5 text-[clamp(30px,5vw,46px)] font-semibold tracking-[-.045em] text-[var(--text)]">{clinical("bookingTitle")}</h1>
        <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">{ui("bookingIntroduction")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)]"><ShieldCheck size={15} className="text-[var(--teal)]"/>{clinical("bookingSecure")}</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)]"><Clock3 size={15} className="text-[var(--teal)]"/>{clinical("bookingTimezone")}</span>
        </div>
      </div>
      <CalendarCheck className="absolute -bottom-8 right-4 h-36 w-36 text-[var(--teal)] opacity-[.08] sm:right-12 sm:h-52 sm:w-52"/>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      <BookingHighlight icon={Stethoscope} title={clinical("chooseCareTitle")} description={clinical("chooseCareDescription")}/>
      <BookingHighlight icon={Clock3} title={clinical("chooseTimeTitle")} description={clinical("chooseTimeDescription")}/>
      <BookingHighlight icon={Mail} title={clinical("emailConfirmationTitle")} description={clinical("emailConfirmationDescription")}/>
    </div>
    {user&&<p className="m-0 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)]"><Mail size={15} className="text-[var(--teal)]"/>{clinical("bookingConfirmationEmail")}<strong className="text-[var(--text)]">{user.email}</strong></p>}
    <BookingWizard mode="patient" canBook={Boolean(user)} />
  </section>;
}

function BookingHighlight({icon:Icon,title,description}:{icon:LucideIcon;title:string;description:string}){
  return <article className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mint)] text-[var(--teal)]"><Icon size={19}/></span><div><h2 className="m-0 text-sm font-semibold text-[var(--text)]">{title}</h2><p className="mb-0 mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p></div></article>;
}
