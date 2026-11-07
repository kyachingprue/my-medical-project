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
    <div className="dashboard-heading"><div><span className="section-kicker">{t("space")}</span><h1>{t("overview")}</h1><p>{t("intro")}</p></div></div>
    <div className="stat-grid">{stats.map(({label,value,icon:Icon,detail})=><article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><small>{detail}</small></article>)}</div>
    {role==="admin"?<section className="dashboard-operations">
      <article className="dashboard-operation-card"><span className="section-kicker">{operations("recentChanges")}</span>{recentActivity.length?<ul>{recentActivity.map(item=><li key={item.id}><strong>{item.action} · {item.entity==="Doctor"?management("doctor"):management("serviceName")}</strong><small>{dateFormat.format(item.createdAt)}</small></li>)}</ul>:<p>{operations("noRecentChanges")}</p>}</article>
      <article className="dashboard-operation-card"><span className="section-kicker">{operations("upcomingTimeOff")}</span>{upcomingLeave.length?<ul>{upcomingLeave.map(item=><li key={item.id}><strong>{item.doctor.name}</strong><small>{dateFormat.format(item.startAt)} – {dateFormat.format(item.endAt)}</small></li>)}</ul>:<p>{operations("noUpcomingTimeOff")}</p>}</article>
      <article className="dashboard-operation-card"><span className="section-kicker">{management("weeklySchedule")}</span>{weeklyHours.length?<ul>{weekdays.map(day=><li key={day}><strong>{management(`day_${day}`)}</strong><small>{new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format((weeklyHours.find(item=>item.dayOfWeek===day)?.minutes??0)/60)} {management("hours").toLowerCase()}</small></li>)}</ul>:<p>{operations("noDoctorHours")}</p>}</article>
    </section>:<section className="dashboard-empty"><div className="empty-art"><CalendarCheck size={34}/></div><div><span className="section-kicker">{t("nextChapter")}</span><h2>{t("emptyTitle")}</h2><p>{role==="patient"&&stats[0]?.value==="0"?t("scheduleComing"):t("emptyText")}</p></div></section>}
    {role!=="patient"&&<div className="dashboard-note"><HeartHandshake size={18}/><p><strong>{t("careNote")}</strong><br/>{t("scheduleComing")}</p></div>}
  </>;
}
