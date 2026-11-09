import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {DashboardSubpage} from "@/components/dashboards/dashboard-subpage";
import {AccountProfileEditor} from "@/components/auth/account-profile-editor";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";
import {WaitlistManager} from "@/components/appointments/waitlist-manager";

const sectionKeys: Record<string, string> = {
  appointments: "appointments",
  "phone-booking": "phoneBooking",
  patients: "patients",
  profile: "profile",
  schedule: "schedule",
  settings: "settings",
  "waiting-list":"waitingList",
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

async function ReceptionistSectionContent({translationKey}: {translationKey: string}) {
  if(translationKey==="waitingList"){
    const [entries,services,doctors]=await Promise.all([
      prisma.appointmentWaitlistEntry.findMany({where:{status:{in:["WAITING","CONTACTED"]}},orderBy:{createdAt:"asc"},include:{patient:{select:{id:true,name:true,email:true}},doctor:{select:{id:true,name:true}},service:{select:{id:true,name:true}}},take:500}),
      prisma.service.findMany({where:{isActive:true},select:{id:true,name:true},orderBy:{name:"asc"}}),
      prisma.doctor.findMany({where:{isActive:true},select:{id:true,name:true},orderBy:{name:"asc"}}),
    ]);
    return <WaitlistManager role="receptionist" entries={entries} services={services} doctors={doctors}/>;
  }
  const t = await getTranslations("dashboard");
  return <DashboardSubpage title={t(translationKey)} />;
}
