"use client";

import {CalendarDays,Clock3,MapPin,Stethoscope,Video} from "lucide-react";
import {useTranslations} from "next-intl";
import type {LucideIcon} from "lucide-react";
import {Link,useRouter} from "@/i18n/navigation";
import {useEffect,useState} from "react";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";
import {AppointmentNotesEditor} from "./appointment-notes-editor";

type Props={
  role:"patient"|"receptionist"|"admin"|"doctor";
  appointment:{
    id:string;patientName:string;patientPhone:string|null;patientNote:string|null;staffNotes:string|null;
    startAt:string;endAt:string;videoRoomName:string|null;
    status:"CONFIRMED"|"COMPLETED"|"CANCELLED"|"NO_SHOW";cancellationReason:string|null;
    doctor:{id:string;name:string;specialization:string};
    service:{id:string;name:string;durationMinutes:number;price:number|string;isOnlineConsultation?:boolean};
    chair:{id:string;name:string};
  };
};

export function AppointmentDetails({role,appointment}:Props){
  const t=useTranslations("appointments");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [now,setNow]=useState(0);
  const dateFormat=new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"full"});
  const timeFormat=new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"});

  useEffect(()=>{
    const update=()=>setNow(Date.now());
    update();
    const timer=setInterval(update,30_000);
    return ()=>clearInterval(timer);
  },[]);

  async function cancel(){
    setBusy(true);
    const loading=toast.loading(feedback("processing"));
    try{
      const response=await fetch(`/api/appointments/${appointment.id}/cancel`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
      const result=await response.json() as {error?:{code?:string}};
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,result.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:t("cancelFailed"),
        }));
        return;
      }
      toast.success(feedback("appointmentCancelled"));
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      toast.dismiss(loading);
      setBusy(false);
    }
  }

  const listUrl=role==="patient"?"/patient/dashboard/bookings":role==="admin"?"/admin/dashboard/appointments":role==="doctor"?"/doctor/dashboard/appointments":"/receptionist/dashboard/appointments";
  const rescheduleUrl=role==="patient"?`/patient/dashboard/bookings/${appointment.id}/reschedule`:role==="admin"?`/admin/dashboard/appointments/${appointment.id}/reschedule`:`/receptionist/dashboard/appointments/${appointment.id}/reschedule`;
  const meetingStart=new Date(appointment.startAt).getTime()-15*60_000;
  const meetingEnd=new Date(appointment.endAt).getTime()+30*60_000;
  const canJoin=now>=meetingStart&&now<=meetingEnd;

  return <section className="grid gap-4">
    <Link className="w-fit text-sm text-[var(--muted)] hover:text-[var(--teal)]" href={listUrl}>← {t("backToAppointments")}</Link>
    <article className="grid gap-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
      <header className="border-b border-[var(--line)] pb-4">
        <span className={`tw-appointment-status inline-flex items-center whitespace-nowrap p-[5px_8px] rounded-[20px] text-[length:9px] font-bold status-${appointment.status.toLowerCase()}`}>{t(`status_${appointment.status}`)}</span>
        <h1 className="mb-1 mt-3 text-2xl font-semibold text-[var(--text)]">{appointment.service.name}</h1>
        <p className="m-0 text-xs text-[var(--muted)]">{appointment.id}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Detail icon={CalendarDays} label={t("date")} value={dateFormat.format(new Date(appointment.startAt))}/>
        <Detail icon={Clock3} label={t("time")} value={`${timeFormat.format(new Date(appointment.startAt))} – ${timeFormat.format(new Date(appointment.endAt))}`}/>
        <Detail icon={Stethoscope} label={t("doctor")} value={`${appointment.doctor.name} · ${appointment.doctor.specialization}`}/>
        <Detail icon={MapPin} label={t("chair")} value={appointment.chair.name}/>
        <Detail icon={Clock3} label={t("duration")} value={`${appointment.service.durationMinutes} ${t("minutes")}`}/>
        <Detail icon={CalendarDays} label={t("estimatedServiceValue")} value={`৳${Number(appointment.service.price).toLocaleString()}`}/>
      </div>
      {role!=="patient"&&<div className="grid gap-1 rounded-lg bg-[color-mix(in_srgb,var(--teal)_7%,var(--surface))] p-3 text-sm text-[var(--text)]"><strong>{t("patient")}: {appointment.patientName}</strong>{appointment.patientPhone&&<span className="text-xs text-[var(--muted)]">{appointment.patientPhone}</span>}</div>}
      {appointment.cancellationReason&&<p className="m-0 text-xs text-[var(--muted)]">{t("cancellationReason")}: {appointment.cancellationReason}</p>}
      {role==="patient"
        ?<AppointmentNotesEditor appointmentId={appointment.id} mode="patient" patientNote={appointment.patientNote} staffNotes={null}/>
        :<AppointmentNotesEditor appointmentId={appointment.id} mode="staff" patientNote={appointment.patientNote} staffNotes={appointment.staffNotes}/>}
      {appointment.status==="CONFIRMED"&&appointment.service.isOnlineConsultation&&appointment.videoRoomName&&(role==="patient"||role==="doctor")&&<section className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--mint)] p-4">
        <h2 className="m-0 flex items-center gap-2 text-sm font-semibold text-[var(--text)]"><Video size={18} className="text-[var(--teal)]"/>{t("onlineConsultation")}</h2>
        <p className="m-0 text-xs leading-5 text-[var(--muted)]">{t("videoJoinWindow")}</p>
        {canJoin
          ?<a className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[var(--teal)] px-4 text-sm font-semibold text-white" href={`https://meet.jit.si/${appointment.videoRoomName}`} target="_blank" rel="noopener noreferrer"><Video size={16}/>{t("joinVideo")}</a>
          :<span className="text-xs font-medium text-[var(--muted)]">{now<meetingStart?t("videoAvailableSoon"):t("videoWindowClosed")}</span>}
      </section>}
      {appointment.status==="CONFIRMED"&&role!=="doctor"&&<div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--text)] hover:border-[var(--teal)]" href={rescheduleUrl}>{t("reschedule")}</Link>
        <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--peach)] px-4 text-sm font-semibold text-[#8e573d] disabled:opacity-50" disabled={busy} onClick={cancel}>{busy?t("saving"):t("cancel")}</button>
      </div>}
    </article>
  </section>;
}

function Detail({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:string}){
  return <div className="flex items-start gap-3"><Icon size={18} className="mt-1 shrink-0 text-[var(--teal)]"/><div><span className="block text-xs text-[var(--muted)]">{label}</span><strong className="block text-sm text-[var(--text)]">{value}</strong></div></div>;
}
