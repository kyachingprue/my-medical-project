import {Suspense} from "react";
import {notFound} from "next/navigation";
import {useTranslations} from "next-intl";
import {DashboardSubpage} from "@/components/dashboards/dashboard-subpage";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {AnalyticsDashboard} from "@/components/appointments/analytics-dashboard";
import {AdminSettings} from "@/components/dashboards/admin-settings";
import {requireRole} from "@/lib/auth/authorize";
import {AdminUserManager,type AdminUser} from "@/components/management/admin-user-manager";
import {LiveFilters} from "@/components/management/live-filters";
import {UserRole} from "@prisma/client";
import {prisma} from "@/lib/prisma";

const sectionKeys: Record<string, string> = {
  appointments: "appointments",
  doctors: "doctors",
  services: "services",
  "working-hours": "hours",
  "time-off": "timeOff",
  patients: "patients",
  receptionists: "receptionists",
  reports: "reports",
  settings: "settings",
};

export default async function AdminDashboardSection({params,searchParams}: {params: Promise<{locale: string; section: string[]}>;searchParams:Promise<{q?:string;page?:string;status?:string}>}) {
  const {locale, section} = await params;
  const actor=await requireRole("ADMIN", locale);
  const key = sectionKeys[section[0]];
  if (!key || section.length !== 1) notFound();
  if(section[0]==="reports")return <Suspense fallback={<DashboardLoading kind="analytics" label="Loading reports"/>}><AnalyticsDashboard/></Suspense>;
  if(section[0]==="settings")return <AdminSettings/>;
  if(section[0]==="patients"||section[0]==="receptionists"){
    const filters=await searchParams;
    const query=filters.q?.trim().slice(0,100);
    const verification=filters.status==="verified"||filters.status==="unverified"?filters.status:"all";
    const requestedPage=Number(filters.page??1);
    const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?Math.min(requestedPage,10000):1;
    const roleWhere=section[0]==="patients"?{role:UserRole.PATIENT}:{role:{in:[UserRole.ADMIN,UserRole.RECEPTIONIST]}};
    const where={
      AND:[
        roleWhere,
        ...(verification==="all"?[]:[{emailVerified:verification==="verified"}]),
        ...(query?[{OR:[{name:{contains:query,mode:"insensitive" as const}},{email:{contains:query,mode:"insensitive" as const}},{id:{contains:query,mode:"insensitive" as const}}]}]:[]),
      ],
    };
    const users=await prisma.user.findMany({
      where,
      orderBy:{createdAt:"desc"},
      skip:(page-1)*100,
      take:100,
      select:{id:true,name:true,email:true,phone:true,role:true,emailVerified:true,createdAt:true},
    });
    const total=await prisma.user.count({where});
    return <AdminUsersContent translationKey={key} users={users} actorId={actor.id} query={query??""} verification={verification} page={page} total={total}/>;
  }
  return <AdminSectionContent translationKey={key} />;
}

function AdminSectionContent({translationKey}: {translationKey: string}) {
  const t = useTranslations("dashboard");
  return <DashboardSubpage title={t(translationKey)} />;
}

function AdminUsersContent({translationKey,users,actorId,query,verification,page,total}:{translationKey:string;users:AdminUser[];actorId:string;query:string;verification:string;page:number;total:number}){
  const t=useTranslations("dashboard");
  const profile=useTranslations("accountProfile");
  const management=useTranslations("management");
  const pages=Math.max(1,Math.ceil(total/100));
  const queryString=new URLSearchParams({q:query,status:verification});
  return <section className="tw-management-page grid gap-[22px] max-w-[length:1180px] m-[0_auto]">
    <header className="tw-management-page-header flex items-end justify-between gap-[20px] [&_h1]:m-[8px_0] [&_h1]:text-[length:clamp(28px,4vw,40px)] [&_h1]:tracking-[-1.6px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("admin")}</span><h1>{t(translationKey)}</h1><p>Review accounts and assign approved clinic roles.</p></div></header>
    <LiveFilters query={query} category={verification} queryPlaceholder="Search name, email, or account ID" queryLabel="Search users" categoryLabel="Filter by verification" categories={[{value:"all",label:management("allStatuses")},{value:"verified",label:profile("verified")},{value:"unverified",label:profile("notVerified")}]}/>
    <AdminUserManager users={users} actorId={actorId}/>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span>{total} accounts · Page {page} of {pages}</span><div className="flex gap-2">{page>1?<a className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" href={`?${queryString.toString()}&page=${page-1}`}>Previous</a>:null}{page<pages?<a className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" href={`?${queryString.toString()}&page=${page+1}`}>Next</a>:null}</div></div>
  </section>;
}
