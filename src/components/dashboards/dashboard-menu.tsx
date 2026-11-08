"use client";

import {Bell,CalendarDays,ClipboardList,Clock3,FileText,HeartHandshake,LayoutDashboard,Settings,ShieldCheck,Stethoscope,UserRound,Users,type LucideIcon} from "lucide-react";
import {Suspense} from "react";
import {useTranslations} from "next-intl";
import {Link,usePathname} from "@/i18n/navigation";

type Role="patient"|"receptionist"|"admin";
type DashboardLink={key:string;path:string;icon:LucideIcon};

const links:Record<Role,DashboardLink[]>={
  patient:[
    {key:"overview",path:"",icon:LayoutDashboard},
    {key:"myBookings",path:"bookings",icon:Clock3},
    {key:"profile",path:"profile",icon:UserRound},
    {key:"settings",path:"settings",icon:Settings},
  ],
  receptionist:[
    {key:"overview",path:"",icon:LayoutDashboard},
    {key:"doctors",path:"/receptionist/doctors",icon:Stethoscope},
    {key:"services",path:"/receptionist/services",icon:HeartHandshake},
    {key:"schedule",path:"/receptionist/schedules",icon:Clock3},
    {key:"appointments",path:"appointments",icon:CalendarDays},
    {key:"phoneBooking",path:"phone-booking",icon:ClipboardList},
    {key:"patients",path:"patients",icon:Users},
    {key:"profile",path:"profile",icon:UserRound},
    {key:"settings",path:"settings",icon:Settings},
  ],
  admin:[
    {key:"overview",path:"",icon:LayoutDashboard},
    {key:"appointments",path:"appointments",icon:CalendarDays},
    {key:"doctors",path:"/admin/doctors",icon:Stethoscope},
    {key:"services",path:"/admin/services",icon:HeartHandshake},
    {key:"hours",path:"/admin/schedules",icon:Clock3},
    {key:"timeOff",path:"/admin/time-off",icon:CalendarDays},
    {key:"notifications",path:"/admin/notifications",icon:Bell},
    {key:"chairs",path:"/admin/chairs",icon:Stethoscope},
    {key:"patients",path:"patients",icon:Users},
    {key:"receptionists",path:"receptionists",icon:ShieldCheck},
    {key:"reports",path:"reports",icon:FileText},
    {key:"settings",path:"settings",icon:Settings},
    {key:"profile",path:"/admin/profile",icon:UserRound},
  ],
};

export function DashboardMenu({role}:{role:Role}){
  return <Suspense fallback={<MenuFallback count={links[role].length}/>}>
    <ActiveDashboardMenu role={role}/>
  </Suspense>;
}

function ActiveDashboardMenu({role}:{role:Role}){
  const t=useTranslations("dashboard");
  const pathname=usePathname();
  const items=links[role].map(item=>({
    ...item,
    href:item.path.startsWith("/")?item.path:`/${role}/dashboard${item.path?`/${item.path}`:""}`,
  }));
  const activeItem=[...items].sort((a,b)=>b.href.length-a.href.length).find(item=>item.path===""?pathname===item.href:pathname===item.href||pathname.startsWith(`${item.href}/`));

  return <nav className="dashboard-menu" aria-label={t("sidebarLabel")}>
    {items.map(({key,href,icon:Icon})=>{
      const active=activeItem?.href===href;
      return <Link key={href} href={href} className={`dashboard-link${active?" is-current":""}`} aria-current={active?"page":undefined}>
        <Icon size={17}/><span>{t(key)}</span>
      </Link>;
    })}
  </nav>;
}

function MenuFallback({count}:{count:number}){
  return <nav className="dashboard-menu dashboard-menu-loading" aria-hidden="true">
    {Array.from({length:count},(_,index)=><span className="dashboard-link-skeleton" key={index}><i/><i/></span>)}
  </nav>;
}
