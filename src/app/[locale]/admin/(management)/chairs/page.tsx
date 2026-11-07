import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {ChairsManager} from "@/components/management/chairs-manager";
import {prisma} from "@/lib/prisma";

export default async function AdminChairsPage(){
  await connection();
  const [chairs,t]=await Promise.all([
    prisma.chair.findMany({include:{_count:{select:{appointments:true}}},orderBy:{name:"asc"}}),
    getTranslations("management"),
  ]);
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("adminScheduling")}</span><h1>{t("clinicChairs")}</h1><p>{t("chairsHelp")}</p></div></header><ChairsManager chairs={chairs}/></section>;
}
