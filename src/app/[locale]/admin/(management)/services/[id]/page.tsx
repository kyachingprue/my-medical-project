import {notFound} from "next/navigation";
import {connection} from "next/server";
import {Link} from "@/i18n/navigation";
import {getTranslations} from "next-intl/server";
import {ServiceForm} from "@/components/management/service-form";
import {prisma} from "@/lib/prisma";
type Props={params:Promise<{id:string}>};
export default async function AdminServiceDetailsPage({params}:Props){
  await connection();
  const [{id},t]=await Promise.all([params,getTranslations("management")]);
  const service=await prisma.service.findUnique({where:{id},include:{doctors:{include:{doctor:{select:{id:true,name:true,specialization:true}}}}}});
  if(!service)notFound();
  return <section className="management-page"><Link href="/admin/services" className="back-link">← {t("backToServices")}</Link><header className="management-page-header"><div><span className="section-kicker">{t("serviceDetails")}</span><h1>{service.name}</h1><p>{service.slug}</p></div><span className={`status-badge ${service.isActive?"is-active":"is-inactive"}`}>{service.isActive?t("active"):t("inactive")}</span></header><div className="management-card"><ServiceForm initial={{...service,price:Number(service.price),image:service.image??"",id:service.id}}/></div><section className="management-card"><span className="section-kicker">{t("eligibleDoctors")}</span>{service.doctors.length?<ul className="management-list">{service.doctors.map(({doctor})=><li key={doctor.id}><strong>{doctor.name}</strong><span>{doctor.specialization}</span></li>)}</ul>:<p>{t("noAssignedDoctors")}</p>}</section></section>;
}
