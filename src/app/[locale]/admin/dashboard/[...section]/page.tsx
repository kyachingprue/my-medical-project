import {notFound} from "next/navigation";
import {useTranslations} from "next-intl";
import {DashboardSubpage} from "@/components/dashboards/dashboard-subpage";
import {requireRole} from "@/lib/auth/authorize";
import {AdminUserManager,type AdminUser} from "@/components/management/admin-user-manager";
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

export default async function AdminDashboardSection({params,searchParams}: {params: Promise<{locale: string; section: string[]}>;searchParams:Promise<{q?:string;page?:string}>}) {
  const {locale, section} = await params;
  const actor=await requireRole("ADMIN", locale);
  const key = sectionKeys[section[0]];
  if (!key || section.length !== 1) notFound();
  if(section[0]==="patients"||section[0]==="receptionists"){
    const filters=await searchParams;
    const query=filters.q?.trim().slice(0,100);
    const requestedPage=Number(filters.page??1);
    const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?Math.min(requestedPage,10000):1;
    const roleWhere=section[0]==="patients"?{role:UserRole.PATIENT}:{role:{in:[UserRole.ADMIN,UserRole.RECEPTIONIST]}};
    const where=query?{AND:[roleWhere,{OR:[{name:{contains:query,mode:"insensitive" as const}},{email:{contains:query,mode:"insensitive" as const}},{id:{contains:query,mode:"insensitive" as const}}]}]}:roleWhere;
    const users=await prisma.user.findMany({
      where,
      orderBy:{createdAt:"desc"},
      skip:(page-1)*100,
      take:100,
      select:{id:true,name:true,email:true,phone:true,role:true,emailVerified:true,createdAt:true},
    });
    const total=await prisma.user.count({where});
    return <AdminUsersContent translationKey={key} users={users} actorId={actor.id} query={query??""} page={page} total={total}/>;
  }
  return <AdminSectionContent translationKey={key} />;
}

function AdminSectionContent({translationKey}: {translationKey: string}) {
  const t = useTranslations("dashboard");
  return <DashboardSubpage title={t(translationKey)} />;
}

function AdminUsersContent({translationKey,users,actorId,query,page,total}:{translationKey:string;users:AdminUser[];actorId:string;query:string;page:number;total:number}){
  const t=useTranslations("dashboard");
  const pages=Math.max(1,Math.ceil(total/100));
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("admin")}</span><h1>{t(translationKey)}</h1><p>Review accounts and assign approved clinic roles.</p></div></header><form className="management-filters" method="GET"><input name="q" defaultValue={query} maxLength={100} placeholder="Search name, email, or account ID" aria-label="Search users"/><button className="button button-outline" type="submit">Search</button></form><AdminUserManager users={users} actorId={actorId}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20}}><span>{total} accounts · Page {page} of {pages}</span><div style={{display:"flex",gap:8}}>{page>1?<a className="button button-outline" href={`?q=${encodeURIComponent(query)}&page=${page-1}`}>Previous</a>:null}{page<pages?<a className="button button-outline" href={`?q=${encodeURIComponent(query)}&page=${page+1}`}>Next</a>:null}</div></div></section>;
}
