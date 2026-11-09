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
    if(role!=="patient")return;
    const refreshVisibleAppointments=()=>{
      if(document.visibilityState==="visible")setRefreshCount(count=>count+1);
    };
    const refreshOnVisibility=()=>{
      if(document.visibilityState==="visible")refreshVisibleAppointments();
    };
    const timer=setInterval(refreshVisibleAppointments,60_000);
    window.addEventListener("focus",refreshVisibleAppointments);
    document.addEventListener("visibilitychange",refreshOnVisibility);
    return ()=>{
      clearInterval(timer);
      window.removeEventListener("focus",refreshVisibleAppointments);
      document.removeEventListener("visibilitychange",refreshOnVisibility);
    };
  },[role]);

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

  return <section className="tw-appointment-list min-w-[length:0]">
    <div className="tw-appointment-list-toolbar flex items-center gap-[9px] [flex-wrap:wrap] mb-[18px] justify-between [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col"><div className="tw-appointment-tabs flex gap-[3px] p-[4px] [border:1px_solid_var(--line)] rounded-[10px] [background:var(--surface)] [&_button]:min-h-[30px] [&_button]:p-[0_12px] [&_button]:[border:0] [&_button]:rounded-[7px] [&_button]:[background:transparent] [&_button]:[color:var(--muted)] [&_button]:[font:inherit] [&_button]:text-[length:10px] [&_button]:cursor-pointer [.tw-appointment-list-toolbar_&]:[flex-wrap:wrap] [@media(max-width:650px)]:max-w-[length:100%] [@media(max-width:650px)]:overflow-auto [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[0_1_auto] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[1_1_100%] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:justify-center">{(["upcoming","previous","cancelled","all"] as const).map(value=><button type="button" className={period===value?"tw-is-current [.tw-dashboard-link&]:[background:var(--mint)] [.tw-dashboard-link&]:[color:var(--teal)] [.tw-dashboard-link&]:font-bold [.tw-appointment-tabs_button&]:[background:color-mix(in_srgb,var(--teal)_12%,transparent)] [.tw-appointment-tabs_button&]:[color:var(--teal)] [.tw-appointment-tabs_button&]:font-bold [.tw-booking-steps_li&]:[color:var(--teal)] [.tw-booking-steps_li&]:font-bold [.tw-booking-steps_li&_span]:border-[color:var(--teal)] [.tw-booking-steps_li&_span]:[background:var(--teal)] [.tw-booking-steps_li&_span]:[color:white] [.tw-dashboard-link&]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--teal)_10%,transparent)] [.tw-dashboard-link&::before]:[transform:scaleY(1)] [.tw-dashboard-link&::before]:opacity-[1] [.tw-dashboard-link&_svg]:[transform:scale(1.04)] [@media(max-width:760px)]:[.tw-dashboard-link&::before]:[transform:scaleX(1)]":""} key={value} onClick={()=>{setPeriod(value);setPage(1)}}>{t(value)}</button>)}</div>{role==="patient"&&<Link className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" href="/appointment">+ {t("bookAppointment")}</Link>}</div>
    {error&&<p className="tw-management-error m-[0] [color:#b43e37] text-[length:12px]" role="alert">{error}</p>}
    {loading?<div className="tw-appointment-card-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[13px] [@media(max-width:650px)]:grid-cols-[1fr] tw-appointment-loading grid gap-[10px] [&_span]:h-[75px] [&_span]:rounded-[12px] [&_span]:[background:var(--line)] [&_span]:opacity-[.55] [&_span]:animate-[appointment-shimmer_1.3s_infinite]" role="status" aria-label={t("loading")}>{Array.from({length:4},(_,index)=><article className="tw-appointment-card-skeleton grid gap-[17px] min-h-[190px] p-[17px] [border:1px_solid_var(--line)] rounded-[13px] [background:var(--surface)] [&>div]:flex [&>div]:justify-between [&>div]:gap-[12px] [&_i]:block [&_i]:w-[75%] [&_i]:h-[9px] [&_i]:rounded-[7px] [&_i]:[background:linear-gradient(100deg,color-mix(in_srgb,var(--line)_78%,var(--surface)),color-mix(in_srgb,var(--surface)_44%,var(--line)),color-mix(in_srgb,var(--line)_78%,var(--surface)))] [&_i]:bg-[size:220%_100%] [&_i]:animate-[appointment-shimmer_1.55s_ease-in-out_infinite] [&>div_i:first-child]:w-[33%] [&>div_i:first-child]:h-[19px] [&>div_i:last-child]:w-[43%] [&>i:last-child]:w-[53%] [&>i:last-child]:opacity-[.65] [@media(prefers-reduced-motion:reduce)]:[&_i]:animate-[none]" key={index}><div><i/><i/></div><i/><i/><i/></article>)}</div>:appointments.length?display==="table"?<>
      <div className="tw-management-table-wrap w-[100%] overflow-x-auto">
        <table className="tw-management-table w-[100%] [border-collapse:collapse] text-left text-[length:12px] [&_th]:p-[12px] [&_th]:[color:var(--muted)] [&_th]:text-[length:10px] [&_th]:tracking-[.8px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_td]:p-[14px_12px] [&_td]:[border-top:1px_solid_var(--line)] [&_td]:align-[middle] [&_td_small]:block [&_td_strong]:block [&_td_small]:mt-[5px] [&_td_small]:[color:var(--muted)] [&_td_small]:text-[length:11px] [&_td_small]:max-w-[length:340px] [&_td_small]:leading-[1.5] [@media(max-width:650px)]:[&_th]:p-[11px_9px] [@media(max-width:650px)]:[&_td]:p-[11px_9px] tw-patient-appointment-table min-w-[length:700px]">
          <thead><tr><th>{t("date")}</th><th>{t("doctor")}</th><th>{t("service")}</th><th>{ui("status")}</th><th>{t("actions")}</th></tr></thead>
          <tbody>{appointments.map(appointment=><tr key={appointment.id}>
            <td>{formatDate(appointment.startAt)}</td>
            <td><strong>{appointment.doctor.name}</strong><small>{appointment.doctor.specialization}</small></td>
            <td><strong>{appointment.service.name}</strong><small>{appointment.service.durationMinutes} {t("minutes")}</small></td>
            <td><span className={`tw-appointment-status inline-flex items-center whitespace-nowrap p-[5px_8px] rounded-[20px] text-[length:9px] font-bold status-${appointment.status.toLowerCase()}`}>{t(`status_${appointment.status}`)}</span></td>
            <td><div className="tw-appointment-history-actions flex items-center gap-[9px] [flex-wrap:wrap]">
              <Link className="tw-text-link inline-flex items-center gap-[8px] [color:var(--teal)] text-[length:12px] font-bold [@media(max-width:760px)]:[.tw-section-heading_&]:text-[length:10px] [@media(max-width:760px)]:[.tw-section-heading_&]:mt-[25px] [@media(max-width:760px)]:[.tw-section-heading_&]:whitespace-nowrap text-[length:10px] no-underline" href={detailHref(role,appointment.id)}>{t("details")}</Link>
              {appointment.status==="CONFIRMED"&&role==="patient"&&period==="upcoming"&&<Link className="tw-text-link inline-flex items-center gap-[8px] [color:var(--teal)] text-[length:12px] font-bold [@media(max-width:760px)]:[.tw-section-heading_&]:text-[length:10px] [@media(max-width:760px)]:[.tw-section-heading_&]:mt-[25px] [@media(max-width:760px)]:[.tw-section-heading_&]:whitespace-nowrap text-[length:10px] no-underline" href={`/patient/dashboard/bookings/${appointment.id}/reschedule`}>{t("reschedule")}</Link>}
              {appointment.status==="CONFIRMED"&&(role!=="patient"||(now>0&&canPatientCancelAppointment(new Date(appointment.startAt),new Date(now))))&&<button type="button" className="tw-appointment-action-button inline-flex items-center justify-center min-h-[29px] p-[5px_9px] [border:1px_solid_transparent] rounded-[7px] text-[length:10px] font-bold leading-[1.2] whitespace-nowrap [transition:transform_.15s_ease,background-color_.15s_ease,border-color_.15s_ease,opacity_.15s_ease] [&:not(:disabled):hover]:[filter:saturate(1.15)] [&:not(:disabled):hover]:[transform:translateY(-1px)] [&:not(:disabled):active]:[transform:scale(.94)] [&:disabled]:cursor-wait [&:disabled]:opacity-[.5] [&:focus-visible]:[outline:3px_solid_color-mix(in_srgb,var(--teal)_45%,transparent)] [&:focus-visible]:[outline-offset:3px] [@media(prefers-reduced-motion:reduce)]:[transition:none] tw-is-cancelled [.tw-appointment-action-button&]:border-[color:color-mix(in_srgb,#dc2626_18%,var(--line))] [.tw-appointment-action-button&]:[background:color-mix(in_srgb,#dc2626_8%,var(--surface))] [.tw-appointment-action-button&]:[color:#a3423a] [.dark_.tw-appointment-action-button&]:[color:#f2a09a]" disabled={busyId===appointment.id} onClick={()=>cancel(appointment)}>{busyId===appointment.id?t("saving"):t("cancel")}</button>}
              {role==="patient"&&appointment.status==="CONFIRMED"&&now>0&&new Date(appointment.startAt).getTime()>now&&!canPatientCancelAppointment(new Date(appointment.startAt),new Date(now))&&<small className="tw-appointment-cancel-hint max-w-[length:175px] [color:var(--muted)] text-[length:10px] leading-[1.45]">{ui("cancelWindowClosed")}</small>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {display==="table"&&pagination.totalPages>1&&<nav className="tw-appointment-pagination flex items-center justify-center gap-[14px] mt-[18px] [&>span]:[color:var(--muted)] [&>span]:text-[length:11px]" aria-label={ui("historyPagination")}>
        <button type="button" className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>{ui("previousPage")}</button>
        <span>{ui("pageSummary",{page,totalPages:pagination.totalPages})}</span>
        <button type="button" className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" disabled={page>=pagination.totalPages} onClick={()=>setPage(value=>Math.min(pagination.totalPages,value+1))}>{ui("nextPage")}</button>
      </nav>}
    </>:<div className="tw-management-empty p-[38px_24px] text-center [border:1px_dashed_var(--line)] rounded-[14px] [background:var(--surface)] [&_h2]:mb-[7px] [&_h2]:text-[length:17px] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px]"><Clock3 size={22}/><h2>{t("emptyTitle")}</h2><p>{t("emptyDescription")}</p></div>:<div className="tw-appointment-card-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[13px] [@media(max-width:650px)]:grid-cols-[1fr]">{appointments.map(appointment=><article className="tw-appointment-card min-w-[length:0] p-[17px] [border:1px_solid_var(--line)] rounded-[13px] [background:var(--surface)]" key={appointment.id}>
      <div className="tw-appointment-card-heading flex items-center justify-between gap-[10px] mb-[16px] [&_strong]:text-[length:11px]"><span className={`tw-appointment-status inline-flex items-center whitespace-nowrap p-[5px_8px] rounded-[20px] text-[length:9px] font-bold status-${appointment.status.toLowerCase()}`}>{t(`status_${appointment.status}`)}</span><strong>{formatDate(appointment.startAt)}</strong></div>
      <div className="tw-appointment-card-info flex items-center gap-[10px] m-[12px_0] [color:var(--teal)] [&>div]:grid [&>div]:gap-[3px] [&>div]:min-w-[length:0] [&>div]:[color:var(--text)] [&_strong]:text-[length:11px] [&_small]:[color:var(--muted)] [&_small]:text-[length:10px]"><Stethoscope size={16}/><div><strong>{appointment.doctor.name}</strong><small>{appointment.doctor.specialization}</small></div></div>
      <div className="tw-appointment-card-info flex items-center gap-[10px] m-[12px_0] [color:var(--teal)] [&>div]:grid [&>div]:gap-[3px] [&>div]:min-w-[length:0] [&>div]:[color:var(--text)] [&_strong]:text-[length:11px] [&_small]:[color:var(--muted)] [&_small]:text-[length:10px]"><CalendarDays size={16}/><div><strong>{appointment.service.name}</strong><small>{appointment.service.durationMinutes} {t("minutes")} · ৳{Number(appointment.service.price).toLocaleString()}</small></div></div>
      {role!=="patient"&&<div className="tw-appointment-card-info flex items-center gap-[10px] m-[12px_0] [color:var(--teal)] [&>div]:grid [&>div]:gap-[3px] [&>div]:min-w-[length:0] [&>div]:[color:var(--text)] [&_strong]:text-[length:11px] [&_small]:[color:var(--muted)] [&_small]:text-[length:10px]"><span className="tw-patient-monogram grid [place-items:center] flex-[0_0_27px] h-[27px] rounded-[50%] [background:color-mix(in_srgb,var(--teal)_12%,transparent)] text-[length:11px] font-bold">{appointment.patientName.slice(0,1).toUpperCase()}</span><div><strong>{appointment.patientName}</strong><small>{appointment.patientPhone??t("noPhone")}</small></div></div>}
      <div className="tw-appointment-card-footer flex items-center justify-between gap-[10px] mt-[15px] pt-[12px] [border-top:1px_solid_var(--line)] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col"><Link className="tw-text-link inline-flex items-center gap-[8px] [color:var(--teal)] text-[length:12px] font-bold [@media(max-width:760px)]:[.tw-section-heading_&]:text-[length:10px] [@media(max-width:760px)]:[.tw-section-heading_&]:mt-[25px] [@media(max-width:760px)]:[.tw-section-heading_&]:whitespace-nowrap text-[length:10px] no-underline" href={detailHref(role,appointment.id)}>{t("details")} ↗</Link>{appointment.status==="CONFIRMED"&&<div className="tw-appointment-card-actions flex items-center gap-[8px] [flex-wrap:wrap] justify-end [@media(max-width:650px)]:justify-start">{role==="patient"&&period==="upcoming"&&<Link className="tw-text-link inline-flex items-center gap-[8px] [color:var(--teal)] text-[length:12px] font-bold [@media(max-width:760px)]:[.tw-section-heading_&]:text-[length:10px] [@media(max-width:760px)]:[.tw-section-heading_&]:mt-[25px] [@media(max-width:760px)]:[.tw-section-heading_&]:whitespace-nowrap text-[length:10px] no-underline" href={`/patient/dashboard/bookings/${appointment.id}/reschedule`}>{t("reschedule")}</Link>}{(role!=="patient"||(now>0&&canPatientCancelAppointment(new Date(appointment.startAt),new Date(now))))&&<button type="button" className="tw-appointment-action-button inline-flex items-center justify-center min-h-[29px] p-[5px_9px] [border:1px_solid_transparent] rounded-[7px] text-[length:10px] font-bold leading-[1.2] whitespace-nowrap [transition:transform_.15s_ease,background-color_.15s_ease,border-color_.15s_ease,opacity_.15s_ease] [&:not(:disabled):hover]:[filter:saturate(1.15)] [&:not(:disabled):hover]:[transform:translateY(-1px)] [&:not(:disabled):active]:[transform:scale(.94)] [&:disabled]:cursor-wait [&:disabled]:opacity-[.5] [&:focus-visible]:[outline:3px_solid_color-mix(in_srgb,var(--teal)_45%,transparent)] [&:focus-visible]:[outline-offset:3px] [@media(prefers-reduced-motion:reduce)]:[transition:none] tw-is-cancelled [.tw-appointment-action-button&]:border-[color:color-mix(in_srgb,#dc2626_18%,var(--line))] [.tw-appointment-action-button&]:[background:color-mix(in_srgb,#dc2626_8%,var(--surface))] [.tw-appointment-action-button&]:[color:#a3423a] [.dark_.tw-appointment-action-button&]:[color:#f2a09a]" disabled={busyId===appointment.id} onClick={()=>cancel(appointment)}>{busyId===appointment.id?t("saving"):t("cancel")}</button>}{role==="patient"&&now>0&&new Date(appointment.startAt).getTime()>now&&!canPatientCancelAppointment(new Date(appointment.startAt),new Date(now))&&<small className="tw-appointment-cancel-hint max-w-[length:175px] [color:var(--muted)] text-[length:10px] leading-[1.45]">{ui("cancelWindowClosed")}</small>}</div>}</div>
    </article>)}</div>}
  </section>;
}

function detailHref(role:Props["role"],id:string){
  if(role==="patient")return `/patient/dashboard/bookings/${id}`;
  if(role==="admin")return `/admin/dashboard/appointments/${id}`;
  return `/receptionist/dashboard/appointments/${id}`;
}
