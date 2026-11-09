"use client";
import { statusStyleClasses } from "@/lib/tailwind-status-classes";

import {CalendarDays,Search,Stethoscope} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import {useEffect,useState} from "react";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";
import {useAdminPreferences} from "@/lib/admin-preferences";

type Props={role:"receptionist"|"admin"};
type Appointment={id:string;patientName:string;patientPhone:string|null;startAt:string;endAt:string;status:"CONFIRMED"|"COMPLETED"|"CANCELLED"|"NO_SHOW";doctor:{id:string;name:string;specialization:string};service:{name:string;durationMinutes:number};chair:{id:string;name:string}};
type Doctor={id:string;name:string;specialization:string};
type Service={id:string;name:string};
type ApiResult<T>={data:T;pagination?:{total:number};error?:{code?:string}};
type AppointmentView="day"|"week"|"month";

export function ReceptionWorkspace({role}:Props){
  const t=useTranslations("appointments");
  const feedback=useTranslations("feedback");
  const m=useTranslations("management");
  const preferences=useAdminPreferences();
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [doctors,setDoctors]=useState<Doctor[]>([]);
  const [date,setDate]=useState(()=>dhakaDate());
  const [viewOverride,setViewOverride]=useState<AppointmentView|null>(null);
  const [status,setStatus]=useState("");
  const [doctorId,setDoctorId]=useState("");
  const [serviceId,setServiceId]=useState("");
  const [query,setQuery]=useState("");
  const [searchInput,setSearchInput]=useState("");
  const [services,setServices]=useState<Service[]>([]);
  const [busyId,setBusyId]=useState("");
  const [loadedKey,setLoadedKey]=useState("");
  const [failure,setFailure]=useState<{key:string;message:string}|null>(null);
  const [refreshTick,setRefreshTick]=useState(0);
  const view=viewOverride??preferences.view;
  const compact=preferences.density==="compact";
  const base=role==="admin"?"/admin/dashboard/appointments":"/receptionist/dashboard/appointments";
  const api=role==="admin"?"/api/admin/appointments":"/api/receptionist/appointments";
  const queryKey=JSON.stringify([api,date,view,status,doctorId,serviceId,query,refreshTick]);
  const loading=loadedKey!==queryKey;
  const error=failure?.key===queryKey||failure?.key==="doctors"?failure.message:"";

  useEffect(()=>{
    const timer=window.setTimeout(()=>setQuery(searchInput.trim()),250);
    return ()=>window.clearTimeout(timer);
  },[searchInput]);

  useEffect(()=>{
    if(preferences.refresh===0)return;
    const timer=window.setInterval(()=>setRefreshTick(value=>value+1),preferences.refresh*1000);
    return ()=>window.clearInterval(timer);
  },[preferences.refresh]);

  useEffect(()=>{
    let active=true;
    Promise.all([
      fetch("/api/doctors?limit=100").then(async response=>{
        const body=await response.json() as ApiResult<Doctor[]>;
        if(!response.ok)throw new Error(t("loadFailed"));
        return body.data;
      }),
      fetch("/api/services?limit=100").then(async response=>{
        const body=await response.json() as ApiResult<Service[]>;
        if(!response.ok)throw new Error(t("loadFailed"));
        return body.data;
      }),
    ]).then(([doctorData,serviceData])=>{
      if(active){setDoctors(doctorData);setServices(serviceData);setFailure(null)}
    }).catch(()=>{if(active)setFailure({key:"doctors",message:t("loadFailed")})});
    return ()=>{active=false};
  },[t]);

  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    const range=dateRange(date,view);
    const params=new URLSearchParams({period:"all",limit:"100",from:range.from,to:range.to});
    if(status)params.set("status",status);
    if(doctorId)params.set("doctorId",doctorId);
    if(serviceId)params.set("serviceId",serviceId);
    if(query.trim())params.set("q",query.trim());
    fetch(`${api}?${params}`,{signal:controller.signal,cache:"no-store"}).then(async response=>{
      const body=await response.json() as ApiResult<Appointment[]>;
      if(!response.ok)throw new Error(t("loadFailed"));
      if(active){setAppointments(body.data);setFailure(null)}
    }).catch(cause=>{if(active&&cause instanceof Error&&cause.name!=="AbortError")setFailure({key:queryKey,message:t("loadFailed")})}).finally(()=>{if(active)setLoadedKey(queryKey)});
    return ()=>{active=false;controller.abort()};
  },[api,date,view,status,doctorId,serviceId,query,t,queryKey]);

  async function setAppointmentStatus(appointment:Appointment,next:"COMPLETED"|"NO_SHOW"|"CANCELLED"){
    const endpoint=role==="admin"?`/api/admin/appointments/${appointment.id}/status`:`/api/receptionist/appointments/${appointment.id}`;
    const previousAppointments=appointments;
    setBusyId(appointment.id);
    const loadingToast=toast.loading(feedback("processing"));
    setAppointments(current=>status&&status!==next?current.filter(item=>item.id!==appointment.id):current.map(item=>item.id===appointment.id?{...item,status:next}:item));
    try{
      const response=await fetch(endpoint,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next})});
      const result=await response.json() as ApiResult<Appointment>;
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,result.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:t("updateFailed"),
        }));
        return;
      }
      setAppointments(current=>current.map(item=>item.id===appointment.id?result.data:item));
      setFailure(null);
      toast.success(t(next==="COMPLETED"?"markCompleted":next==="NO_SHOW"?"markNoShow":"cancelled"));
    }catch{
      setAppointments(current=>{
        const restored=current.some(item=>item.id===appointment.id)
          ?current.map(item=>item.id===appointment.id?{...item,status:appointment.status}:item)
          :[...current,previousAppointments.find(item=>item.id===appointment.id)??appointment];
        return restored.sort((left,right)=>left.startAt.localeCompare(right.startAt));
      });
      toast.error(feedback("serverError"));
    }finally{toast.dismiss(loadingToast);setBusyId("")}
  }

  return <section className="tw-reception-workspace min-w-[length:0]">
    <div className="tw-reception-toolbar flex items-center gap-[9px] [flex-wrap:wrap] mb-[18px] [@media(max-width:650px)]:[&>*]:flex-[1_1_100%]">
      <label className="tw-appointment-filter flex items-center gap-[8px] min-h-[39px] p-[0_10px] [border:1px_solid_var(--line)] rounded-[8px] [background:var(--surface)] [color:var(--muted)] [&_input]:min-w-[length:0] [&_input]:[border:0] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[color:var(--text)] [&_input]:[font:inherit] [&_input]:text-[length:11px] [&_select]:min-w-[length:0] [&_select]:[border:0] [&_select]:[outline:0] [&_select]:[background:transparent] [&_select]:[color:var(--text)] [&_select]:[font:inherit] [&_select]:text-[length:11px] [&_select]:max-w-[length:180px] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[1_1_145px] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:min-w-[length:0]"><CalendarDays size={16}/><input aria-label={t("appointmentDate")} type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
      <div className="tw-appointment-tabs flex gap-[3px] p-[4px] [border:1px_solid_var(--line)] rounded-[10px] [background:var(--surface)] [&_button]:min-h-[30px] [&_button]:p-[0_12px] [&_button]:[border:0] [&_button]:rounded-[7px] [&_button]:[background:transparent] [&_button]:[color:var(--muted)] [&_button]:[font:inherit] [&_button]:text-[length:10px] [&_button]:cursor-pointer [.tw-appointment-list-toolbar_&]:[flex-wrap:wrap] [@media(max-width:650px)]:max-w-[length:100%] [@media(max-width:650px)]:overflow-auto [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[0_1_auto] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[1_1_100%] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:justify-center">{(["day","week","month"] as const).map(item=><button type="button" className={view===item?"tw-is-current [.tw-dashboard-link&]:[background:var(--mint)] [.tw-dashboard-link&]:[color:var(--teal)] [.tw-dashboard-link&]:font-bold [.tw-appointment-tabs_button&]:[background:color-mix(in_srgb,var(--teal)_12%,transparent)] [.tw-appointment-tabs_button&]:[color:var(--teal)] [.tw-appointment-tabs_button&]:font-bold [.tw-booking-steps_li&]:[color:var(--teal)] [.tw-booking-steps_li&]:font-bold [.tw-booking-steps_li&_span]:border-[color:var(--teal)] [.tw-booking-steps_li&_span]:[background:var(--teal)] [.tw-booking-steps_li&_span]:[color:white] [.tw-dashboard-link&]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--teal)_10%,transparent)] [.tw-dashboard-link&::before]:[transform:scaleY(1)] [.tw-dashboard-link&::before]:opacity-[1] [.tw-dashboard-link&_svg]:[transform:scale(1.04)] [@media(max-width:760px)]:[.tw-dashboard-link&::before]:[transform:scaleX(1)]":""} key={item} onClick={()=>setViewOverride(item)}>{t(item)}</button>)}</div>
      <label className="tw-appointment-filter flex items-center gap-[8px] min-h-[39px] p-[0_10px] [border:1px_solid_var(--line)] rounded-[8px] [background:var(--surface)] [color:var(--muted)] [&_input]:min-w-[length:0] [&_input]:[border:0] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[color:var(--text)] [&_input]:[font:inherit] [&_input]:text-[length:11px] [&_select]:min-w-[length:0] [&_select]:[border:0] [&_select]:[outline:0] [&_select]:[background:transparent] [&_select]:[color:var(--text)] [&_select]:[font:inherit] [&_select]:text-[length:11px] [&_select]:max-w-[length:180px] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[1_1_145px] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:min-w-[length:0]"><Stethoscope size={16}/><select aria-label={t("doctor")} value={doctorId} onChange={event=>setDoctorId(event.target.value)}><option value="">{t("allDoctors")}</option>{doctors.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
      <label className="tw-appointment-filter flex items-center gap-[8px] min-h-[39px] p-[0_10px] [border:1px_solid_var(--line)] rounded-[8px] [background:var(--surface)] [color:var(--muted)] [&_input]:min-w-[length:0] [&_input]:[border:0] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[color:var(--text)] [&_input]:[font:inherit] [&_input]:text-[length:11px] [&_select]:min-w-[length:0] [&_select]:[border:0] [&_select]:[outline:0] [&_select]:[background:transparent] [&_select]:[color:var(--text)] [&_select]:[font:inherit] [&_select]:text-[length:11px] [&_select]:max-w-[length:180px] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[1_1_145px] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:min-w-[length:0]"><select aria-label={t("service")} value={serviceId} onChange={event=>setServiceId(event.target.value)}><option value="">{t("all")}</option>{services.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <select className="tw-appointment-status-filter min-w-[length:0] [border:0] [outline:0] [background:transparent] [color:var(--text)] [font:inherit] text-[length:11px] h-[39px] p-[0_10px] [border:1px_solid_var(--line)] rounded-[8px] [background:var(--surface)] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[1_1_145px] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:min-w-[length:0]" aria-label={t("allStatuses")} value={status} onChange={event=>setStatus(event.target.value)}><option value="">{t("allStatuses")}</option><option value="CONFIRMED">{t("status_CONFIRMED")}</option><option value="COMPLETED">{t("status_COMPLETED")}</option><option value="CANCELLED">{t("status_CANCELLED")}</option><option value="NO_SHOW">{t("status_NO_SHOW")}</option></select>
      <label className="tw-appointment-search flex items-center gap-[8px] min-h-[39px] p-[0_10px] [border:1px_solid_var(--line)] rounded-[8px] [background:var(--surface)] [color:var(--muted)] [&_input]:min-w-[length:0] [&_input]:[border:0] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[color:var(--text)] [&_input]:[font:inherit] [&_input]:text-[length:11px] flex-[1_1_190px] [&_input]:w-[100%] [@media(max-width:650px)]:[.tw-reception-toolbar_&]:flex-[1_1_100%]"><Search size={16}/><input aria-label={t("searchPatient")} placeholder={t("searchPatient")} value={searchInput} onChange={event=>setSearchInput(event.target.value)}/></label>
      <Link href={`${base}/new`} className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]">+ {t("newAppointment")}</Link>
    </div>
    {error&&<p role="alert" className="tw-management-error m-[0] [color:#b43e37] text-[length:12px]">{error}</p>}
    {loading?<div className="tw-reception-table-skeleton overflow-hidden [border:1px_solid_var(--line)] rounded-[12px] [background:var(--surface)]" role="status" aria-label={t("loading")}><div className="tw-reception-skeleton-row grid grid-cols-[.75fr_1.3fr_1.2fr_1fr_.65fr_.8fr_1fr] items-center gap-[14px] min-w-[length:750px] p-[15px_16px] [border-bottom:1px_solid_var(--line)] [&:last-child]:[border-bottom:0] [&_i]:h-[9px] [&_i]:rounded-[7px] [&_i]:[background:linear-gradient(100deg,color-mix(in_srgb,var(--line)_78%,var(--surface)),color-mix(in_srgb,var(--surface)_44%,var(--line)),color-mix(in_srgb,var(--line)_78%,var(--surface)))] [&_i]:bg-[size:220%_100%] [&_i]:animate-[appointment-shimmer_1.55s_ease-in-out_infinite] [@media(prefers-reduced-motion:reduce)]:[&_i]:animate-[none] tw-reception-skeleton-heading [background:color-mix(in_srgb,var(--line)_24%,var(--surface))] [&_i]:h-[7px] [&_i]:opacity-[.7]">{Array.from({length:7},(_,index)=><i key={index}/>)}</div>{Array.from({length:6},(_,row)=><div className="tw-reception-skeleton-row grid grid-cols-[.75fr_1.3fr_1.2fr_1fr_.65fr_.8fr_1fr] items-center gap-[14px] min-w-[length:750px] p-[15px_16px] [border-bottom:1px_solid_var(--line)] [&:last-child]:[border-bottom:0] [&_i]:h-[9px] [&_i]:rounded-[7px] [&_i]:[background:linear-gradient(100deg,color-mix(in_srgb,var(--line)_78%,var(--surface)),color-mix(in_srgb,var(--surface)_44%,var(--line)),color-mix(in_srgb,var(--line)_78%,var(--surface)))] [&_i]:bg-[size:220%_100%] [&_i]:animate-[appointment-shimmer_1.55s_ease-in-out_infinite] [@media(prefers-reduced-motion:reduce)]:[&_i]:animate-[none]" key={row}>{Array.from({length:7},(_,cell)=><i key={cell}/>)}</div>)}</div>:appointments.length?<div className="tw-management-table-wrap w-[100%] overflow-x-auto tw-appointment-table-wrap overflow-auto"><table className={`tw-management-table w-[100%] [border-collapse:collapse] text-left text-[length:12px] [&_th]:p-[12px] [&_th]:[color:var(--muted)] [&_th]:text-[length:10px] [&_th]:tracking-[.8px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_td]:p-[14px_12px] [&_td]:[border-top:1px_solid_var(--line)] [&_td]:align-[middle] [&_td_small]:block [&_td_strong]:block [&_td_small]:mt-[5px] [&_td_small]:[color:var(--muted)] [&_td_small]:text-[length:11px] [&_td_small]:max-w-[length:340px] [&_td_small]:leading-[1.5] [@media(max-width:650px)]:[&_th]:p-[11px_9px] [@media(max-width:650px)]:[&_td]:p-[11px_9px] tw-appointment-table min-w-[length:930px] [&_td_small]:block [&_td_small]:mt-[4px] [&_td_small]:[color:var(--muted)] [&_td_small]:text-[length:10px] ${compact?"[&_td]:!py-2 [&_th]:!py-2":""}`}><thead><tr><th>{t("time")}</th><th>{t("patient")}</th><th>{t("doctor")}</th><th>{t("service")}</th><th>{t("chair")}</th><th>{m("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{appointments.map(appointment=><tr key={appointment.id}>
      <td><strong>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"}).format(new Date(appointment.startAt))}</strong><small>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium"}).format(new Date(appointment.startAt))}</small></td>
      <td><strong>{appointment.patientName}</strong><small>{appointment.patientPhone??t("noPhone")}</small></td>
      <td><strong>{appointment.doctor.name}</strong><small>{appointment.doctor.specialization}</small></td>
      <td>{appointment.service.name}<small>{appointment.service.durationMinutes} {t("minutes")}</small></td><td>{appointment.chair.name}</td>
      <td><span className={`tw-appointment-status inline-flex items-center whitespace-nowrap p-[5px_8px] rounded-[20px] text-[length:9px] font-bold ${statusStyleClasses[appointment.status.toLowerCase()] ?? ""}`}>{t(`status_${appointment.status}`)}</span></td>
      <td><div className="tw-appointment-row-actions flex items-center gap-[8px] [flex-wrap:wrap] [&_button]:p-[0] [&_button]:[border:0] [&_button]:[background:none] [&_button]:[color:var(--teal)] [&_button]:[font:inherit] [&_button]:text-[length:10px] [&_button]:no-underline [&_button]:cursor-pointer [&_a]:p-[0] [&_a]:[border:0] [&_a]:[background:none] [&_a]:[color:var(--teal)] [&_a]:[font:inherit] [&_a]:text-[length:10px] [&_a]:no-underline [&_a]:cursor-pointer [@media(max-width:650px)]:gap-[6px]"><Link className="text-sm font-semibold text-teal-700 transition hover:text-teal-900 hover:underline" href={`${base}/${appointment.id}`}>{t("details")}</Link>{appointment.status==="CONFIRMED"&&<><button className="tw-appointment-action-button inline-flex items-center justify-center min-h-[29px] p-[5px_9px] [border:1px_solid_transparent] rounded-[7px] text-[length:10px] font-bold leading-[1.2] whitespace-nowrap [transition:transform_.15s_ease,background-color_.15s_ease,border-color_.15s_ease,opacity_.15s_ease] [&:not(:disabled):hover]:[filter:saturate(1.15)] [&:not(:disabled):hover]:[transform:translateY(-1px)] [&:not(:disabled):active]:[transform:scale(.94)] [&:disabled]:cursor-wait [&:disabled]:opacity-[.5] [&:focus-visible]:[outline:3px_solid_color-mix(in_srgb,var(--teal)_45%,transparent)] [&:focus-visible]:[outline-offset:3px] [@media(prefers-reduced-motion:reduce)]:[transition:none] tw-is-completed [.tw-appointment-action-button&]:border-[color:color-mix(in_srgb,#16a34a_18%,var(--line))] [.tw-appointment-action-button&]:[background:color-mix(in_srgb,#16a34a_9%,var(--surface))] [.tw-appointment-action-button&]:[color:#277246] [.dark_.tw-appointment-action-button&]:[color:#8ed6a9]" type="button" disabled={busyId===appointment.id} onClick={()=>setAppointmentStatus(appointment,"COMPLETED")}>{t("markCompleted")}</button><button className="tw-appointment-action-button inline-flex items-center justify-center min-h-[29px] p-[5px_9px] [border:1px_solid_transparent] rounded-[7px] text-[length:10px] font-bold leading-[1.2] whitespace-nowrap [transition:transform_.15s_ease,background-color_.15s_ease,border-color_.15s_ease,opacity_.15s_ease] [&:not(:disabled):hover]:[filter:saturate(1.15)] [&:not(:disabled):hover]:[transform:translateY(-1px)] [&:not(:disabled):active]:[transform:scale(.94)] [&:disabled]:cursor-wait [&:disabled]:opacity-[.5] [&:focus-visible]:[outline:3px_solid_color-mix(in_srgb,var(--teal)_45%,transparent)] [&:focus-visible]:[outline-offset:3px] [@media(prefers-reduced-motion:reduce)]:[transition:none] tw-is-no-show [.tw-appointment-action-button&]:border-[color:color-mix(in_srgb,#d97706_18%,var(--line))] [.tw-appointment-action-button&]:[background:color-mix(in_srgb,#d97706_9%,var(--surface))] [.tw-appointment-action-button&]:[color:#9a5d16] [.dark_.tw-appointment-action-button&]:[color:#f3c078]" type="button" disabled={busyId===appointment.id} onClick={()=>setAppointmentStatus(appointment,"NO_SHOW")}>{t("markNoShow")}</button><button className="tw-appointment-action-button inline-flex items-center justify-center min-h-[29px] p-[5px_9px] [border:1px_solid_transparent] rounded-[7px] text-[length:10px] font-bold leading-[1.2] whitespace-nowrap [transition:transform_.15s_ease,background-color_.15s_ease,border-color_.15s_ease,opacity_.15s_ease] [&:not(:disabled):hover]:[filter:saturate(1.15)] [&:not(:disabled):hover]:[transform:translateY(-1px)] [&:not(:disabled):active]:[transform:scale(.94)] [&:disabled]:cursor-wait [&:disabled]:opacity-[.5] [&:focus-visible]:[outline:3px_solid_color-mix(in_srgb,var(--teal)_45%,transparent)] [&:focus-visible]:[outline-offset:3px] [@media(prefers-reduced-motion:reduce)]:[transition:none] tw-is-cancelled [.tw-appointment-action-button&]:border-[color:color-mix(in_srgb,#dc2626_18%,var(--line))] [.tw-appointment-action-button&]:[background:color-mix(in_srgb,#dc2626_8%,var(--surface))] [.tw-appointment-action-button&]:[color:#a3423a] [.dark_.tw-appointment-action-button&]:[color:#f2a09a]" type="button" disabled={busyId===appointment.id} onClick={()=>setAppointmentStatus(appointment,"CANCELLED")}>{t("cancel")}</button></>}</div></td>
    </tr>)}</tbody></table></div>:<div className="tw-management-empty p-[38px_24px] text-center [border:1px_dashed_var(--line)] rounded-[14px] [background:var(--surface)] [&_h2]:mb-[7px] [&_h2]:text-[length:17px] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px]"><CalendarDays size={22}/><h2>{t("emptyTitle")}</h2><p>{t("emptyDescription")}</p></div>}
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
