import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {prisma} from "@/lib/prisma";

export default async function ReceptionistServicesPage(){
  await connection();
  const [services,t]=await Promise.all([
    prisma.service.findMany({where:{isActive:true},include:{doctors:{where:{doctor:{isActive:true}},include:{doctor:{select:{name:true}}}}},orderBy:{name:"asc"}}),
    getTranslations("management"),
  ]);
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("receptionDesk")}</span><h1>{t("services")}</h1><p>{t("servicesHelp")}</p></div></header>{services.length?<div className="management-card"><div className="management-table-wrap"><table className="management-table"><thead><tr><th>{t("serviceName")}</th><th>{t("durationMinutes")}</th><th>{t("price")}</th><th>{t("eligibleDoctors")}</th></tr></thead><tbody>{services.map(service=><tr key={service.id}><td><strong>{service.name}</strong><small>{service.description}</small></td><td>{service.durationMinutes} {t("minutes")}</td><td>৳{Number(service.price).toLocaleString()}</td><td>{service.doctors.map(({doctor})=>doctor.name).join(", ")||"—"}</td></tr>)}</tbody></table></div></div>:<div className="management-empty"><h2>{t("noServices")}</h2><p>{t("noServicesHelp")}</p></div>}</section>;
}
