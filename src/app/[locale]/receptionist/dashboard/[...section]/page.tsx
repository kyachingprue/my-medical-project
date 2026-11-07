import {notFound} from "next/navigation";
import {useTranslations} from "next-intl";
import {DashboardSubpage} from "@/components/dashboards/dashboard-subpage";
import {requireRole} from "@/lib/auth/authorize";

const sectionKeys: Record<string, string> = {
  appointments: "appointments",
  "phone-booking": "phoneBooking",
  patients: "patients",
  schedule: "schedule",
  settings: "settings",
};

export default async function ReceptionistDashboardSection({params}: {params: Promise<{locale: string; section: string[]}>}) {
  const {locale, section} = await params;
  await requireRole("RECEPTIONIST", locale);
  const key = sectionKeys[section[0]];
  if (!key || section.length !== 1) notFound();
  return <ReceptionistSectionContent translationKey={key} />;
}

function ReceptionistSectionContent({translationKey}: {translationKey: string}) {
  const t = useTranslations("dashboard");
  return <DashboardSubpage title={t(translationKey)} />;
}
