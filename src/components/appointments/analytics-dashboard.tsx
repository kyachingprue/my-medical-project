"use client";

import {Activity,CalendarCheck,CheckCircle2,Stethoscope,Users,XCircle} from "lucide-react";
import {useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {
  Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis,
} from "recharts";
import {useEffect,useState} from "react";

type Summary={totalAppointments:number;todayAppointments:number;upcomingAppointments:number;completedAppointments:number;cancelledAppointments:number;noShowAppointments:number;activeDoctors:number;totalPatients:number;noShowRate:number;previous:{totalAppointments:number;completedAppointments:number;cancelledAppointments:number;noShowAppointments:number}};
type ChartRow={date?:string;day?:string;status?:string;doctor?:string;service?:string;appointments:number};
type ApiData<T>={data:T;error?:{message?:string}};
type NoShowMetrics={noShows:number;eligibleAppointments:number;rate:number;denominator:string};
type Period="today"|"yesterday"|"last7days"|"last30days"|"last3months"|"last6months"|"thisYear"|"custom";
const chartColors=["var(--teal)","#e6a16c","#78a789","#cf7770"];
const endpoints=["appointments","status","weekly","monthly","doctors","services"] as const;

export function AnalyticsDashboard(){
  const t=useTranslations("analytics");
  const d=useTranslations("dashboard");
  const searchParams=useSearchParams();
  const selectedPeriod=searchParams.get("period");
  const period:Period=selectedPeriod&&["today","yesterday","last7days","last30days","last3months","last6months","thisYear","custom"].includes(selectedPeriod)?selectedPeriod as Period:"last30days";
  const from=searchParams.get("from")??"";
  const to=searchParams.get("to")??"";
  const params=new URLSearchParams({period});
  if(period==="custom"&&from&&to){params.set("from",from);params.set("to",to)}
  const queryKey=params.toString();
  const [result,setResult]=useState<{queryKey:string;summary:Summary;charts:Record<string,unknown[]>;noShow:NoShowMetrics|null}|null>(null);
  const [failure,setFailure]=useState<{queryKey:string;message:string}|null>(null);
  const summary=result?.queryKey===queryKey?result.summary:null;
  const charts=result?.queryKey===queryKey?result.charts:{};
  const noShow=result?.queryKey===queryKey?result.noShow:null;
  const error=failure?.queryKey===queryKey?failure.message:"";
  const loading=!summary&&!error&&!(period==="custom"&&(!from||!to));

  useEffect(()=>{
    let active=true;
    if(period==="custom"&&(!from||!to))return ()=>{active=false};
    Promise.all([
      fetch(`/api/admin/analytics/overview?${queryKey}`,{cache:"no-store"}).then(readBody<Summary>),
      Promise.all(endpoints.map(async name=>[name,await fetch(`/api/admin/analytics/${name}?${queryKey}`,{cache:"no-store"}).then(readBody<ChartRow[]>)] as const)),
      fetch(`/api/admin/analytics/no-shows?${queryKey}`,{cache:"no-store"}).then(readBody<NoShowMetrics>),
    ]).then(([overview,results,noShowResult])=>{
      if(!active)return;
      const chartData=Object.fromEntries(results);
      setResult({queryKey,summary:overview,charts:chartData,noShow:noShowResult??null});
      setFailure(null);
    }).catch(cause=>{if(active)setFailure({queryKey,message:cause instanceof Error?cause.message:t("loadFailed")})});
    return ()=>{active=false};
  },[period,from,to,queryKey,t]);

  function changePeriod(value:Period){
    const params=new URLSearchParams(window.location.search);
    params.set("period",value);
    if(value!=="custom"){params.delete("from");params.delete("to")}
    const next=`${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null,"",next);
  }
  function changeRange(key:"from"|"to",value:string){
    const params=new URLSearchParams(window.location.search);
    params.set("period","custom");
    if(value)params.set(key,value);else params.delete(key);
    window.history.replaceState(null,"",`${window.location.pathname}?${params.toString()}`);
  }

  const kpis=summary?[
    {key:"totalAppointments",label:d("totalAppointments"),value:summary.totalAppointments,previous:summary.previous.totalAppointments,icon:CalendarCheck},
    {key:"todayAppointments",label:d("todayAppointments"),value:summary.todayAppointments,icon:Activity},
    {key:"upcomingAppointments",label:d("upcoming"),value:summary.upcomingAppointments,icon:CalendarCheck},
    {key:"completedAppointments",label:d("completed"),value:summary.completedAppointments,previous:summary.previous.completedAppointments,icon:CheckCircle2},
    {key:"cancelledAppointments",label:d("cancelled"),value:summary.cancelledAppointments,previous:summary.previous.cancelledAppointments,icon:XCircle},
    {key:"noShowAppointments",label:t("noShows"),value:summary.noShowAppointments,previous:summary.previous.noShowAppointments,icon:Activity},
    {key:"activeDoctors",label:d("totalDoctors"),value:summary.activeDoctors,icon:Stethoscope},
    {key:"totalPatients",label:d("totalPatients"),value:summary.totalPatients,icon:Users},
  ]:[];
  const statusData=((charts.status??[]) as ChartRow[]).filter(row=>row.appointments>0);
  const trends=(charts.appointments??[]) as ChartRow[];
  const weekly=(charts.weekly??[]) as ChartRow[];
  const monthly=(charts.monthly??[]) as ChartRow[];
  const doctors=(charts.doctors??[]) as ChartRow[];
  const services=(charts.services??[]) as ChartRow[];

  return <section className="analytics-dashboard">
    <header className="analytics-header"><div><span className="section-kicker">{t("overviewKicker")}</span><h1>{t("title")}</h1><p>{t("description")}</p></div><div className="analytics-filters"><label><span>{t("dateRange")}</span><select value={period} onChange={event=>changePeriod(event.target.value as Period)}>{(["today","yesterday","last7days","last30days","last3months","last6months","thisYear","custom"] as const).map(item=><option key={item} value={item}>{t(`period_${item}`)}</option>)}</select></label>{period==="custom"&&<><label><span>{t("from")}</span><input type="date" max={to||undefined} value={from} onChange={event=>changeRange("from",event.target.value)}/></label><label><span>{t("to")}</span><input type="date" min={from||undefined} value={to} onChange={event=>changeRange("to",event.target.value)}/></label></>}</div></header>
    {error&&<div className="analytics-error" role="alert">{error}</div>}
    {loading&&!summary?<div className="analytics-kpi-grid">{Array.from({length:8},(_,index)=><div className="analytics-kpi-skeleton" key={index}/>)}</div>:summary&&<div className="analytics-kpi-grid">{kpis.map(item=><article className="analytics-kpi" key={item.key}><span className="analytics-kpi-icon"><item.icon size={17}/></span><span className="analytics-kpi-label">{item.label}</span><strong>{item.value.toLocaleString()}</strong>{item.previous!==undefined&&<small>{comparison(item.value,item.previous,t)}</small>}</article>)}</div>}
    {summary&&<div className="analytics-no-show"><strong>{t("noShowRate")}</strong><span>{(noShow?.rate??summary.noShowRate).toFixed(1)}%</span><small>{t("noShowDenominator")}: {noShow?.eligibleAppointments??summary.totalAppointments-summary.cancelledAppointments}</small></div>}
    {loading&&!summary?<div className="analytics-chart-grid">{Array.from({length:6},(_,index)=><div className="analytics-chart-skeleton" key={index}/>)}</div>:summary?<div className="analytics-chart-grid">
      <ChartCard title={t("appointmentTrends")} description={t("appointmentTrendsHelp")} className="is-wide"><ChartEmpty rows={trends} t={t}><ResponsiveContainer width="100%" height="100%"><AreaChart data={trends}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={shortDate} stroke="var(--muted)"/><YAxis allowDecimals={false} stroke="var(--muted)"/><Tooltip contentStyle={tooltipStyle} formatter={value=>[value,t("appointmentsCount")]}/><Area type="monotone" dataKey="appointments" name={t("appointmentsCount")} stroke="var(--teal)" fill="color-mix(in srgb,var(--teal) 18%,transparent)" strokeWidth={2}/></AreaChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("appointmentStatus")} description={t("appointmentStatusHelp")}><ChartEmpty rows={statusData} t={t}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="appointments" nameKey="status" innerRadius={56} outerRadius={88} paddingAngle={3}>{statusData.map((item,index)=><Cell key={item.status} fill={chartColors[index%chartColors.length]}/>)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={value=>[value,t("appointmentsCount")]}/><Legend formatter={value=>t(`status_${value}`)}/></PieChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("weeklyBookings")} description={t("weeklyBookingsHelp")}><ChartEmpty rows={weekly} t={t}><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3"/><XAxis dataKey="day" stroke="var(--muted)"/><YAxis allowDecimals={false} stroke="var(--muted)"/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="appointments" name={t("appointmentsCount")} fill="var(--teal)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("monthlyComparison")} description={t("monthlyComparisonHelp")}><ChartEmpty rows={monthly} t={t}><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3"/><XAxis dataKey="date" stroke="var(--muted)"/><YAxis allowDecimals={false} stroke="var(--muted)"/><Tooltip contentStyle={tooltipStyle}/><Line type="monotone" dataKey="appointments" name={t("appointmentsCount")} stroke="var(--teal)" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("doctorPerformance")} description={t("doctorPerformanceHelp")}><ChartEmpty rows={doctors} t={t}><ResponsiveContainer width="100%" height="100%"><BarChart data={doctors} layout="vertical" margin={{left:10}}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false} stroke="var(--muted)"/><YAxis type="category" dataKey="doctor" width={105} stroke="var(--muted)"/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="appointments" name={t("appointmentsCount")} fill="var(--teal)" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("popularServices")} description={t("popularServicesHelp")}><ChartEmpty rows={services} t={t}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={services} dataKey="appointments" nameKey="service" innerRadius={48} outerRadius={84} paddingAngle={3}>{services.map((item,index)=><Cell key={item.service} fill={chartColors[index%chartColors.length]}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/><Legend/></PieChart></ResponsiveContainer></ChartEmpty></ChartCard>
    </div>:<div className="analytics-empty">{t("noAnalytics")}</div>}
  </section>;
}

function ChartCard({title,description,className,children}:{title:string;description:string;className?:string;children:React.ReactNode}){
  return <article className={`analytics-chart-card ${className??""}`}><header><h2>{title}</h2><p>{description}</p></header><div className="analytics-chart">{children}</div></article>;
}

function ChartEmpty({rows,t,children}:{rows:unknown[];t:ReturnType<typeof useTranslations>;children:React.ReactNode}){
  return rows.length?children:<div className="chart-empty">{t("noChartData")}</div>;
}

async function readBody<T>(response:Response){
  const result=await response.json() as ApiData<T>;
  if(!response.ok)throw new Error(result.error?.message??"Unable to load analytics.");
  return result.data;
}

function comparison(current:number,previous:number,t:ReturnType<typeof useTranslations>){
  if(previous===0)return t("noPreviousPeriod");
  const change=((current-previous)/previous)*100;
  return `${change>=0?"+":""}${change.toFixed(1)}% ${t("previousPeriod")}`;
}

function shortDate(value:string){
  const date=new Date(`${value}T12:00:00+06:00`);
  return new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",month:"short",day:"numeric"}).format(date);
}

const tooltipStyle={background:"var(--surface)",border:"1px solid var(--line)",borderRadius:10,color:"var(--text)"};
