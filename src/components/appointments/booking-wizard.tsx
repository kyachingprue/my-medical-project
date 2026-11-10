"use client";

import {CalendarDays,Check,ChevronLeft,ChevronRight,Clock3} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link,useRouter} from "@/i18n/navigation";
import {useEffect,useState} from "react";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";

type Props={mode:"patient"|"receptionist"|"admin";canBook?:boolean;appointment?:{id:string;doctorId:string;serviceId:string;startAt:string;patientName?:string;patientPhone?:string}};
type Service={id:string;name:string;durationMinutes:number;price:number|string;isActive:boolean};
type Doctor={id:string;name:string;specialization:string};
type Slot={time:string;startAt:string;endAt:string;durationMinutes:number};
type ApiResult<T>={data:T;error?:{code?:string}};

function dhakaDate(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateOffset(date:string,days:number){
  const [year,month,day]=date.split("-").map(Number);
  return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10);
}

export function BookingWizard({mode,appointment,canBook=true}:Props){
  const t=useTranslations("appointments");
  const ui=useTranslations("appointmentUi");
  const notificationUi=useTranslations("notificationEnhancement");
  const feedback=useTranslations("feedback");
  const m=useTranslations("management");
  const router=useRouter();
  const [today]=useState(()=>dhakaDate());
  const [services,setServices]=useState<Service[]>([]);
  const [doctors,setDoctors]=useState<Doctor[]>([]);
  const [doctorQuery,setDoctorQuery]=useState("");
  const [slots,setSlots]=useState<Slot[]>([]);
  const [slotQuery,setSlotQuery]=useState("");
  const [serviceId,setServiceId]=useState(appointment?.serviceId??"");
  const [doctorId,setDoctorId]=useState(appointment?.doctorId??"");
  const [date,setDate]=useState(appointment?dhakaDateFromUtc(appointment.startAt):today);
  const [slotTime,setSlotTime]=useState(appointment?dhakaDateTime(appointment.startAt).time:"");
  const [guestName,setGuestName]=useState(appointment?.patientName??"");
  const [guestPhone,setGuestPhone]=useState(appointment?.patientPhone??"");
  const [loadingServices,setLoadingServices]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState(false);

  const availableDoctors=doctorQuery===serviceId?doctors:[];
  const loadingDoctors=Boolean(serviceId)&&doctorQuery!==serviceId;
  const slotKey=`${doctorId}:${serviceId}:${date}`;
  const availableSlots=slotQuery===slotKey?slots:[];
  const loadingSlots=Boolean(doctorId&&serviceId&&date)&&slotQuery!==slotKey;
  const selectedService=services.find(service=>service.id===serviceId);
  const selectedDoctor=availableDoctors.find(doctor=>doctor.id===doctorId);
  const selectedSlot=availableSlots.find(slot=>slot.time===slotTime);

  async function refreshAvailableSlots(){
    const response=await fetch(`/api/slots?doctorId=${encodeURIComponent(doctorId)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`);
    const body=await response.json() as ApiResult<Slot[]>;
    if(!response.ok)throw new Error(t("loadFailed"));
    setSlots(body.data);
    setSlotQuery(slotKey);
  }

  useEffect(()=>{
    let active=true;
    fetch("/api/services?limit=100").then(async response=>{
      const body=await response.json() as ApiResult<Service[]>;
      if(!response.ok)throw new Error(t("loadFailed"));
      if(active)setServices(body.data);
    }).catch(()=>{if(active)setError(t("loadFailed"))}).finally(()=>{if(active)setLoadingServices(false)});
    return ()=>{active=false};
  },[appointment?.serviceId,t]);

  useEffect(()=>{
    if(!serviceId)return;
    let active=true;
    fetch(`/api/doctors?limit=100&serviceId=${encodeURIComponent(serviceId)}`).then(async response=>{
      const body=await response.json() as ApiResult<Doctor[]>;
      if(!response.ok)throw new Error(t("loadFailed"));
      if(active){setDoctors(body.data);setDoctorQuery(serviceId)}
    }).catch(()=>{if(active){setDoctors([]);setDoctorQuery(serviceId);setError(t("loadFailed"))}});
    return ()=>{active=false};
  },[serviceId,t]);

  useEffect(()=>{
    if(!doctorId||!serviceId||!date)return;
    let active=true;
    const controller=new AbortController();
    fetch(`/api/slots?doctorId=${encodeURIComponent(doctorId)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,{signal:controller.signal}).then(async response=>{
      const body=await response.json() as ApiResult<Slot[]>;
      if(!response.ok)throw new Error(t("loadFailed"));
      if(active){setSlots(body.data);setSlotQuery(slotKey)}
    }).catch(cause=>{if(active&&cause instanceof Error&&cause.name!=="AbortError"){setSlots([]);setSlotQuery(slotKey);setError(t("loadFailed"))}});
    return ()=>{active=false;controller.abort()};
  },[doctorId,serviceId,date,slotKey,t]);

  async function submit(){
    if(!canBook)return;
    if(!selectedSlot||!selectedService||!selectedDoctor)return;
    setError("");setSubmitting(true);
    const loadingToast=toast.loading(feedback("processing"));
    try{
      const staff=mode!=="patient";
      const endpoint=appointment
        ?`/api/${staff?"receptionist/appointments":"appointments"}/${appointment.id}/reschedule`
        :staff?"/api/receptionist/appointments":"/api/appointments";
      const payload={doctorId,serviceId,date,time:slotTime,...(staff&&!appointment?{patientName:guestName,patientPhone:guestPhone}:{})};
      const response=await fetch(endpoint,{method:appointment?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const body=await response.json() as ApiResult<{id:string}>;
      if(!response.ok){
        if(response.status===401&&mode==="patient"&&!appointment){
          router.push("/sign-in?returnTo=%2Fappointment");
          return;
        }
        if(body.error?.code==="SLOT_UNAVAILABLE"){
          setSlotTime("");
          toast.error(feedback("slotUnavailable"));
          try{await refreshAvailableSlots()}catch{setError(t("loadFailed"))}
          return;
        }
        toast.error(getSafeApiErrorMessage(response.status,body.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:feedback("bookingFailed"),
        }));
        return;
      }
      toast.success(feedback(appointment?"rescheduleSuccess":"bookingSuccess"));
      if(staff){setSaved(true);router.refresh()}
      else if(appointment){router.push(`/patient/dashboard/bookings/${appointment.id}`);router.refresh()}
      else router.push(`/patient/dashboard/bookings/${body.data.id}`);
    }catch{toast.error(feedback("bookingFailed"))}
    finally{toast.dismiss(loadingToast);setSubmitting(false)}
  }

  if(saved)return <div className="tw-appointment-success grid [justify-items:center] gap-[12px] max-w-[length:530px] m-[30px_auto] p-[32px] [border:1px_solid_var(--line)] rounded-[16px] [background:var(--surface)] text-center [&>span]:grid [&>span]:[place-items:center] [&>span]:w-[50px] [&>span]:h-[50px] [&>span]:rounded-[50%] [&>span]:[background:#e8f4ec] [&>span]:[color:#36794f] [&_h2]:m-[0] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:12px]"><span><Check size={25}/></span><h2>{appointment?t("rescheduled"):t("confirmed")}</h2><p>{t("bookingSaved")}</p>{appointment&&mode!=="patient"&&<p className="tw-appointment-email-note m-[0] p-[11px_13px] [border:1px_solid_color-mix(in_srgb,var(--teal)_18%,var(--line))] rounded-[9px] [background:color-mix(in_srgb,var(--teal)_5%,var(--surface))] [color:var(--muted)] text-[length:12px] leading-[1.6]">{notificationUi("staffRescheduleEmailNote")}</p>}<button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" onClick={()=>router.push(mode==="admin"?"/admin/dashboard/appointments":"/receptionist/dashboard/appointments")}>{t("viewSchedule")}</button></div>;
  return <section className="tw-booking-wizard max-w-[length:850px] m-[0_auto]">
    <ol className="tw-booking-steps flex justify-center gap-[clamp(12px,4vw,48px)] m-[0_0_19px] p-[0] [list-style:none] [color:var(--muted)] text-[length:11px] [&_li]:flex [&_li]:items-center [&_li]:gap-[8px] [&_li_span]:grid [&_li_span]:[place-items:center] [&_li_span]:w-[25px] [&_li_span]:h-[25px] [&_li_span]:[border:1px_solid_var(--line)] [&_li_span]:rounded-[50%] [&_li_span]:text-[length:10px] [@media(max-width:650px)]:justify-between [@media(max-width:650px)]:gap-[5px] [@media(max-width:650px)]:text-[length:9px] [@media(max-width:650px)]:[&_li]:gap-[5px]"><li className="tw-is-current [.tw-dashboard-link&]:[background:var(--mint)] [.tw-dashboard-link&]:[color:var(--teal)] [.tw-dashboard-link&]:font-bold [.tw-appointment-tabs_button&]:[background:color-mix(in_srgb,var(--teal)_12%,transparent)] [.tw-appointment-tabs_button&]:[color:var(--teal)] [.tw-appointment-tabs_button&]:font-bold [.tw-booking-steps_li&]:[color:var(--teal)] [.tw-booking-steps_li&]:font-bold [.tw-booking-steps_li&_span]:border-[color:var(--teal)] [.tw-booking-steps_li&_span]:[background:var(--teal)] [.tw-booking-steps_li&_span]:[color:white] [.tw-dashboard-link&]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--teal)_10%,transparent)] [.tw-dashboard-link&::before]:[transform:scaleY(1)] [.tw-dashboard-link&::before]:opacity-[1] [.tw-dashboard-link&_svg]:[transform:scale(1.04)] [@media(max-width:760px)]:[.tw-dashboard-link&::before]:[transform:scaleX(1)]"><span>1</span>{t("chooseCare")}</li><li className={selectedSlot?"tw-is-current [.tw-dashboard-link&]:[background:var(--mint)] [.tw-dashboard-link&]:[color:var(--teal)] [.tw-dashboard-link&]:font-bold [.tw-appointment-tabs_button&]:[background:color-mix(in_srgb,var(--teal)_12%,transparent)] [.tw-appointment-tabs_button&]:[color:var(--teal)] [.tw-appointment-tabs_button&]:font-bold [.tw-booking-steps_li&]:[color:var(--teal)] [.tw-booking-steps_li&]:font-bold [.tw-booking-steps_li&_span]:border-[color:var(--teal)] [.tw-booking-steps_li&_span]:[background:var(--teal)] [.tw-booking-steps_li&_span]:[color:white] [.tw-dashboard-link&]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--teal)_10%,transparent)] [.tw-dashboard-link&::before]:[transform:scaleY(1)] [.tw-dashboard-link&::before]:opacity-[1] [.tw-dashboard-link&_svg]:[transform:scale(1.04)] [@media(max-width:760px)]:[.tw-dashboard-link&::before]:[transform:scaleX(1)]":""}><span>2</span>{t("chooseTime")}</li><li><span>3</span>{t("confirm")}</li></ol>
    <div className="tw-booking-panel p-[clamp(18px,4vw,30px)] [border:1px_solid_var(--line)] rounded-[16px] [background:var(--surface)] [&_h2]:m-[7px_0_20px] [&_h2]:text-[length:20px]">
      {appointment&&<span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("reschedule")}</span>}
      <h2>{t("chooseAppointment")}</h2>
      <div className="tw-appointment-form-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[15px] mb-[16px] [@media(max-width:650px)]:grid-cols-[1fr]">
        <label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]"><span>{t("service")}</span><select value={serviceId} onChange={event=>{setServiceId(event.target.value);setDoctorId("");setDoctorQuery("");setSlotTime("");setError("")}} disabled={loadingServices}><option value="">{loadingServices?t("loading"):t("selectService")}</option>{services.map(service=><option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} {m("minutes")} · ৳{Number(service.price).toLocaleString()}</option>)}</select></label>
        <label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]"><span>{t("doctor")}</span><select value={doctorId} onChange={event=>{setDoctorId(event.target.value);setSlotTime("");setError("")}} disabled={!serviceId||loadingDoctors}><option value="">{loadingDoctors?t("loading"):t("selectDoctor")}</option>{availableDoctors.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialization}</option>)}</select></label>
        <label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]"><span>{t("appointmentDate")}</span><span className="tw-appointment-input-icon flex items-center gap-[8px] [&_input]:flex-[1]"><CalendarDays size={16}/><input type="date" min={today} max={dateOffset(today,30)} value={date} onChange={event=>{setDate(event.target.value);setSlotTime("");setError("")}}/></span></label>
      </div>
      {mode!=="patient"&&!appointment&&<div className="tw-appointment-form-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[15px] mb-[16px] [@media(max-width:650px)]:grid-cols-[1fr]"><label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]"><span>{t("guestName")}</span><input value={guestName} onChange={event=>setGuestName(event.target.value)} required minLength={2} maxLength={120}/></label><label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]"><span>{t("guestPhone")}</span><input type="tel" value={guestPhone} onChange={event=>setGuestPhone(event.target.value)} required minLength={5} maxLength={30}/></label></div>}
      <div className="tw-slot-section m-[23px_0]"><div className="tw-slot-heading flex items-center justify-between [color:var(--teal)] [&_p]:m-[5px_0] [&_p]:[color:var(--muted)] [&_p]:text-[length:10px]"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("availableTimes")}</span><p>{t("timezoneNote")}</p></div><Clock3 size={19}/></div>
        {loadingSlots?<div className="tw-slot-loading-skeleton grid grid-cols-[repeat(auto-fill,minmax(95px,1fr))] gap-[9px] mt-[15px] [&_i]:h-[39px] [&_i]:[border:1px_solid_var(--line)] [&_i]:rounded-[8px] [&_i]:[background:linear-gradient(100deg,color-mix(in_srgb,var(--line)_78%,var(--surface)),color-mix(in_srgb,var(--surface)_44%,var(--line)),color-mix(in_srgb,var(--line)_78%,var(--surface)))] [&_i]:bg-[size:220%_100%] [&_i]:animate-[appointment-shimmer_1.55s_ease-in-out_infinite] [@media(prefers-reduced-motion:reduce)]:[&_i]:animate-[none]" role="status" aria-label={t("loadingSlots")}>{Array.from({length:8},(_,index)=><i key={index}/>)}</div>:!doctorId?<p className="tw-management-empty p-[38px_24px] text-center [border:1px_dashed_var(--line)] rounded-[14px] [background:var(--surface)] [&_h2]:mb-[7px] [&_h2]:text-[length:17px] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px]">{t("selectDoctorForSlots")}</p>:availableSlots.length?<div className="tw-slot-grid grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-[9px] mt-[14px]">{availableSlots.map(slot=><button type="button" className={`tw-slot-option min-h-[40px] [border:1px_solid_var(--line)] rounded-[8px] [background:var(--surface)] [color:var(--text)] [font:inherit] text-[length:11px] cursor-pointer [&:hover]:border-[color:var(--teal)] [&:hover]:[background:color-mix(in_srgb,var(--teal)_10%,var(--surface))] [&:hover]:[color:var(--teal)] ${slotTime===slot.time?"tw-is-selected [.tw-role-option&]:border-[color:var(--teal)] [.tw-role-option&]:[background:var(--mint)] [.tw-role-option&]:[color:var(--teal-dark)] [.tw-role-option&]:shadow-[inset_0_0_0_1px_var(--teal)] [.tw-slot-option&]:border-[color:var(--teal)] [.tw-slot-option&]:[background:color-mix(in_srgb,var(--teal)_10%,var(--surface))] [.tw-slot-option&]:[color:var(--teal)]":""}`} key={slot.time} onClick={()=>setSlotTime(slot.time)}>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"}).format(new Date(slot.startAt))}</button>)}</div>:<p className="tw-management-empty p-[38px_24px] text-center [border:1px_dashed_var(--line)] rounded-[14px] [background:var(--surface)] [&_h2]:mb-[7px] [&_h2]:text-[length:17px] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px]">{t("noSlots")}</p>}
      </div>
      {selectedSlot&&selectedDoctor&&selectedService&&<div className="tw-booking-review grid gap-[8px] m-[20px_0] p-[15px] rounded-[10px] [background:color-mix(in_srgb,var(--teal)_8%,var(--surface))] text-[length:11px] [&_strong]:text-[length:13px]"><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("reviewBooking")}</span><strong>{selectedService.name} · {selectedDoctor.name}</strong><span>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"full"}).format(new Date(selectedSlot.startAt))} · {new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"}).format(new Date(selectedSlot.startAt))}</span><span>{t("estimatedServiceValue")}: ৳{Number(selectedService.price).toLocaleString()}</span></div>}
      {error&&<p className="tw-management-error m-[0] [color:#b43e37] text-[length:12px]" role="alert">{error}</p>}
      <div className="tw-booking-actions flex justify-end gap-[9px] mt-[18px] [@media(max-width:650px)]:[justify-content:stretch] [@media(max-width:650px)]:flex-col-reverse"><button type="button" className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" onClick={()=>router.back()}><ChevronLeft size={16}/>{t("goBack")}</button>{canBook?<button type="button" className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" disabled={!selectedSlot||submitting||(mode!=="patient"&&!appointment&&(!guestName.trim()||!guestPhone.trim()))} onClick={submit}>{submitting?t("saving"):appointment?t("confirmReschedule"):t("confirmBooking")}<ChevronRight size={16}/></button>:<Link className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" href="/sign-in?returnTo=%2Fappointment">{ui("signInToBook")}<ChevronRight size={16}/></Link>}</div>
      <p className="tw-management-hint m-[0] [color:var(--muted)] text-[length:11px] leading-[1.6]">{t("bufferNote")}</p>
    </div>
  </section>;
}

function dhakaDateTime(value:string){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??"";
  return {date:`${part("year")}-${part("month")}-${part("day")}`,time:`${part("hour")}:${part("minute")}`};
}

function dhakaDateFromUtc(value:string){
  return dhakaDateTime(value).date;
}
