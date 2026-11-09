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

  return <nav className="tw-dashboard-menu grid gap-[3px] [@media(max-width:760px)]:flex [@media(max-width:760px)]:overflow-auto [@media(max-width:760px)]:gap-[4px] relative min-w-[length:0] [@media(max-width:980px)]:flex [@media(max-width:980px)]:overflow-x-auto [@media(max-width:980px)]:overflow-y-hidden [@media(max-width:980px)]:gap-[4px] [@media(max-width:980px)]:p-[3px_1px_7px] [@media(max-width:980px)]:[overscroll-behavior-x:contain] [@media(max-width:980px)]:[scrollbar-width:thin]" aria-label={t("sidebarLabel")}>
    {items.map(({key,href,icon:Icon})=>{
      const active=activeItem?.href===href;
      return <Link key={href} href={href} className={`tw-dashboard-link h-[39px] p-[0_10px] flex items-center gap-[10px] rounded-[8px] [color:var(--muted)] text-[length:11px] [&:hover]:[background:var(--mint)] [&:hover]:[color:var(--teal)] [&:hover]:font-bold [@media(max-width:760px)]:whitespace-nowrap [@media(max-width:760px)]:p-[0_9px] [@media(max-width:760px)]:text-[length:10px] [@media(max-width:760px)]:[&_svg]:w-[15px] relative overflow-hidden [isolation:isolate] [transition:background-color_.22s_ease,color_.22s_ease,transform_.22s_ease,box-shadow_.22s_ease] [&::before]:absolute [&::before]:inset-[7px_auto_7px_0] [&::before]:w-[3px] [&::before]:rounded-[4px] [&::before]:[background:var(--teal)] [&::before]:[content:''] [&::before]:[transform:scaleY(.35)] [&::before]:opacity-[0] [&::before]:[transition:transform_.24s_cubic-bezier(.2,.8,.2,1),opacity_.18s_ease] [&_svg]:flex-[0_0_auto] [&_svg]:[transition:transform_.22s_ease] [&:hover]:[transform:translateX(2px)] [&:hover_svg]:[transform:scale(1.08)] [&:focus-visible]:[outline:2px_solid_var(--teal)] [&:focus-visible]:[outline-offset:2px] [@media(max-width:760px)]:[&::before]:inset-[0_8px_auto] [@media(max-width:760px)]:[&::before]:h-[3px] [@media(max-width:760px)]:[&::before]:w-[auto] [@media(max-width:760px)]:[&::before]:[transform:scaleX(.35)] [@media(max-width:760px)]:[&::before]:[transform-origin:left_center] [@media(max-width:760px)]:[&:hover]:[transform:translateY(-1px)] [@media(prefers-reduced-motion:reduce)]:[transition:none] [@media(prefers-reduced-motion:reduce)]:[&::before]:[transition:none] [@media(prefers-reduced-motion:reduce)]:[&_svg]:[transition:none] [@media(prefers-reduced-motion:reduce)]:[&:hover]:[transform:none] [@media(max-width:980px)]:flex-[0_0_auto] [@media(max-width:980px)]:whitespace-nowrap [@media(max-width:380px)]:h-[36px] [@media(max-width:380px)]:p-[0_8px] [@media(max-width:380px)]:text-[length:9px]${active?" tw-is-current [.tw-dashboard-link&]:[background:var(--mint)] [.tw-dashboard-link&]:[color:var(--teal)] [.tw-dashboard-link&]:font-bold [.tw-appointment-tabs_button&]:[background:color-mix(in_srgb,var(--teal)_12%,transparent)] [.tw-appointment-tabs_button&]:[color:var(--teal)] [.tw-appointment-tabs_button&]:font-bold [.tw-booking-steps_li&]:[color:var(--teal)] [.tw-booking-steps_li&]:font-bold [.tw-booking-steps_li&_span]:border-[color:var(--teal)] [.tw-booking-steps_li&_span]:[background:var(--teal)] [.tw-booking-steps_li&_span]:[color:white] [.tw-dashboard-link&]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--teal)_10%,transparent)] [.tw-dashboard-link&::before]:[transform:scaleY(1)] [.tw-dashboard-link&::before]:opacity-[1] [.tw-dashboard-link&_svg]:[transform:scale(1.04)] [@media(max-width:760px)]:[.tw-dashboard-link&::before]:[transform:scaleX(1)]":""}`} aria-current={active?"page":undefined}>
        <Icon size={17}/><span>{t(key)}</span>
      </Link>;
    })}
  </nav>;
}

function MenuFallback({count}:{count:number}){
  return <nav className="tw-dashboard-menu grid gap-[3px] [@media(max-width:760px)]:flex [@media(max-width:760px)]:overflow-auto [@media(max-width:760px)]:gap-[4px] relative min-w-[length:0] [@media(max-width:980px)]:flex [@media(max-width:980px)]:overflow-x-auto [@media(max-width:980px)]:overflow-y-hidden [@media(max-width:980px)]:gap-[4px] [@media(max-width:980px)]:p-[3px_1px_7px] [@media(max-width:980px)]:[overscroll-behavior-x:contain] [@media(max-width:980px)]:[scrollbar-width:thin] tw-dashboard-menu-loading min-h-[180px] [@media(max-width:760px)]:min-h-[39px]" aria-hidden="true">
    {Array.from({length:count},(_,index)=><span className="tw-dashboard-link-skeleton flex items-center gap-[10px] h-[39px] p-[0_10px] [&_i]:h-[13px] [&_i]:w-[13px] [&_i]:rounded-[4px] [&_i]:[background:var(--line)] [&_i]:opacity-[.65] [&_i:last-child]:w-[88px] [&_i:last-child]:h-[8px] [&:nth-child(2n)_i:last-child]:w-[110px] [&:nth-child(3n)_i:last-child]:w-[72px] [@media(max-width:760px)]:[.tw-dashboard-menu-loading_&]:flex-[0_0_90px] [@media(max-width:760px)]:[.tw-dashboard-menu-loading_&]:p-[0_8px]" key={index}><i/><i/></span>)}
  </nav>;
}
