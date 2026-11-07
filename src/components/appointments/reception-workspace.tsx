"use client";

import {CalendarDays,Search,Stethoscope} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import {useEffect,useState} from "react";

type Props={role:"receptionist"|"admin"};
type Appointment={id:string;patientName:string;patientPhone:string|null;startAt:string;endAt:string;status:"CONFIRMED"|"COMPLETED"|"CANCELLED"|"NO_SHOW";doctor:{id:string;name:string;specialization:string};service:{name:string;durationMinutes:number};chair:{id:string;name:string}};
type Doctor={id:string;name:string;specialization:string};
type ApiResult<T>={data:T;pagination?:{total:number};error?:{message?:string}};

export function ReceptionWorkspace({role}:Props){
  const t=useTranslations("appointments");
  const m=useTranslations("management");
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [doctors,setDoctors]=useState<Doctor[]>([]);
  const [date,setDate]=useState(()=>dhakaDate());
  const [view,setView]=useState<"day"|"week"|"month">("day");
  const [status,setStatus]=useState("");
  const [doctorId,setDoctorId]=useState("");
  const [query,setQuery]=useState("");
  const [loadedKey,setLoadedKey]=useState("");
  const [failure,setFailure]=useState<{key:string;message:string}|null>(null);
  const base=role==="admin"?"/admin/dashboard/appointments":"/receptionist/dashboard/appointments";
  const api=role==="admin"?"/api/admin/appointments":"/api/receptionist/appointments";
  const queryKey=JSON.stringify([api,date,view,status,doctorId,query]);
  const loading=loadedKey!==queryKey;
  const error=failure?.key===queryKey||failure?.key==="doctors"?failure.message:"";

  useEffect(()=>{
    let active=true;
    fetch("/api/doctors?limit=100").then(async response=>{
      const body=await response.json() as ApiResult<Doctor[]>;
      if(!response.ok)throw new Error(body.error?.message??t("loadFailed"));
      if(active){setDoctors(body.data);setFailure(null)}
    }).catch(cause=>{if(active)setFailure({key:"doctors",message:cause instanceof Error?cause.message:t("loadFailed")})});
    return ()=>{active=false};
  },[t]);

  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    const range=dateRange(date,view);
    const params=new URLSearchParams({period:"all",limit:"100",from:range.from,to:range.to});
    if(status)params.set("status",status);
    if(doctorId)params.set("doctorId",doctorId);
    if(query.trim())params.set("q",query.trim());
    fetch(`${api}?${params}`,{signal:controller.signal,cache:"no-store"}).then(async response=>{
      const body=await response.json() as ApiResult<Appointment[]>;
      if(!response.ok)throw new Error(body.error?.message??t("loadFailed"));
      if(active){setAppointments(body.data);setFailure(null)}
    }).catch(cause=>{if(active&&cause instanceof Error&&cause.name!=="AbortError")setFailure({key:queryKey,message:cause.message})}).finally(()=>{if(active)setLoadedKey(queryKey)});
    return ()=>{active=false;controller.abort()};
  },[api,date,view,status,doctorId,query,t,queryKey]);

  async function setAppointmentStatus(appointment:Appointment,next:"COMPLETED"|"NO_SHOW"|"CANCELLED"){
    const confirmed=next!=="CANCELLED"||window.confirm(t("confirmCancel"));
    if(!confirmed)return;
    const endpoint=role==="admin"?`/api/admin/appointments/${appointment.id}/status`:`/api/receptionist/appointments/${appointment.id}`;
    try{
      const response=await fetch(endpoint,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next})});
      const result=await response.json() as ApiResult<Appointment>;
      if(!response.ok){setFailure({key:queryKey,message:result.error?.message??t("updateFailed")});return}
      setAppointments(current=>current.map(item=>item.id===appointment.id?result.data:item));
      setFailure(null);
    }catch(cause){setFailure({key:queryKey,message:cause instanceof Error?cause.message:t("updateFailed")})}
  }

  return <section className="reception-workspace">
    <div className="reception-toolbar">
      <label className="appointment-filter"><CalendarDays size={16}/><input aria-label={t("appointmentDate")} type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
      <div className="appointment-tabs">{(["day","week","month"] as const).map(item=><button type="button" className={view===item?"is-current":""} key={item} onClick={()=>setView(item)}>{t(item)}</button>)}</div>
      <label className="appointment-filter"><Stethoscope size={16}/><select aria-label={t("doctor")} value={doctorId} onChange={event=>setDoctorId(event.target.value)}><option value="">{t("allDoctors")}</option>{doctors.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
      <select className="appointment-status-filter" aria-label={t("allStatuses")} value={status} onChange={event=>setStatus(event.target.value)}><option value="">{t("allStatuses")}</option><option value="CONFIRMED">{t("status_CONFIRMED")}</option><option value="COMPLETED">{t("status_COMPLETED")}</option><option value="CANCELLED">{t("status_CANCELLED")}</option><option value="NO_SHOW">{t("status_NO_SHOW")}</option></select>
      <label className="appointment-search"><Search size={16}/><input aria-label={t("searchPatient")} placeholder={t("searchPatient")} value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <Link href={`${base}/new`} className="button button-primary">+ {t("newAppointment")}</Link>
    </div>
    {error&&<p role="alert" className="management-error">{error}</p>}
    {loading?<div className="reception-table-skeleton" role="status" aria-label={t("loading")}><div className="reception-skeleton-row reception-skeleton-heading">{Array.from({length:7},(_,index)=><i key={index}/>)}</div>{Array.from({length:6},(_,row)=><div className="reception-skeleton-row" key={row}>{Array.from({length:7},(_,cell)=><i key={cell}/>)}</div>)}</div>:appointments.length?<div className="management-table-wrap appointment-table-wrap"><table className="management-table appointment-table"><thead><tr><th>{t("time")}</th><th>{t("patient")}</th><th>{t("doctor")}</th><th>{t("service")}</th><th>{t("chair")}</th><th>{m("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{appointments.map(appointment=><tr key={appointment.id}>
      <td><strong>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"}).format(new Date(appointment.startAt))}</strong><small>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium"}).format(new Date(appointment.startAt))}</small></td>
      <td><strong>{appointment.patientName}</strong><small>{appointment.patientPhone??t("noPhone")}</small></td>
      <td><strong>{appointment.doctor.name}</strong><small>{appointment.doctor.specialization}</small></td>
      <td>{appointment.service.name}<small>{appointment.service.durationMinutes} {t("minutes")}</small></td><td>{appointment.chair.name}</td>
      <td><span className={`appointment-status status-${appointment.status.toLowerCase()}`}>{t(`status_${appointment.status}`)}</span></td>
      <td><div className="appointment-row-actions"><Link href={`${base}/${appointment.id}`}>{t("details")}</Link>{appointment.status==="CONFIRMED"&&<><button type="button" onClick={()=>setAppointmentStatus(appointment,"COMPLETED")}>{t("markCompleted")}</button><button type="button" onClick={()=>setAppointmentStatus(appointment,"NO_SHOW")}>{t("markNoShow")}</button><button type="button" onClick={()=>setAppointmentStatus(appointment,"CANCELLED")}>{t("cancel")}</button></>}</div></td>
    </tr>)}</tbody></table></div>:<div className="management-empty"><CalendarDays size={22}/><h2>{t("emptyTitle")}</h2><p>{t("emptyDescription")}</p></div>}
  </section>;
}

function dhakaDate(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateRange(date:string,view:"day"|"week"|"month"){
  const [year,month,day]=date.split("-").map(Number);
  const utcDate=new Date(Date.UTC(year,month-1,day));
  if(view==="day")return {from:date,to:date};
  if(view==="week"){
    const from=new Date(Date.UTC(year,month-1,day-((utcDate.getUTCDay()+1)%7))).toISOString().slice(0,10);
    const to=new Date(Date.UTC(year,month-1,day-((utcDate.getUTCDay()+1)%7)+6)).toISOString().slice(0,10);
    return {from,to};
  }
  const from=`${year}-${String(month).padStart(2,"0")}-01`;
  const to=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  return {from,to};
}
