"use client";

import {CalendarDays,Clock3,MapPin,Stethoscope} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link,useRouter} from "@/i18n/navigation";
import {confirmAppointmentCancellation} from "./appointment-cancel-confirmation";
import {useState} from "react";

type Props={role:"patient"|"receptionist"|"admin";appointment:{id:string;patientName:string;patientPhone:string|null;startAt:string;endAt:string;status:"CONFIRMED"|"COMPLETED"|"CANCELLED"|"NO_SHOW";cancellationReason:string|null;doctor:{id:string;name:string;specialization:string};service:{id:string;name:string;durationMinutes:number;price:number|string};chair:{id:string;name:string}}};
export function AppointmentDetails({role,appointment}:Props){
  const t=useTranslations("appointments");
  const router=useRouter();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const dateFormat=new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"full"});
  const timeFormat=new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"});
  async function cancel(){
    if(!await confirmAppointmentCancellation(t("confirmCancel"),t("keepAppointment"),t("confirmCancellation")))return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/appointments/${appointment.id}/cancel`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??t("cancelFailed"));
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:t("cancelFailed"))}
    finally{setBusy(false)}
  }
  const listUrl=role==="patient"?"/patient/dashboard/bookings":role==="admin"?"/admin/dashboard/appointments":"/receptionist/dashboard/appointments";
  const rescheduleUrl=role==="patient"?`/patient/dashboard/bookings/${appointment.id}/reschedule`:`/receptionist/dashboard/appointments/${appointment.id}/reschedule`;
  return <section className="appointment-details">
    <Link className="back-link" href={listUrl}>← {t("backToAppointments")}</Link>
    <article className="appointment-detail-card">
      <header><span className={`appointment-status status-${appointment.status.toLowerCase()}`}>{t(`status_${appointment.status}`)}</span><h1>{appointment.service.name}</h1><p>{appointment.id}</p></header>
      <div className="appointment-detail-grid">
        <div><CalendarDays/><span>{t("date")}</span><strong>{dateFormat.format(new Date(appointment.startAt))}</strong></div>
        <div><Clock3/><span>{t("time")}</span><strong>{timeFormat.format(new Date(appointment.startAt))} – {timeFormat.format(new Date(appointment.endAt))}</strong></div>
        <div><Stethoscope/><span>{t("doctor")}</span><strong>{appointment.doctor.name}</strong><small>{appointment.doctor.specialization}</small></div>
        <div><MapPin/><span>{t("chair")}</span><strong>{appointment.chair.name}</strong></div>
        <div><CalendarDays/><span>{t("duration")}</span><strong>{appointment.service.durationMinutes} {t("minutes")}</strong></div>
        <div><CalendarDays/><span>{t("estimatedServiceValue")}</span><strong>৳{Number(appointment.service.price).toLocaleString()}</strong></div>
      </div>
      {role!=="patient"&&<div className="appointment-patient-info"><strong>{t("patient")}: {appointment.patientName}</strong>{appointment.patientPhone&&<span>{appointment.patientPhone}</span>}</div>}
      {appointment.cancellationReason&&<p className="management-hint">{t("cancellationReason")}: {appointment.cancellationReason}</p>}
      {error&&<p className="management-error" role="alert">{error}</p>}
      {appointment.status==="CONFIRMED"&&<div className="booking-actions"><Link className="button button-outline" href={rescheduleUrl}>{t("reschedule")}</Link><button className="button button-outline" disabled={busy} onClick={cancel}>{busy?t("saving"):t("cancel")}</button></div>}
    </article>
  </section>;
}
