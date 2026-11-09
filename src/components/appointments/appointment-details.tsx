"use client";

import {CalendarDays,Clock3,MapPin,Stethoscope} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link,useRouter} from "@/i18n/navigation";
import {useState} from "react";
import {toast} from "react-hot-toast";

type Props={role:"patient"|"receptionist"|"admin";appointment:{id:string;patientName:string;patientPhone:string|null;startAt:string;endAt:string;status:"CONFIRMED"|"COMPLETED"|"CANCELLED"|"NO_SHOW";cancellationReason:string|null;doctor:{id:string;name:string;specialization:string};service:{id:string;name:string;durationMinutes:number;price:number|string};chair:{id:string;name:string}}};
export function AppointmentDetails({role,appointment}:Props){
  const t=useTranslations("appointments");
  const router=useRouter();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const dateFormat=new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"full"});
  const timeFormat=new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",hour:"numeric",minute:"2-digit"});
  async function cancel(){
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/appointments/${appointment.id}/cancel`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??t("cancelFailed"));
      toast.success(t("cancelled"));
      router.refresh();
    }catch(cause){
      const message=cause instanceof Error?cause.message:t("cancelFailed");
      setError(message);
      toast.error(message);
    }
    finally{setBusy(false)}
  }
  const listUrl=role==="patient"?"/patient/dashboard/bookings":role==="admin"?"/admin/dashboard/appointments":"/receptionist/dashboard/appointments";
  const rescheduleUrl=role==="patient"?`/patient/dashboard/bookings/${appointment.id}/reschedule`:role==="admin"?`/admin/dashboard/appointments/${appointment.id}/reschedule`:`/receptionist/dashboard/appointments/${appointment.id}/reschedule`;
  return <section className="tw-appointment-details min-w-[length:0]">
    <Link className="tw-back-link flex items-center gap-[7px] [color:var(--muted)] text-[length:10px] [&:hover]:[color:var(--teal-dark)] [&:hover]:underline w-[max-content] text-[length:12px]" href={listUrl}>← {t("backToAppointments")}</Link>
    <article className="tw-appointment-detail-card p-[clamp(18px,4vw,30px)] [border:1px_solid_var(--line)] rounded-[16px] [background:var(--surface)] [&>header]:pb-[18px] [&>header]:[border-bottom:1px_solid_var(--line)] [&>header_h1]:m-[12px_0_5px] [&>header_h1]:text-[length:22px] [&>header_p]:m-[0] [&>header_p]:[color:var(--muted)] [&>header_p]:text-[length:10px] [&>header_p]:[overflow-wrap:anywhere]">
      <header><span className={`tw-appointment-status inline-flex items-center whitespace-nowrap p-[5px_8px] rounded-[20px] text-[length:9px] font-bold status-${appointment.status.toLowerCase()}`}>{t(`status_${appointment.status}`)}</span><h1>{appointment.service.name}</h1><p>{appointment.id}</p></header>
      <div className="tw-appointment-detail-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[20px] m-[22px_0] [&>div]:grid [&>div]:grid-cols-[22px_1fr] [&>div]:gap-[5px_8px] [&>div]:items-center [&_svg]:row-[span_2] [&_svg]:[color:var(--teal)] [&_svg]:w-[17px] [&_span]:[color:var(--muted)] [&_span]:text-[length:10px] [&_small]:[color:var(--muted)] [&_small]:text-[length:10px] [&_strong]:text-[length:12px] [@media(max-width:650px)]:grid-cols-[1fr]">
        <div><CalendarDays/><span>{t("date")}</span><strong>{dateFormat.format(new Date(appointment.startAt))}</strong></div>
        <div><Clock3/><span>{t("time")}</span><strong>{timeFormat.format(new Date(appointment.startAt))} – {timeFormat.format(new Date(appointment.endAt))}</strong></div>
        <div><Stethoscope/><span>{t("doctor")}</span><strong>{appointment.doctor.name}</strong><small>{appointment.doctor.specialization}</small></div>
        <div><MapPin/><span>{t("chair")}</span><strong>{appointment.chair.name}</strong></div>
        <div><CalendarDays/><span>{t("duration")}</span><strong>{appointment.service.durationMinutes} {t("minutes")}</strong></div>
        <div><CalendarDays/><span>{t("estimatedServiceValue")}</span><strong>৳{Number(appointment.service.price).toLocaleString()}</strong></div>
      </div>
      {role!=="patient"&&<div className="tw-appointment-patient-info grid gap-[5px] p-[13px] rounded-[9px] [background:color-mix(in_srgb,var(--teal)_7%,var(--surface))] text-[length:11px] [&_span]:[color:var(--muted)]"><strong>{t("patient")}: {appointment.patientName}</strong>{appointment.patientPhone&&<span>{appointment.patientPhone}</span>}</div>}
      {appointment.cancellationReason&&<p className="tw-management-hint m-[0] [color:var(--muted)] text-[length:11px] leading-[1.6]">{t("cancellationReason")}: {appointment.cancellationReason}</p>}
      {error&&<p className="tw-management-error m-[0] [color:#b43e37] text-[length:12px]" role="alert">{error}</p>}
      {appointment.status==="CONFIRMED"&&<div className="tw-booking-actions flex justify-end gap-[9px] mt-[18px] [@media(max-width:650px)]:[justify-content:stretch] [@media(max-width:650px)]:flex-col-reverse"><Link className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" href={rescheduleUrl}>{t("reschedule")}</Link><button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" disabled={busy} onClick={cancel}>{busy?t("saving"):t("cancel")}</button></div>}
    </article>
  </section>;
}
