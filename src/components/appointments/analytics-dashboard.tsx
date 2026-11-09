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
    }).catch(()=>{if(active)setFailure({queryKey,message:t("loadFailed")})});
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

  return <section className="tw-analytics-dashboard m-[38px_0_28px]">
    <header className="tw-analytics-header flex items-end justify-between gap-[22px] mb-[20px] [&_h1]:m-[7px_0] [&_h1]:text-[length:clamp(24px,3vw,34px)] [&_h1]:tracking-[-.04em] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:12px] [&_p]:leading-[1.6] [@media(max-width:900px)]:items-start [@media(max-width:900px)]:flex-col"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("overviewKicker")}</span><h1>{t("title")}</h1><p>{t("description")}</p></div><div className="tw-analytics-filters flex items-end justify-end gap-[10px] [flex-wrap:wrap] [&_label]:grid [&_label]:gap-[5px] [&_label]:[color:var(--muted)] [&_label]:text-[length:10px] [&_label]:font-bold [&_select]:h-[39px] [&_select]:min-w-[length:145px] [&_select]:p-[0_10px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--surface)] [&_select]:[color:var(--text)] [&_select]:[font:inherit] [&_input]:h-[39px] [&_input]:min-w-[length:145px] [&_input]:p-[0_10px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--surface)] [&_input]:[color:var(--text)] [&_input]:[font:inherit] [@media(max-width:900px)]:justify-start [@media(max-width:650px)]:w-[100%] [@media(max-width:650px)]:[&_label]:flex-[1] [@media(max-width:650px)]:[&_select]:min-w-[length:0] [@media(max-width:650px)]:[&_select]:w-[100%] [@media(max-width:650px)]:[&_input]:min-w-[length:0] [@media(max-width:650px)]:[&_input]:w-[100%]"><label><span>{t("dateRange")}</span><select value={period} onChange={event=>changePeriod(event.target.value as Period)}>{(["today","yesterday","last7days","last30days","last3months","last6months","thisYear","custom"] as const).map(item=><option key={item} value={item}>{t(`period_${item}`)}</option>)}</select></label>{period==="custom"&&<><label><span>{t("from")}</span><input type="date" max={to||undefined} value={from} onChange={event=>changeRange("from",event.target.value)}/></label><label><span>{t("to")}</span><input type="date" min={from||undefined} value={to} onChange={event=>changeRange("to",event.target.value)}/></label></>}</div></header>
    {error&&<div className="tw-analytics-error m-[14px_0] p-[12px_14px] [border:1px_solid_#e8b8b3] rounded-[9px] [color:#a3423a] [background:#fff6f5] text-[length:12px]" role="alert">{error}</div>}
    {loading&&!summary?<div className="tw-analytics-kpi-grid grid grid-cols-[repeat(4,minmax(0,1fr))] gap-[12px] [@media(max-width:900px)]:grid-cols-[repeat(2,minmax(0,1fr))]">{Array.from({length:8},(_,index)=><div className="tw-analytics-kpi-skeleton h-[132px] rounded-[13px] [background:linear-gradient(100deg,var(--line),color-mix(in_srgb,var(--surface)_70%,var(--line)),var(--line))] bg-[size:200%_100%] animate-[appointment-shimmer_1.3s_infinite]" key={index}/>)}</div>:summary&&<div className="tw-analytics-kpi-grid grid grid-cols-[repeat(4,minmax(0,1fr))] gap-[12px] [@media(max-width:900px)]:grid-cols-[repeat(2,minmax(0,1fr))]">{kpis.map(item=><article className="tw-analytics-kpi relative grid gap-[7px] min-h-[132px] p-[17px] [border:1px_solid_var(--line)] rounded-[13px] [background:var(--surface)] [&_strong]:text-[length:25px] [&_strong]:tracking-[-.04em] [&_small]:[color:var(--muted)] [&_small]:text-[length:10px]" key={item.key}><span className="tw-analytics-kpi-icon absolute top-[15px] right-[15px] grid [place-items:center] w-[32px] h-[32px] rounded-[10px] [background:color-mix(in_srgb,var(--teal)_12%,transparent)] [color:var(--teal)]"><item.icon size={17}/></span><span className="tw-analytics-kpi-label max-w-[length:calc(100%_-_35px)] [color:var(--muted)] text-[length:11px] [font-weight:650]">{item.label}</span><strong>{item.value.toLocaleString()}</strong>{item.previous!==undefined&&<small>{comparison(item.value,item.previous,t)}</small>}</article>)}</div>}
    {summary&&<div className="tw-analytics-no-show flex items-center gap-[12px] m-[14px_0_18px] p-[13px_16px] [border:1px_solid_var(--line)] rounded-[11px] [background:var(--surface)] [&_span]:[color:var(--teal)] [&_span]:text-[length:20px] [&_span]:font-[750] [&_small]:ml-[auto] [&_small]:[color:var(--muted)] [&_small]:text-[length:10px] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:[flex-wrap:wrap] [@media(max-width:650px)]:[&_small]:flex-[1_0_100%] [@media(max-width:650px)]:[&_small]:ml-[0]"><strong>{t("noShowRate")}</strong><span>{(noShow?.rate??summary.noShowRate).toFixed(1)}%</span><small>{t("noShowDenominator")}: {noShow?.eligibleAppointments??summary.totalAppointments-summary.cancelledAppointments}</small></div>}
    {loading&&!summary?<div className="tw-analytics-chart-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] [@media(max-width:650px)]:grid-cols-[1fr]">{Array.from({length:6},(_,index)=><div className="tw-analytics-chart-skeleton h-[300px] rounded-[14px] [background:linear-gradient(100deg,var(--line),color-mix(in_srgb,var(--surface)_70%,var(--line)),var(--line))] bg-[size:200%_100%] animate-[appointment-shimmer_1.3s_infinite]" key={index}/>)}</div>:summary?<div className="tw-analytics-chart-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] [@media(max-width:650px)]:grid-cols-[1fr]">
      <ChartCard title={t("appointmentTrends")} description={t("appointmentTrendsHelp")} className="tw-is-wide [.tw-analytics-chart-card&]:col-[span_2] [@media(max-width:650px)]:[.tw-analytics-chart-card&]:col-[auto]"><ChartEmpty rows={trends} t={t}><ResponsiveContainer width="100%" height="100%"><AreaChart data={trends}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={shortDate} stroke="var(--muted)"/><YAxis allowDecimals={false} stroke="var(--muted)"/><Tooltip contentStyle={tooltipStyle} formatter={value=>[value,t("appointmentsCount")]}/><Area type="monotone" dataKey="appointments" name={t("appointmentsCount")} stroke="var(--teal)" fill="color-mix(in srgb,var(--teal) 18%,transparent)" strokeWidth={2}/></AreaChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("appointmentStatus")} description={t("appointmentStatusHelp")}><ChartEmpty rows={statusData} t={t}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="appointments" nameKey="status" innerRadius={56} outerRadius={88} paddingAngle={3}>{statusData.map((item,index)=><Cell key={item.status} fill={chartColors[index%chartColors.length]}/>)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={value=>[value,t("appointmentsCount")]}/><Legend formatter={value=>t(`status_${value}`)}/></PieChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("weeklyBookings")} description={t("weeklyBookingsHelp")}><ChartEmpty rows={weekly} t={t}><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3"/><XAxis dataKey="day" stroke="var(--muted)"/><YAxis allowDecimals={false} stroke="var(--muted)"/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="appointments" name={t("appointmentsCount")} fill="var(--teal)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("monthlyComparison")} description={t("monthlyComparisonHelp")}><ChartEmpty rows={monthly} t={t}><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3"/><XAxis dataKey="date" stroke="var(--muted)"/><YAxis allowDecimals={false} stroke="var(--muted)"/><Tooltip contentStyle={tooltipStyle}/><Line type="monotone" dataKey="appointments" name={t("appointmentsCount")} stroke="var(--teal)" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("doctorPerformance")} description={t("doctorPerformanceHelp")}><ChartEmpty rows={doctors} t={t}><ResponsiveContainer width="100%" height="100%"><BarChart data={doctors} layout="vertical" margin={{left:10}}><CartesianGrid stroke="var(--line)" strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false} stroke="var(--muted)"/><YAxis type="category" dataKey="doctor" width={105} stroke="var(--muted)"/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="appointments" name={t("appointmentsCount")} fill="var(--teal)" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></ChartEmpty></ChartCard>
      <ChartCard title={t("popularServices")} description={t("popularServicesHelp")}><ChartEmpty rows={services} t={t}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={services} dataKey="appointments" nameKey="service" innerRadius={48} outerRadius={84} paddingAngle={3}>{services.map((item,index)=><Cell key={item.service} fill={chartColors[index%chartColors.length]}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/><Legend/></PieChart></ResponsiveContainer></ChartEmpty></ChartCard>
    </div>:<div className="tw-analytics-empty p-[30px] text-center [color:var(--muted)] text-[length:13px]">{t("noAnalytics")}</div>}
  </section>;
}

