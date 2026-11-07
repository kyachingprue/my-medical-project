import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {TimeOffManager} from "@/components/management/time-off-manager";
import {prisma} from "@/lib/prisma";

export default async function AdminTimeOffPage(){
  await connection();
  const [doctors,entries,t]=await Promise.all([
    prisma.doctor.findMany({where:{isActive:true},select:{id:true,name:true,specialization:true},orderBy:{name:"asc"}}),
    prisma.timeOff.findMany({where:{endAt:{gte:new Date()}},include:{doctor:{select:{name:true}}},orderBy:{startAt:"asc"}}),
    getTranslations("management"),
  ]);
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("adminScheduling")}</span><h1>{t("doctorLeave")}</h1><p>{t("timeOffHelp")}</p></div></header><TimeOffManager doctors={doctors} entries={entries}/></section>;
}
