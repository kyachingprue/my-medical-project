import {notFound} from "next/navigation";
import {Suspense} from "react";
import {useTranslations} from "next-intl";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {DashboardSubpage} from "@/components/dashboards/dashboard-subpage";
import {ProfileEditor} from "@/components/auth/profile-editor";
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
  if (section[0] === "profile") return <ProfileEditor initialName={user.name} initialPhone={user.phone ?? ""} emailVerified={user.emailVerified} />;
  return <PatientSectionContent translationKey={key} />;
}

function PatientSectionContent({translationKey}: {translationKey: string}) {
  const t = useTranslations("dashboard");
  if (translationKey === "history") return <section className="dashboard-subpage">
    <header className="dashboard-subpage-header"><h1>{t("history")}</h1></header>
    <AppointmentList role="patient" display="table" initialPeriod="all"/>
  </section>;
  return <DashboardSubpage title={t(translationKey)} />;
}
