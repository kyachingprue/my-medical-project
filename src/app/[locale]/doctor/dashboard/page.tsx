import {CalendarDays,Clock3,Video} from "lucide-react";
import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";
import {Link} from "@/i18n/navigation";

export default async function DoctorDashboardPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireRole("DOCTOR",locale);
  if(!user.doctorId)return null;
  const [appointments,t]=await Promise.all([
    prisma.appointment.findMany({
      where:{doctorId:user.doctorId,status:"CONFIRMED",endAt:{gte:new Date()}},
      orderBy:{startAt:"asc"},
      take:100,
      select:{id:true,patientName:true,startAt:true,endAt:true,videoRoomName:true,service:{select:{name:true,isOnlineConsultation:true}}},
    }),
    getTranslations("doctorPortal"),
  ]);
  const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",dateStyle:"full"});
  const timeFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"});
  return <section className="grid gap-6">
    <header className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(130deg,color-mix(in_srgb,var(--teal)_14%,var(--surface)),var(--surface)_72%)] p-6 sm:p-9">
      <span className="text-xs font-bold tracking-[.15em] text-[var(--teal)]">{t("kicker")}</span>
      <h1 className="mb-2 mt-3 text-3xl font-semibold text-[var(--text)] sm:text-4xl">{t("title")}</h1>
      <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t("description")}</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"><CalendarDays className="text-[var(--teal)]"/><div><span className="block text-xs text-[var(--muted)]">{t("upcomingAppointments")}</span><strong className="text-lg text-[var(--text)]">{appointments.length}</strong></div></article>
      <article className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"><Video className="text-[var(--teal)]"/><div><span className="block text-xs text-[var(--muted)]">{t("onlineConsultations")}</span><strong className="text-lg text-[var(--text)]">{appointments.filter(item=>item.service.isOnlineConsultation).length}</strong></div></article>
    </div>
    <section className="grid gap-3">
      <h2 className="m-0 text-xl font-semibold text-[var(--text)]">{t("schedule")}</h2>
      {!appointments.length?<p className="m-0 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">{t("noAppointments")}</p>:appointments.map(appointment=><Link key={appointment.id} href={`/doctor/dashboard/appointments/${appointment.id}`} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--teal)] sm:grid-cols-[1fr_auto] sm:items-center">
        <div><strong className="text-sm text-[var(--text)]">{appointment.patientName}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{appointment.service.name}{appointment.service.isOnlineConsultation?` · ${t("online")}`:""}</span></div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Clock3 size={15}/>{dateFormat.format(appointment.startAt)} · {timeFormat.format(appointment.startAt)}–{timeFormat.format(appointment.endAt)}</div>
      </Link>)}
    </section>
  </section>;
}
