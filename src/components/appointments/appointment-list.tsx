"use client";

import {CalendarDays,Clock3,Stethoscope} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import {canPatientCancelAppointment} from "@/lib/appointments/time";
import {useEffect,useState} from "react";
import {toast} from "react-hot-toast";

type Props={role:"patient"|"receptionist"|"admin";initialPeriod?:"upcoming"|"previous"|"cancelled"|"all";display?:"cards"|"table"};
type Appointment={id:string;patientName:string;patientPhone:string|null;startAt:string;endAt:string;status:"CONFIRMED"|"COMPLETED"|"CANCELLED"|"NO_SHOW";cancellationReason:string|null;doctor:{id:string;name:string;specialization:string};service:{id:string;name:string;durationMinutes:number;price:string|number};chair:{id:string;name:string}};
type Result={data:Appointment[];pagination:{page:number;limit:number;total:number;totalPages:number};error?:{message?:string}};

export function AppointmentList({role,initialPeriod="upcoming",display="cards"}:Props){
  const t=useTranslations("appointments");
  const ui=useTranslations("appointmentUi");
  const [period,setPeriod]=useState(initialPeriod);
  const [page,setPage]=useState(1);
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [pagination,setPagination]=useState<Result["pagination"]>({page:1,limit:display==="table"?20:100,total:0,totalPages:0});
  const [now,setNow]=useState(0);
  const [loadedKey,setLoadedKey]=useState("");
  const [refreshCount,setRefreshCount]=useState(0);
  const [busyId,setBusyId]=useState("");
  const [failure,setFailure]=useState<{key:string;message:string}|null>(null);
  const endpoint=role==="patient"?"/api/appointments/my":role==="admin"?"/api/admin/appointments":"/api/receptionist/appointments";
  const limit=display==="table"?20:100;
  const requestKey=`${endpoint}:${period}:${page}:${refreshCount}`;
  const loading=loadedKey!==requestKey;
  const error=failure?.key===requestKey?failure.message:"";

  useEffect(()=>{
    const updateNow=()=>setNow(Date.now());
    updateNow();
    const timer=setInterval(updateNow,60_000);
    return ()=>clearInterval(timer);
  },[]);

  useEffect(()=>{
    let active=true;
    fetch(`${endpoint}?period=${period}&page=${page}&limit=${limit}`,{cache:"no-store"}).then(async response=>{
      const body=await response.json() as Result;
      if(!response.ok)throw new Error(body.error?.message??t("loadFailed"));
      if(active&&page>Math.max(1,body.pagination.totalPages)){setPage(Math.max(1,body.pagination.totalPages));return}
      if(active){setAppointments(body.data);setPagination(body.pagination);setFailure(null)}
    }).catch(cause=>{if(active)setFailure({key:requestKey,message:cause instanceof Error?cause.message:t("loadFailed")})}).finally(()=>{if(active)setLoadedKey(requestKey)});
    return ()=>{active=false};
  },[endpoint,period,page,limit,requestKey,t]);

  async function cancel(appointment:Appointment){
    if(busyId)return;
    setBusyId(appointment.id);
    try{
      const response=await fetch(`/api/appointments/${appointment.id}/cancel`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
      const body=await response.json() as Result;
      if(!response.ok)throw new Error(body.error?.message??t("cancelFailed"));
      setRefreshCount(count=>count+1);
      toast.success(t("cancelled"));
    }catch(cause){
      const message=cause instanceof Error?cause.message:t("cancelFailed");
      setFailure({key:requestKey,message});
      toast.error(message);
    }finally{setBusyId("")}
  }
  const formatDate=(value:string)=>new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));

  return <section className="appointment-list">
    <div className="appointment-list-toolbar"><div className="appointment-tabs">{(["upcoming","previous","cancelled","all"] as const).map(value=><button type="button" className={period===value?"is-current":""} key={value} onClick={()=>{setPeriod(value);setPage(1)}}>{t(value)}</button>)}</div>{role==="patient"&&<Link className="button button-primary" href="/appointment">+ {t("bookAppointment")}</Link>}</div>
    {error&&<p className="management-error" role="alert">{error}</p>}
    {loading?<div className="appointment-card-grid appointment-loading" role="status" aria-label={t("loading")}>{Array.from({length:4},(_,index)=><article className="appointment-card-skeleton" key={index}><div><i/><i/></div><i/><i/><i/></article>)}</div>:appointments.length?display==="table"?<>
      <div className="management-table-wrap">
        <table className="management-table patient-appointment-table">
          <thead><tr><th>{t("date")}</th><th>{t("doctor")}</th><th>{t("service")}</th><th>{ui("status")}</th><th>{t("actions")}</th></tr></thead>
          <tbody>{appointments.map(appointment=><tr key={appointment.id}>
            <td>{formatDate(appointment.startAt)}</td>
            <td><strong>{appointment.doctor.name}</strong><small>{appointment.doctor.specialization}</small></td>
            <td><strong>{appointment.service.name}</strong><small>{appointment.service.durationMinutes} {t("minutes")}</small></td>
            <td><span className={`appointment-status status-${appointment.status.toLowerCase()}`}>{t(`status_${appointment.status}`)}</span></td>
            <td><div className="appointment-history-actions">
              <Link className="text-link" href={detailHref(role,appointment.id)}>{t("details")}</Link>
              {appointment.status==="CONFIRMED"&&role==="patient"&&period==="upcoming"&&<Link className="text-link" href={`/patient/dashboard/bookings/${appointment.id}/reschedule`}>{t("reschedule")}</Link>}
              {appointment.status==="CONFIRMED"&&(role!=="patient"||(now>0&&canPatientCancelAppointment(new Date(appointment.startAt),new Date(now))))&&<button type="button" className="appointment-action-button is-cancelled" disabled={busyId===appointment.id} onClick={()=>cancel(appointment)}>{busyId===appointment.id?t("saving"):t("cancel")}</button>}
              {role==="patient"&&appointment.status==="CONFIRMED"&&now>0&&new Date(appointment.startAt).getTime()>now&&!canPatientCancelAppointment(new Date(appointment.startAt),new Date(now))&&<small className="appointment-cancel-hint">{ui("cancelWindowClosed")}</small>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {display==="table"&&pagination.totalPages>1&&<nav className="appointment-pagination" aria-label={ui("historyPagination")}>
        <button type="button" className="button button-outline" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>{ui("previousPage")}</button>
        <span>{ui("pageSummary",{page,totalPages:pagination.totalPages})}</span>
        <button type="button" className="button button-outline" disabled={page>=pagination.totalPages} onClick={()=>setPage(value=>Math.min(pagination.totalPages,value+1))}>{ui("nextPage")}</button>
      </nav>}
    </>:<div className="management-empty"><Clock3 size={22}/><h2>{t("emptyTitle")}</h2><p>{t("emptyDescription")}</p></div>:<div className="appointment-card-grid">{appointments.map(appointment=><article className="appointment-card" key={appointment.id}>
      <div className="appointment-card-heading"><span className={`appointment-status status-${appointment.status.toLowerCase()}`}>{t(`status_${appointment.status}`)}</span><strong>{formatDate(appointment.startAt)}</strong></div>
      <div className="appointment-card-info"><Stethoscope size={16}/><div><strong>{appointment.doctor.name}</strong><small>{appointment.doctor.specialization}</small></div></div>
      <div className="appointment-card-info"><CalendarDays size={16}/><div><strong>{appointment.service.name}</strong><small>{appointment.service.durationMinutes} {t("minutes")} · ৳{Number(appointment.service.price).toLocaleString()}</small></div></div>
      {role!=="patient"&&<div className="appointment-card-info"><span className="patient-monogram">{appointment.patientName.slice(0,1).toUpperCase()}</span><div><strong>{appointment.patientName}</strong><small>{appointment.patientPhone??t("noPhone")}</small></div></div>}
      <div className="appointment-card-footer"><Link className="text-link" href={detailHref(role,appointment.id)}>{t("details")} ↗</Link>{appointment.status==="CONFIRMED"&&<div className="appointment-card-actions">{role==="patient"&&period==="upcoming"&&<Link className="text-link" href={`/patient/dashboard/bookings/${appointment.id}/reschedule`}>{t("reschedule")}</Link>}{(role!=="patient"||(now>0&&canPatientCancelAppointment(new Date(appointment.startAt),new Date(now))))&&<button type="button" className="appointment-action-button is-cancelled" disabled={busyId===appointment.id} onClick={()=>cancel(appointment)}>{busyId===appointment.id?t("saving"):t("cancel")}</button>}{role==="patient"&&now>0&&new Date(appointment.startAt).getTime()>now&&!canPatientCancelAppointment(new Date(appointment.startAt),new Date(now))&&<small className="appointment-cancel-hint">{ui("cancelWindowClosed")}</small>}</div>}</div>
    </article>)}</div>}
  </section>;
}

function detailHref(role:Props["role"],id:string){
  if(role==="patient")return `/patient/dashboard/bookings/${id}`;
  if(role==="admin")return `/admin/dashboard/appointments/${id}`;
  return `/receptionist/dashboard/appointments/${id}`;
}