function ChartCard({title,description,className,children}:{title:string;description:string;className?:string;children:React.ReactNode}){
  return <article className={`tw-analytics-chart-card [&_header_p]:m-[0] [&_header_p]:[color:var(--muted)] [&_header_p]:text-[length:12px] [&_header_p]:leading-[1.6] min-w-[length:0] p-[19px] [border:1px_solid_var(--line)] rounded-[14px] [background:var(--surface)] [&_header_h2]:m-[0_0_5px] [&_header_h2]:text-[length:15px] [&_header_p]:text-[length:10px] [@media(max-width:650px)]:p-[15px] ${className??""}`}><header><h2>{title}</h2><p>{description}</p></header><div className="tw-analytics-chart h-[255px] mt-[16px] [.tw-analytics-chart-card.tw-is-wide_&]:h-[285px] [@media(max-width:650px)]:h-[230px]">{children}</div></article>;
}

function ChartEmpty({rows,t,children}:{rows:unknown[];t:ReturnType<typeof useTranslations>;children:React.ReactNode}){
  return rows.length?children:<div className="tw-chart-empty grid [place-items:center] h-[100%] [color:var(--muted)] text-[length:12px]">{t("noChartData")}</div>;
}

async function readBody<T>(response:Response){
  const result=await response.json() as ApiData<T>;
  if(!response.ok)throw new Error("Unable to load analytics.");
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
