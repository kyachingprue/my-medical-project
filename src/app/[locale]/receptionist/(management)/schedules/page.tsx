import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {prisma} from "@/lib/prisma";

export default async function ReceptionistSchedulesPage(){
  await connection();
  const [entries,t]=await Promise.all([
    prisma.workingHours.findMany({where:{isActive:true,doctor:{isActive:true}},include:{doctor:{select:{name:true,specialization:true}}},orderBy:[{doctor:{name:"asc"}},{dayOfWeek:"asc"},{startTime:"asc"}]}),
    getTranslations("management"),
  ]);
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("receptionDesk")}</span><h1>{t("workingHours")}</h1><p>{t("schedulesHelp")}</p></div></header>{entries.length?<div className="management-card"><div className="management-table-wrap"><table className="management-table"><thead><tr><th>{t("doctor")}</th><th>{t("specialization")}</th><th>{t("weekday")}</th><th>{t("hours")}</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td>{entry.doctor.name}</td><td>{entry.doctor.specialization}</td><td>{t(`day_${entry.dayOfWeek}`)}</td><td>{entry.startTime}–{entry.endTime}</td></tr>)}</tbody></table></div></div>:<div className="management-empty"><h2>{t("noSchedule")}</h2></div>}</section>;
}
