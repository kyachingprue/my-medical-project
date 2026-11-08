"use client";

import {CalendarDays,Check,ChevronLeft,ChevronRight,Clock3} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link,useRouter} from "@/i18n/navigation";
import {useEffect,useState} from "react";

type Props={mode:"patient"|"receptionist"|"admin";canBook?:boolean;appointment?:{id:string;doctorId:string;serviceId:string;startAt:string;patientName?:string;patientPhone?:string}};
type Service={id:string;name:string;durationMinutes:number;price:number|string;isActive:boolean};
type Doctor={id:string;name:string;specialization:string};
type Slot={time:string;startAt:string;endAt:string;durationMinutes:number};
type ApiResult<T>={data:T;error?:{code?:string;message?:string}};

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
    if(!response.ok)throw new Error(body.error?.message??t("loadFailed"));
    setSlots(body.data);
    setSlotQuery(slotKey);
  }

  useEffect(()=>{
    let active=true;
    fetch("/api/services?limit=100").then(async response=>{
      const body=await response.json() as ApiResult<Service[]>;
      if(!response.ok)throw new Error(body.error?.message??t("loadFailed"));
      if(active)setServices(body.data);
    }).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:t("loadFailed"))}).finally(()=>{if(active)setLoadingServices(false)});
    return ()=>{active=false};
  },[appointment?.serviceId,t]);

  useEffect(()=>{
    if(!serviceId)return;
    let active=true;
    fetch(`/api/doctors?limit=100&serviceId=${encodeURIComponent(serviceId)}`).then(async response=>{
      const body=await response.json() as ApiResult<Doctor[]>;
      if(!response.ok)throw new Error(body.error?.message??t("loadFailed"));
      if(active){setDoctors(body.data);setDoctorQuery(serviceId)}
    }).catch(cause=>{if(active){setDoctors([]);setDoctorQuery(serviceId);setError(cause instanceof Error?cause.message:t("loadFailed"))}});
    return ()=>{active=false};
  },[serviceId,t]);

  useEffect(()=>{
    if(!doctorId||!serviceId||!date)return;
    let active=true;
    const controller=new AbortController();
    fetch(`/api/slots?doctorId=${encodeURIComponent(doctorId)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,{signal:controller.signal}).then(async response=>{
      const body=await response.json() as ApiResult<Slot[]>;
      if(!response.ok)throw new Error(body.error?.message??t("loadFailed"));
      if(active){setSlots(body.data);setSlotQuery(slotKey)}
    }).catch(cause=>{if(active&&cause instanceof Error&&cause.name!=="AbortError"){setSlots([]);setSlotQuery(slotKey);setError(cause.message)}});
    return ()=>{active=false;controller.abort()};
  },[doctorId,serviceId,date,slotKey,t]);

  async function submit(){
    if(!canBook)return;
    if(!selectedSlot||!selectedService||!selectedDoctor)return;
    setError("");setSubmitting(true);
    try{
      const staff=mode!=="patient";
      const endpoint=appointment
        ?`/api/${staff?"receptionist/appointments":"appointments"}/${appointment.id}/reschedule`
        :staff?"/api/receptionist/appointments":"/api/appointments";
      const payload={doctorId,serviceId,date,time:slotTime,...(staff&&!appointment?{patientName:guestName,patientPhone:guestPhone}:{})};
      const response=await fetch(endpoint,{method:appointment?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const body=await response.json() as ApiResult<{id:string}>&{error?:{message?:string}};
      if(!response.ok){
        if(body.error?.code==="SLOT_UNAVAILABLE"){
          setSlotTime("");
          await refreshAvailableSlots();
          throw new Error(t("slotTaken"));
        }
        throw new Error(body.error?.message??t("bookingFailed"));
      }
      if(staff){setSaved(true);router.refresh()}
      else if(appointment){router.push(`/patient/dashboard/bookings/${appointment.id}`);router.refresh()}
      else router.push(`/patient/dashboard/bookings/${body.data.id}`);
    }catch(cause){setError(cause instanceof Error?cause.message:t("bookingFailed"))}
    finally{setSubmitting(false)}
  }

  if(saved)return <div className="appointment-success"><span><Check size={25}/></span><h2>{appointment?t("rescheduled"):t("confirmed")}</h2><p>{t("bookingSaved")}</p>{appointment&&mode!=="patient"&&<p className="appointment-email-note">{notificationUi("staffRescheduleEmailNote")}</p>}<button className="button button-primary" onClick={()=>router.push(mode==="admin"?"/admin/dashboard/appointments":"/receptionist/dashboard/appointments")}>{t("viewSchedule")}</button></div>;
  return <section className="booking-wizard">
    <ol className="booking-steps"><li className="is-current"><span>1</span>{t("chooseCare")}</li><li className={selectedSlot?"is-current":""}><span>2</span>{t("chooseTime")}</li><li><span>3</span>{t("confirm")}</li></ol>
    <div className="booking-panel">
      {appointment&&<span className="section-kicker">{t("reschedule")}</span>}
      <h2>{t("chooseAppointment")}</h2>
      <div className="appointment-form-grid">
        <label className="management-field"><span>{t("service")}</span><select value={serviceId} onChange={event=>{setServiceId(event.target.value);setDoctorId("");setDoctorQuery("");setSlotTime("");setError("")}} disabled={loadingServices}><option value="">{loadingServices?t("loading"):t("selectService")}</option>{services.map(service=><option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} {m("minutes")} · ৳{Number(service.price).toLocaleString()}</option>)}</select></label>
        <label className="management-field"><span>{t("doctor")}</span><select value={doctorId} onChange={event=>{setDoctorId(event.target.value);setSlotTime("");setError("")}} disabled={!serviceId||loadingDoctors}><option value="">{loadingDoctors?t("loading"):t("selectDoctor")}</option>{availableDoctors.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialization}</option>)}</select></label>
        <label className="management-field"><span>{t("appointmentDate")}</span><span className="appointment-input-icon"><CalendarDays size={16}/><input type="date" min={today} max={dateOffset(today,30)} value={date} onChange={event=>{setDate(event.target.value);setSlotTime("");setError("")}}/></span></label>
      </div>
      {mode!=="patient"&&!appointment&&<div className="appointment-form-grid"><label className="management-field"><span>{t("guestName")}</span><input value={guestName} onChange={event=>setGuestName(event.target.value)} required minLength={2} maxLength={120}/></label><label className="management-field"><span>{t("guestPhone")}</span><input type="tel" value={guestPhone} onChange={event=>setGuestPhone(event.target.value)} required minLength={5} maxLength={30}/></label></div>}
      <div className="slot-section"><div className="slot-heading"><div><span className="section-kicker">{t("availableTimes")}</span><p>{t("timezoneNote")}</p></div><Clock3 size={19}/></div>
        {loadingSlots?<div className="slot-loading-skeleton" role="status" aria-label={t("loadingSlots")}>{Array.from({length:8},(_,index)=><i key={index}/>)}</div>:!doctorId?<p className="management-empty">{t("selectDoctorForSlots")}</p>:availableSlots.length?<div className="slot-grid">{availableSlots.map(slot=><button type="button" className={`slot-option ${slotTime===slot.time?"is-selected":""}`} key={slot.time} onClick={()=>setSlotTime(slot.time)}>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"}).format(new Date(slot.startAt))}</button>)}</div>:<p className="management-empty">{t("noSlots")}</p>}
      </div>
      {selectedSlot&&selectedDoctor&&selectedService&&<div className="booking-review"><span className="section-kicker">{t("reviewBooking")}</span><strong>{selectedService.name} · {selectedDoctor.name}</strong><span>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"full"}).format(new Date(selectedSlot.startAt))} · {new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"}).format(new Date(selectedSlot.startAt))}</span><span>{t("estimatedServiceValue")}: ৳{Number(selectedService.price).toLocaleString()}</span></div>}
      {error&&<p className="management-error" role="alert">{error}</p>}
      <div className="booking-actions"><button type="button" className="button button-outline" onClick={()=>router.back()}><ChevronLeft size={16}/>{t("goBack")}</button>{canBook?<button type="button" className="button button-primary" disabled={!selectedSlot||submitting||(mode!=="patient"&&!appointment&&(!guestName.trim()||!guestPhone.trim()))} onClick={submit}>{submitting?t("saving"):appointment?t("confirmReschedule"):t("confirmBooking")}<ChevronRight size={16}/></button>:<Link className="button button-primary" href="/sign-in?returnTo=%2Fappointment">{ui("signInToBook")}<ChevronRight size={16}/></Link>}</div>
      <p className="management-hint">{t("bufferNote")}</p>
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
