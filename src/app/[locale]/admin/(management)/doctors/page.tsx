import {Link} from "@/i18n/navigation";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {StatusAction} from "@/components/management/status-action";
import {LiveFilters} from "@/components/management/live-filters";
import {prisma} from "@/lib/prisma";

type Props={searchParams:Promise<{q?:string;status?:string}>};
export default async function AdminDoctorsPage({searchParams}:Props){
  await connection();
  const [{q,status},t]=await Promise.all([searchParams,getTranslations("management")]);
  const query=q?.trim();
  const where={
    ...(status==="active"?{isActive:true}:status==="inactive"?{isActive:false}:{}),
    ...(query?{OR:[{name:{contains:query,mode:"insensitive" as const}},{email:{contains:query,mode:"insensitive" as const}},{specialization:{contains:query,mode:"insensitive" as const}}]}:{}),
  };
  const doctors=await prisma.doctor.findMany({where,orderBy:{updatedAt:"desc"},include:{_count:{select:{services:true,appointments:true}}}});
  return <section className="management-page">
    <header className="management-page-header"><div><span className="section-kicker">{t("adminDirectory")}</span><h1>{t("doctors")}</h1><p>{t("doctorsHelp")}</p></div><Link className="button button-primary" href="/admin/doctors/new">+ {t("addDoctor")}</Link></header>
    <LiveFilters query={q??""} category={status??"all"} queryPlaceholder={t("searchDoctors")} queryLabel={t("searchDoctors")} categoryLabel={t("filterStatus")} categories={[{value:"all",label:t("allStatuses")},{value:"active",label:t("active")},{value:"inactive",label:t("inactive")}]}/>
    {!doctors.length?<div className="management-empty"><h2>{t("noDoctors")}</h2><p>{t("noDoctorsHelp")}</p></div>:<div className="management-table-wrap"><table className="management-table"><thead><tr><th>{t("doctorName")}</th><th>{t("specialization")}</th><th>{t("experienceYears")}</th><th>{t("services")}</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{doctors.map(doctor=><tr key={doctor.id}><td><Link className="management-primary-link" href={`/admin/doctors/${doctor.id}`}>{doctor.name}</Link><small>{doctor.email}</small></td><td>{doctor.specialization}</td><td>{doctor.experienceYears}</td><td>{doctor._count.services}</td><td><span className={`status-badge ${doctor.isActive?"is-active":"is-inactive"}`}>{doctor.isActive?t("active"):t("inactive")}</span></td><td><StatusAction resource="doctors" id={doctor.id} isActive={doctor.isActive}/></td></tr>)}</tbody></table></div>}
  </section>;
}
