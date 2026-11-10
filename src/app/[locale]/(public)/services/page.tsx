import Image from "next/image";
import {Suspense} from "react";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import {prisma} from "@/lib/prisma";
import {getServiceDirectoryImage} from "@/lib/public-directory-images";
import {PublicDirectoryLoading} from "@/components/common/public-directory-loading";

type Props={searchParams:Promise<{q?:string}>};
export default function ServicesPage({searchParams}:Props){
  return <Suspense fallback={<PublicDirectoryLoading label="Loading services"/>}><ServicesDirectory searchParams={searchParams}/></Suspense>;
}

async function ServicesDirectory({searchParams}:Props){
  await connection();
  const [{q},page,management]=await Promise.all([searchParams,getTranslations("pages.services"),getTranslations("management")]);
  const query=q?.trim();
  const services=await prisma.service.findMany({
    where:{isActive:true,...(query?{OR:[{name:{contains:query,mode:"insensitive"}},{description:{contains:query,mode:"insensitive"}}]}:{})},
    include:{doctors:{where:{doctor:{isActive:true}},include:{doctor:{select:{id:true,name:true,specialization:true}}}}},
    orderBy:{name:"asc"},
  });
  return <div className="tw-content-page max-w-[length:1184px] m-[auto] p-[50px_24px_75px] [@media(max-width:760px)]:p-[24px_17px_55px]">
    <section className="tw-page-hero [&_h1_em]:[font-family:Georgia,serif] [&_h1_em]:[color:var(--teal)] [&_h1_em]:font-normal text-center p-[55px_10px_62px] [&_h1]:text-[length:clamp(40px,6vw,65px)] [&_h1]:tracking-[-3px] [&_h1]:leading-[1.1] [&_h1]:m-[16px_auto] [&_h1]:max-w-[length:800px] [&_p]:max-w-[length:570px] [&_p]:m-[auto] [&_p]:[color:var(--muted)] [&_p]:text-[length:14px] [&_p]:leading-[1.8] [@media(max-width:760px)]:p-[38px_5px_42px] [@media(max-width:760px)]:[&_h1]:text-[length:43px] [@media(max-width:760px)]:[&_h1]:tracking-[-2px] [@media(max-width:760px)]:[&_p]:text-[length:12px]"><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{page("kicker")}</span><h1>{page("title")} <em>{page("accent")}</em></h1><p>{page("lead")}</p></section>
    <form className="tw-directory-search flex gap-[10px] max-w-[length:600px] m-[0_auto_25px] [&_input]:flex-[1] [&_input]:min-w-[length:0] [&_input]:p-[11px_14px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--surface)] [&_input]:[color:var(--text)]"><input type="search" name="q" defaultValue={query} placeholder={management("searchServices")} aria-label={management("searchServices")}/><button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]">{management("search")}</button></form>
    {services.length?<section className="tw-directory-grid grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[18px] [@media(max-width:900px)]:grid-cols-[repeat(2,minmax(0,1fr))] [@media(max-width:650px)]:grid-cols-[1fr]" aria-label={page("title")}>{services.map(service=>{const image=getServiceDirectoryImage(service.image,service.slug);return <article className="tw-directory-card overflow-hidden [border:1px_solid_var(--line)] rounded-[15px] [background:var(--surface)] shadow-[var(--shadow)]" key={service.id}>
      {image?<Image className="tw-directory-card-image w-[100%] h-[220px] object-cover [background:var(--mint)]" src={image} alt={service.name} width={480} height={440} unoptimized/>:<div className="tw-directory-card-image w-[100%] h-[220px] object-cover [background:var(--mint)]"/>}
      <div className="tw-directory-card-body grid gap-[9px] p-[18px] [&_h2]:m-[0] [&_h2]:text-[length:18px] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:12px] [&_p]:leading-[1.65]"><h2>{service.name}</h2><div className="tw-directory-card-meta flex [flex-wrap:wrap] gap-[7px]"><span className="tw-directory-chip p-[5px_8px] rounded-[999px] [background:var(--mint)] [color:var(--teal-dark)] text-[length:10px]">{service.durationMinutes} {management("minutes")}</span><span className="tw-directory-chip p-[5px_8px] rounded-[999px] [background:var(--mint)] [color:var(--teal-dark)] text-[length:10px]">৳{Number(service.price).toLocaleString()}</span></div><p>{service.description.length>180?`${service.description.slice(0,177)}…`:service.description}</p><p>{management("eligibleDoctors")}: {service.doctors.map(({doctor})=>doctor.name).join(", ")||"—"}</p><Link className="tw-directory-cta mt-[5px] [color:var(--teal)] text-[length:12px] font-[750]" href={`/services/${service.slug}`}>{management("viewDetails")} ↗</Link></div>
    </article>})}</section>:<div className="tw-public-empty p-[32px] text-center rounded-[14px] [background:var(--surface)] [color:var(--muted)]">{query?management("noSearchResults"):management("noServices")}</div>}
  </div>;
}
