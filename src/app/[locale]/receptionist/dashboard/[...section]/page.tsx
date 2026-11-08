import {notFound} from "next/navigation";
import {useTranslations} from "next-intl";
import {DashboardSubpage} from "@/components/dashboards/dashboard-subpage";
import {AccountProfileEditor} from "@/components/auth/account-profile-editor";
import {requireRole} from "@/lib/auth/authorize";

const sectionKeys: Record<string, string> = {
  appointments: "appointments",
  "phone-booking": "phoneBooking",
  patients: "patients",
  profile: "profile",
  schedule: "schedule",
  settings: "settings",
};

export default async function ReceptionistDashboardSection({params}: {params: Promise<{locale: string; section: string[]}>}) {
  const {locale, section} = await params;
  const user=await requireRole("RECEPTIONIST", locale);
  const key = sectionKeys[section[0]];
  if (!key || section.length !== 1) notFound();
  if(section[0]==="profile"){
    const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium"});
    return <AccountProfileEditor
      initialName={user.name}
      email={user.email}
      initialPhone={user.phone??""}
      initialImage={user.image}
      emailVerified={user.emailVerified}
      joined={dateFormat.format(user.createdAt)}
      updated={dateFormat.format(user.updatedAt)}
      role="RECEPTIONIST"
    />;
  }
  return <ReceptionistSectionContent translationKey={key} />;
}

function ReceptionistSectionContent({translationKey}: {translationKey: string}) {
  const t = useTranslations("dashboard");
  return <DashboardSubpage title={t(translationKey)} />;
}
