import {CalendarCheck,Clock3,HeartHandshake,Users} from "lucide-react";
import {connection} from "next/server";
import {getLocale,getTranslations} from "next-intl/server";
import {AppointmentStatus,Weekday} from "@prisma/client";
import {getCurrentUser} from "@/lib/auth/session";
import {prisma} from "@/lib/prisma";
import type {LucideIcon} from "lucide-react";

type Role="patient"|"receptionist"|"admin";
type Stat={label:string;value:string;icon:LucideIcon;detail:string};

function dhakaDateRange(now:Date){
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
  const [year,month,day]=date.split("-").map(Number);
  const nextDate=(offset:number)=>new Date(Date.UTC(year,month-1,day+offset)).toISOString().slice(0,10);
  return {
    todayStart:new Date(`${date}T00:00:00+06:00`),
    tomorrowStart:new Date(`${nextDate(1)}T00:00:00+06:00`),
  };
}

export async function DashboardOverview({role}:{role:Role}){
  await connection();
  const [t,management,operations,locale]=await Promise.all([
    getTranslations("dashboard"),
    getTranslations("management"),
    getTranslations("operations"),
    getLocale(),
  ]);
  const currentUser=await getCurrentUser();
  if(!currentUser)throw new Error("A dashboard requires an authenticated user.");
  const now=new Date();
  const {todayStart,tomorrowStart}=dhakaDateRange(now);
  const todayWhere={startAt:{gte:todayStart,lt:tomorrowStart}};
  let patients=0;
  let stats:Stat[]=[];
  let recentActivity:{id:string;action:string;entity:string;createdAt:Date}[]=[];
  let upcomingLeave:{id:string;startAt:Date;endAt:Date;reason:string;doctor:{name:string}}[]=[];
  let weeklyHours:{dayOfWeek:Weekday;minutes:number}[]=[];

  if(role==="patient"){
    const [total,upcoming,completed,cancelled]=await Promise.all([
      prisma.appointment.count({where:{patientId:currentUser.id}}),
      prisma.appointment.count({where:{patientId:currentUser.id,status:AppointmentStatus.CONFIRMED,startAt:{gte:now}}}),
      prisma.appointment.count({where:{patientId:currentUser.id,status:AppointmentStatus.COMPLETED}}),
      prisma.appointment.count({where:{patientId:currentUser.id,status:AppointmentStatus.CANCELLED}}),
    ]);
    stats=[
      {label:t("totalAppointments"),value:String(total),icon:CalendarCheck,detail:t("totalAppointments")},
      {label:t("upcoming"),value:String(upcoming),icon:Clock3,detail:t("upcoming")},
      {label:t("completed"),value:String(completed),icon:HeartHandshake,detail:t("completed")},
      {label:t("cancelled"),value:String(cancelled),icon:CalendarCheck,detail:t("cancelled")},
    ];
  }else if(role==="receptionist"){
    const [today,statusCounts]=await Promise.all([
      prisma.appointment.count({where:todayWhere}),
      prisma.appointment.groupBy({by:["status"],_count:{id:true}}),
    ]);
    const countByStatus=new Map(statusCounts.map(item=>[item.status,item._count.id]));
    const total=statusCounts.reduce((sum,item)=>sum+item._count.id,0);
    stats=[
      {label:t("totalAppointments"),value:String(total),icon:CalendarCheck,detail:t("totalAppointments")},
      {label:t("todayAppointments"),value:String(today),icon:Clock3,detail:t("todayAppointments")},
      {label:operations("confirmedAppointments"),value:String(countByStatus.get(AppointmentStatus.CONFIRMED)??0),icon:CalendarCheck,detail:operations("confirmedAppointments")},
      {label:t("completed"),value:String(countByStatus.get(AppointmentStatus.COMPLETED)??0),icon:HeartHandshake,detail:t("completed")},
      {label:t("cancelled"),value:String(countByStatus.get(AppointmentStatus.CANCELLED)??0),icon:CalendarCheck,detail:t("cancelled")},
      {label:operations("noShowAppointments"),value:String(countByStatus.get(AppointmentStatus.NO_SHOW)??0),icon:Users,detail:operations("noShowAppointments")},
    ];
  }else{
    const [patientCount,total,today,doctors]=await Promise.all([
      prisma.user.count({where:{role:"PATIENT"}}),
      prisma.appointment.count(),
      prisma.appointment.count({where:todayWhere}),
      prisma.doctor.count({where:{isActive:true}}),
    ]);
    patients=patientCount;
    stats=[
      {label:t("totalAppointments"),value:String(total),icon:CalendarCheck,detail:t("totalAppointments")},
      {label:t("todayAppointments"),value:String(today),icon:Clock3,detail:t("todayAppointments")},
      {label:t("totalDoctors"),value:String(doctors),icon:HeartHandshake,detail:management("active")},
      {label:t("totalPatients"),value:String(patients),icon:Users,detail:t("registeredPatients")},
    ];
    const [activity,leave,schedules]=await Promise.all([
      prisma.auditLog.findMany({where:{entity:{in:["Doctor","Service"]}},orderBy:{createdAt:"desc"},take:5,select:{id:true,action:true,entity:true,createdAt:true}}),
      prisma.timeOff.findMany({where:{endAt:{gte:now}},include:{doctor:{select:{name:true}}},orderBy:{startAt:"asc"},take:5}),
      prisma.workingHours.findMany({where:{isActive:true,doctor:{isActive:true}},select:{dayOfWeek:true,startTime:true,endTime:true}}),
    ]);
    recentActivity=activity;
    upcomingLeave=leave;
    const minutesByDay=new Map<Weekday,number>();
    for(const schedule of schedules){
      const start=schedule.startTime.split(":").map(Number);
      const end=schedule.endTime.split(":").map(Number);
      const minutes=(end[0]*60+end[1])-(start[0]*60+start[1]);
      minutesByDay.set(schedule.dayOfWeek,(minutesByDay.get(schedule.dayOfWeek)??0)+minutes);
    }
    weeklyHours=[...minutesByDay].map(([dayOfWeek,minutes])=>({dayOfWeek,minutes}));
  }
  const dateFormat=new Intl.DateTimeFormat(locale,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"});
  const weekdays=[Weekday.SATURDAY,Weekday.SUNDAY,Weekday.MONDAY,Weekday.TUESDAY,Weekday.WEDNESDAY,Weekday.THURSDAY];
  return <>
    <div className="tw-dashboard-heading flex justify-between items-end mb-[24px] [&_h1]:text-[length:27px] [&_h1]:m-[8px_0] [&_p]:[color:var(--muted)] [&_p]:text-[length:11px] [&_p]:m-[0]"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("space")}</span><h1>{t("overview")}</h1><p>{t("intro")}</p></div></div>
    <div className="tw-stat-grid grid grid-cols-[repeat(4,1fr)] gap-[13px] [@media(max-width:760px)]:grid-cols-[repeat(2,1fr)]">{stats.map(({label,value,icon:Icon,detail})=><article className="tw-stat-card p-[16px] [background:var(--surface)] [border:1px_solid_var(--line)] rounded-[10px] [&>strong]:block [&>strong]:text-[length:26px] [&>strong]:m-[18px_0_6px] [&_small]:text-[length:9px] [&_small]:[color:var(--muted)] [@media(max-width:410px)]:p-[12px]" key={label}><div className="tw-stat-top flex justify-between items-center [color:var(--muted)] text-[length:10px] [&_svg]:[color:var(--teal)] [&_svg]:w-[17px]"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><small>{detail}</small></article>)}</div>
    {role==="admin"?<section className="tw-dashboard-operations grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[16px] mt-[22px] [@media(max-width:900px)]:grid-cols-[1fr]">
      <article className="tw-dashboard-operation-card min-w-[length:0] p-[20px] [border:1px_solid_var(--line)] rounded-[14px] [background:var(--surface)] [&_ul]:grid [&_ul]:gap-[10px] [&_ul]:m-[14px_0_0] [&_ul]:p-[0] [&_ul]:[list-style:none] [&_li]:grid [&_li]:gap-[5px] [&_li]:p-[10px_0] [&_li]:[border-bottom:1px_solid_var(--line)] [&_li]:text-[length:12px] [&_li_strong]:[font-weight:650] [&_li_small]:[color:var(--muted)] [&_li_small]:text-[length:11px] [&_li_small]:leading-[1.6] [&>p]:[color:var(--muted)] [&>p]:text-[length:11px] [&>p]:leading-[1.6] [&>p]:m-[14px_0_0]"><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{operations("recentChanges")}</span>{recentActivity.length?<ul>{recentActivity.map(item=><li key={item.id}><strong>{item.action} · {item.entity==="Doctor"?management("doctor"):management("serviceName")}</strong><small>{dateFormat.format(item.createdAt)}</small></li>)}</ul>:<p>{operations("noRecentChanges")}</p>}</article>
      <article className="tw-dashboard-operation-card min-w-[length:0] p-[20px] [border:1px_solid_var(--line)] rounded-[14px] [background:var(--surface)] [&_ul]:grid [&_ul]:gap-[10px] [&_ul]:m-[14px_0_0] [&_ul]:p-[0] [&_ul]:[list-style:none] [&_li]:grid [&_li]:gap-[5px] [&_li]:p-[10px_0] [&_li]:[border-bottom:1px_solid_var(--line)] [&_li]:text-[length:12px] [&_li_strong]:[font-weight:650] [&_li_small]:[color:var(--muted)] [&_li_small]:text-[length:11px] [&_li_small]:leading-[1.6] [&>p]:[color:var(--muted)] [&>p]:text-[length:11px] [&>p]:leading-[1.6] [&>p]:m-[14px_0_0]"><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{operations("upcomingTimeOff")}</span>{upcomingLeave.length?<ul>{upcomingLeave.map(item=><li key={item.id}><strong>{item.doctor.name}</strong><small>{dateFormat.format(item.startAt)} – {dateFormat.format(item.endAt)}</small></li>)}</ul>:<p>{operations("noUpcomingTimeOff")}</p>}</article>
      <article className="tw-dashboard-operation-card min-w-[length:0] p-[20px] [border:1px_solid_var(--line)] rounded-[14px] [background:var(--surface)] [&_ul]:grid [&_ul]:gap-[10px] [&_ul]:m-[14px_0_0] [&_ul]:p-[0] [&_ul]:[list-style:none] [&_li]:grid [&_li]:gap-[5px] [&_li]:p-[10px_0] [&_li]:[border-bottom:1px_solid_var(--line)] [&_li]:text-[length:12px] [&_li_strong]:[font-weight:650] [&_li_small]:[color:var(--muted)] [&_li_small]:text-[length:11px] [&_li_small]:leading-[1.6] [&>p]:[color:var(--muted)] [&>p]:text-[length:11px] [&>p]:leading-[1.6] [&>p]:m-[14px_0_0]"><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{management("weeklySchedule")}</span>{weeklyHours.length?<ul>{weekdays.map(day=><li key={day}><strong>{management(`day_${day}`)}</strong><small>{new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format((weeklyHours.find(item=>item.dayOfWeek===day)?.minutes??0)/60)} {management("hours").toLowerCase()}</small></li>)}</ul>:<p>{operations("noDoctorHours")}</p>}</article>
    </section>:<section className="tw-dashboard-empty mt-[23px] p-[28px] flex items-center gap-[19px] [background:var(--surface)] [border:1px_solid_var(--line)] rounded-[12px] [&_h2]:text-[length:17px] [&_h2]:m-[7px_0] [&_p]:max-w-[length:500px] [&_p]:[color:var(--muted)] [&_p]:text-[length:11px] [&_p]:leading-[1.65] [&_p]:m-[0] [@media(max-width:760px)]:p-[20px] [@media(max-width:760px)]:items-start [@media(max-width:760px)]:[&_h2]:text-[length:15px] [@media(max-width:760px)]:[&_p]:text-[length:10px]"><div className="tw-empty-art w-[57px] h-[57px] grid [place-items:center] rounded-[15px] [background:var(--mint)] [color:var(--teal)] [@media(max-width:760px)]:[.tw-dashboard-empty_&]:w-[45px] [@media(max-width:760px)]:[.tw-dashboard-empty_&]:h-[45px]"><CalendarCheck size={34}/></div><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("nextChapter")}</span><h2>{t("emptyTitle")}</h2><p>{role==="patient"&&stats[0]?.value==="0"?t("scheduleComing"):t("emptyText")}</p></div></section>}
    {role!=="patient"&&<div className="tw-dashboard-note mt-[14px] flex gap-[11px] p-[14px] [border:1px_solid_var(--line)] rounded-[9px] [color:var(--teal)] [&_p]:text-[length:10px] [&_p]:leading-[1.6] [&_p]:[color:var(--muted)] [&_p]:m-[0] [&_strong]:[color:var(--text)]"><HeartHandshake size={18}/><p><strong>{t("careNote")}</strong><br/>{t("scheduleComing")}</p></div>}
  </>;
}
