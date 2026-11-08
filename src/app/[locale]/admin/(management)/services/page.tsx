import {Link} from "@/i18n/navigation";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {StatusAction} from "@/components/management/status-action";
import {LiveFilters} from "@/components/management/live-filters";
import {prisma} from "@/lib/prisma";
type Props={searchParams:Promise<{q?:string;status?:string}>};
export default async function AdminServicesPage({searchParams}:Props){
  await connection();
  const [{q,status},t]=await Promise.all([searchParams,getTranslations("management")]);
  const query=q?.trim();
  const where={
    ...(status==="active"?{isActive:true}:status==="inactive"?{isActive:false}:{}),
    ...(query?{OR:[{name:{contains:query,mode:"insensitive" as const}},{description:{contains:query,mode:"insensitive" as const}}]}:{}),
  };
  const services=await prisma.service.findMany({where,orderBy:{updatedAt:"desc"},include:{_count:{select:{doctors:true,appointments:true}}}});
  return <section className="management-page">
    <header className="management-page-header"><div><span className="section-kicker">{t("adminDirectory")}</span><h1>{t("services")}</h1><p>{t("servicesHelp")}</p></div><Link className="button button-primary" href="/admin/services/new">+ {t("addService")}</Link></header>
    <LiveFilters query={q??""} category={status??"all"} queryPlaceholder={t("searchServices")} queryLabel={t("searchServices")} categoryLabel={t("filterStatus")} categories={[{value:"all",label:t("allStatuses")},{value:"active",label:t("active")},{value:"inactive",label:t("inactive")}]}/>
    {!services.length?<div className="management-empty"><h2>{t("noServices")}</h2><p>{t("noServicesHelp")}</p></div>:<div className="management-table-wrap"><table className="management-table"><thead><tr><th>{t("serviceName")}</th><th>{t("durationMinutes")}</th><th>{t("price")}</th><th>{t("doctors")}</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{services.map(service=><tr key={service.id}><td><Link className="management-primary-link" href={`/admin/services/${service.id}`}>{service.name}</Link><small>/{service.slug}</small></td><td>{service.durationMinutes} {t("minutes")}</td><td>৳{Number(service.price).toLocaleString()}</td><td>{service._count.doctors}</td><td><span className={`status-badge ${service.isActive?"is-active":"is-inactive"}`}>{service.isActive?t("active"):t("inactive")}</span></td><td><StatusAction resource="services" id={service.id} isActive={service.isActive}/></td></tr>)}</tbody></table></div>}
  </section>;
}
