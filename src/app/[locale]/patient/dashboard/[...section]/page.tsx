import {notFound} from "next/navigation";
import {Suspense} from "react";
import {useTranslations} from "next-intl";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {DashboardSubpage} from "@/components/dashboards/dashboard-subpage";
import {AccountProfileEditor} from "@/components/auth/account-profile-editor";
import {AppointmentList} from "@/components/appointments/appointment-list";
import {requireRole} from "@/lib/auth/authorize";

const sectionKeys: Record<string, string> = {
  history: "history",
  profile: "profile",
  settings: "settings",
};

export default function PatientDashboardSection({params}: {params: Promise<{locale: string; section: string[]}>}) {
  return <Suspense fallback={<DashboardLoading kind="dashboard" label="Loading your dashboard"/>}>
    <PatientDashboardSectionContent params={params}/>
  </Suspense>;
}

async function PatientDashboardSectionContent({params}: {params: Promise<{locale: string; section: string[]}>}) {
  const {locale, section} = await params;
  const user = await requireRole("PATIENT", locale);
  const key = sectionKeys[section[0]];
  if (!key || section.length !== 1) notFound();
  if (section[0] === "profile") {
    const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium"});
    return <AccountProfileEditor
      initialName={user.name}
      email={user.email}
      initialPhone={user.phone??""}
      initialImage={user.image}
      emailVerified={user.emailVerified}
      joined={dateFormat.format(user.createdAt)}
      updated={dateFormat.format(user.updatedAt)}
      role="PATIENT"
    />;
  }
  return <PatientSectionContent translationKey={key} />;
}

function PatientSectionContent({translationKey}: {translationKey: string}) {
  const t = useTranslations("dashboard");
  if (translationKey === "history") return <section className="tw-dashboard-subpage min-h-[380px] p-[25px] [background:var(--surface)] [border:1px_solid_var(--line)] rounded-[12px] [&_h1]:block [&_h1]:text-center [&>p]:block [&>p]:text-center [&_h1]:text-[length:25px] [&_h1]:m-[9px] [&>p]:max-w-[length:450px] [&>p]:m-[0_auto] [&>p]:[color:var(--muted)] [&>p]:text-[length:11px] [&>p]:leading-[1.7]">
    <header className="dashboard-subpage-header"><h1>{t("history")}</h1></header>
    <AppointmentList role="patient" display="table" initialPeriod="all"/>
  </section>;
  return <DashboardSubpage title={t(translationKey)} />;
}
