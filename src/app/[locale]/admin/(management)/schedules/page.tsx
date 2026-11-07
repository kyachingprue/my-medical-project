import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {WorkingHoursManager} from "@/components/management/working-hours-manager";
import {prisma} from "@/lib/prisma";

export default async function AdminSchedulesPage(){
  await connection();
  const [doctors,entries,t]=await Promise.all([
    prisma.doctor.findMany({where:{isActive:true},select:{id:true,name:true,specialization:true},orderBy:{name:"asc"}}),
    prisma.workingHours.findMany({include:{doctor:{select:{name:true}}},orderBy:[{doctor:{name:"asc"}},{dayOfWeek:"asc"},{startTime:"asc"}]}),
    getTranslations("management"),
  ]);
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("adminScheduling")}</span><h1>{t("workingHours")}</h1><p>{t("schedulesHelp")}</p></div></header><WorkingHoursManager doctors={doctors} entries={entries}/></section>;
}
