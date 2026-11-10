import {notFound} from "next/navigation";
import {Suspense} from "react";
import {useTranslations} from "next-intl";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {DashboardSubpage} from "@/components/dashboards/dashboard-subpage";
import {AccountProfileEditor} from "@/components/auth/account-profile-editor";
import {AppointmentList} from "@/components/appointments/appointment-list";
import {requireRole} from "@/lib/auth/authorize";
import {PatientClinicalView} from "@/components/clinical/patient-clinical-view";
import {prisma} from "@/lib/prisma";
import {WaitlistManager} from "@/components/appointments/waitlist-manager";

const sectionKeys: Record<string, string> = {
  history: "history",
  profile: "profile",
  settings: "settings",
  "health-records":"healthRecords",
  prescriptions:"prescriptions",
  "waiting-list":"waitingList",
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
      initialSmsNotificationsEnabled={user.smsNotificationsEnabled}
      initialImage={user.image}
      emailVerified={user.emailVerified}
      joined={dateFormat.format(user.createdAt)}
      updated={dateFormat.format(user.updatedAt)}
      role="PATIENT"
    />;
  }
  if(section[0]==="health-records"){
    const records=await prisma.patientHealthRecord.findMany({
      where:{patientId:user.id},
      orderBy:{recordedAt:"desc"},
      take:100,
      select:{id:true,title:true,diagnosis:true,treatment:true,notes:true,recordedAt:true,createdBy:{select:{name:true}}},
    });
    return <PatientClinicalView kind="records" records={records} locale={locale}/>;
  }
  if(section[0]==="prescriptions"){
    const prescriptions=await prisma.prescription.findMany({
      where:{patientId:user.id},
      orderBy:{issuedAt:"desc"},
      take:100,
      select:{id:true,medication:true,dosage:true,frequency:true,duration:true,instructions:true,issuedAt:true,createdBy:{select:{name:true}}},
    });
    return <PatientClinicalView kind="prescriptions" prescriptions={prescriptions} locale={locale}/>;
  }
  if(section[0]==="waiting-list"){
    const [entries,services,doctors]=await Promise.all([
      prisma.appointmentWaitlistEntry.findMany({where:{patientId:user.id},orderBy:{createdAt:"desc"},include:{patient:{select:{id:true,name:true,email:true}},doctor:{select:{id:true,name:true}},service:{select:{id:true,name:true}}}}),
      prisma.service.findMany({where:{isActive:true},select:{id:true,name:true},orderBy:{name:"asc"}}),
      prisma.doctor.findMany({where:{isActive:true},select:{id:true,name:true,services:{where:{service:{isActive:true}},select:{serviceId:true}}},orderBy:{name:"asc"}}),
    ]);
    return <WaitlistManager role="patient" entries={entries} services={services} doctors={doctors.map(doctor=>({id:doctor.id,name:doctor.name,serviceIds:doctor.services.map(service=>service.serviceId)}))}/>;
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
