import Image from "next/image";
import {notFound} from "next/navigation";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import {prisma} from "@/lib/prisma";

type Props={params:Promise<{slug:string}>};
export default async function PublicServiceDetailsPage({params}:Props){
  await connection();
  const [{slug},t]=await Promise.all([params,getTranslations("management")]);
  const service=await prisma.service.findFirst({where:{slug,isActive:true},include:{doctors:{where:{doctor:{isActive:true}},include:{doctor:{select:{id:true,name:true,specialization:true,profileImage:true}}}}}});
  if(!service)notFound();
  return <div className="content-page"><Link href="/services" className="back-link">← {t("backToServices")}</Link><article className="directory-detail">
    {service.image?<Image className="directory-detail-image" src={service.image} alt={service.name} width={700} height={850} unoptimized/>:<div className="directory-detail-image"/>}
    <div className="directory-detail-copy"><span className="section-kicker">{t("services")}</span><h1>{service.name}</h1><div className="directory-card-meta"><span className="directory-chip">{service.durationMinutes} {t("minutes")}</span><span className="directory-chip">৳{Number(service.price).toLocaleString()}</span></div><p>{service.description}</p><div><h2>{t("eligibleDoctors")}</h2>{service.doctors.length?<ul className="management-list">{service.doctors.map(({doctor})=><li key={doctor.id}><Link href={`/doctors/${doctor.id}`}>{doctor.name} · {doctor.specialization}</Link></li>)}</ul>:<p>{t("noDoctorsListed")}</p>}</div><Link className="button button-primary" href="/appointment">{t("bookVisit")}</Link></div>
  </article></div>;
}
