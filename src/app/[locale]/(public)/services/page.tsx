import Image from "next/image";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import {prisma} from "@/lib/prisma";

type Props={searchParams:Promise<{q?:string}>};
export default async function ServicesPage({searchParams}:Props){
  await connection();
  const [{q},page,management]=await Promise.all([searchParams,getTranslations("pages.services"),getTranslations("management")]);
  const query=q?.trim();
  const services=await prisma.service.findMany({
    where:{isActive:true,...(query?{OR:[{name:{contains:query,mode:"insensitive"}},{description:{contains:query,mode:"insensitive"}}]}:{})},
    include:{doctors:{where:{doctor:{isActive:true}},include:{doctor:{select:{id:true,name:true,specialization:true}}}}},
    orderBy:{name:"asc"},
  });
  return <div className="content-page">
    <section className="page-hero"><span className="section-kicker">{page("kicker")}</span><h1>{page("title")} <em>{page("accent")}</em></h1><p>{page("lead")}</p></section>
    <form className="directory-search"><input type="search" name="q" defaultValue={query} placeholder={management("searchServices")} aria-label={management("searchServices")}/><button className="button button-primary">{management("search")}</button></form>
    {services.length?<section className="directory-grid" aria-label={page("title")}>{services.map(service=><article className="directory-card" key={service.id}>
      {service.image?<Image className="directory-card-image" src={service.image} alt={service.name} width={480} height={440} unoptimized/>:<div className="directory-card-image"/>}
      <div className="directory-card-body"><h2>{service.name}</h2><div className="directory-card-meta"><span className="directory-chip">{service.durationMinutes} {management("minutes")}</span><span className="directory-chip">৳{Number(service.price).toLocaleString()}</span></div><p>{service.description.length>180?`${service.description.slice(0,177)}…`:service.description}</p><p>{management("eligibleDoctors")}: {service.doctors.map(({doctor})=>doctor.name).join(", ")||"—"}</p><Link className="directory-cta" href={`/services/${service.slug}`}>{management("viewDetails")} ↗</Link></div>
    </article>)}</section>:<div className="public-empty">{query?management("noSearchResults"):management("noServices")}</div>}
  </div>;
}
