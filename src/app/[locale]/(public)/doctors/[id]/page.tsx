import Image from "next/image";
import {notFound} from "next/navigation";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import {prisma} from "@/lib/prisma";

type Props={params:Promise<{id:string}>};
export default async function PublicDoctorDetailsPage({params}:Props){
  await connection();
  const [{id},t]=await Promise.all([params,getTranslations("management")]);
  const doctor=await prisma.doctor.findFirst({where:{id,isActive:true},include:{services:{where:{service:{isActive:true}},include:{service:{select:{id:true,name:true,slug:true}}}}}});
  if(!doctor)notFound();
  return <div className="content-page"><Link href="/doctors" className="back-link">← {t("backToDoctors")}</Link><article className="directory-detail">
    {doctor.profileImage?<Image className="directory-detail-image" src={doctor.profileImage} alt={doctor.name} width={700} height={850} unoptimized/>:<div className="directory-detail-image"/>}
    <div className="directory-detail-copy"><span className="section-kicker">{doctor.specialization}</span><h1>{doctor.name}</h1><span>{doctor.qualification} · {doctor.experienceYears} {t("yearsExperience")}</span><p>{doctor.bio}</p><div><h2>{t("doctorServices")}</h2>{doctor.services.length?<ul className="management-list">{doctor.services.map(({service})=><li key={service.id}><Link href={`/services/${service.slug}`}>{service.name} ↗</Link></li>)}</ul>:<p>{t("noServicesListed")}</p>}</div><Link className="button button-primary" href="/sign-in">{t("bookVisit")}</Link></div>
  </article></div>;
}
