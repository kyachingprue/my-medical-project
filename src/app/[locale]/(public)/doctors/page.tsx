import Image from "next/image";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import {prisma} from "@/lib/prisma";

type Props={searchParams:Promise<{q?:string}>};
export default async function DoctorsPage({searchParams}:Props){
  await connection();
  const [{q},page,management]=await Promise.all([searchParams,getTranslations("pages.doctors"),getTranslations("management")]);
  const query=q?.trim();
  const doctors=await prisma.doctor.findMany({
    where:{isActive:true,...(query?{OR:[{name:{contains:query,mode:"insensitive"}},{specialization:{contains:query,mode:"insensitive"}}]}:{})},
    select:{id:true,name:true,profileImage:true,specialization:true,qualification:true,experienceYears:true,bio:true},
    orderBy:{name:"asc"},
  });
  return <div className="content-page">
    <section className="page-hero"><span className="section-kicker">{page("kicker")}</span><h1>{page("title")} <em>{page("accent")}</em></h1><p>{page("lead")}</p></section>
    <form className="directory-search"><input type="search" name="q" defaultValue={query} placeholder={management("searchDoctors")} aria-label={management("searchDoctors")}/><button className="button button-primary">{management("search")}</button></form>
    {doctors.length?<section className="directory-grid" aria-label={page("teamTitle")}>{doctors.map(doctor=><article className="directory-card" key={doctor.id}>
      {doctor.profileImage?<Image className="directory-card-image" src={doctor.profileImage} alt={doctor.name} width={480} height={440} unoptimized/>:<div className="directory-card-image"/>}
      <div className="directory-card-body"><h2>{doctor.name}</h2><span className="directory-chip">{doctor.specialization}</span><p>{doctor.qualification} · {doctor.experienceYears} {management("yearsExperience")}</p><p>{doctor.bio.length>170?`${doctor.bio.slice(0,167)}…`:doctor.bio}</p><Link className="directory-cta" href={`/doctors/${doctor.id}`}>{management("viewProfile")} ↗</Link></div>
    </article>)}</section>:<div className="public-empty">{query?management("noSearchResults"):management("noDoctors")}</div>}
  </div>;
}
