"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {timeOffSchema} from "@/lib/management/schemas";
import type {z} from "zod";

type Values=z.input<typeof timeOffSchema>;
type DoctorOption={id:string;name:string;specialization:string};
type LeaveEntry={id:string;doctorId:string;startAt:string|Date;endAt:string|Date;reason:string;doctor:{name:string}};
type Conflict={id:string;startAt:string|Date;endAt:string|Date;patient:{name:string};service:{name:string};chair:{name:string}};
export function TimeOffManager({doctors,entries}:{doctors:DoctorOption[];entries:LeaveEntry[]}){
  const t=useTranslations("management");
  const router=useRouter();
  const [error,setError]=useState("");
  const [conflicts,setConflicts]=useState<Conflict[]>([]);
  const {register,handleSubmit,reset,formState:{isSubmitting}}=useForm<Values>({
    resolver:zodResolver(timeOffSchema),
    defaultValues:{doctorId:doctors[0]?.id??"",startAt:"",endAt:"",reason:""},
  });
  async function submit(values:Values){
    setError("");setConflicts([]);
    try{
      const response=await fetch("/api/admin/time-off",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const result=await response.json() as {error?:{message?:string;details?:{appointments?:Conflict[]}}};
      if(!response.ok){
        setConflicts(result.error?.details?.appointments??[]);
        throw new Error(result.error?.message??t("saveFailed"));
      }
      reset({...values,startAt:"",endAt:"",reason:""});
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:t("saveFailed"))}
  }
  async function cancel(id:string){
    if(!window.confirm(t("confirmCancelLeave")))return;
    const response=await fetch(`/api/admin/time-off/${id}`,{method:"DELETE"});
    if(!response.ok){const result=await response.json() as {error?:{message?:string}};setError(result.error?.message??t("saveFailed"));return}
    router.refresh();
  }
  const formatDate=(value:string|Date)=>new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
  return <div className="management-stack">
    <form className="management-card management-form" onSubmit={handleSubmit(submit)}>
      <span className="section-kicker">{t("addLeave")}</span>
      <div className="management-form-grid">
        <label className="management-field"><span>{t("doctor")}</span><select {...register("doctorId")}>{doctors.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialization}</option>)}</select></label>
        <label className="management-field"><span>{t("startAtDhaka")}</span><input type="datetime-local" {...register("startAt")}/></label>
        <label className="management-field"><span>{t("endAtDhaka")}</span><input type="datetime-local" {...register("endAt")}/></label>
        <label className="management-field"><span>{t("reason")}</span><input maxLength={500} {...register("reason")}/></label>
      </div>
      {error&&<p className="management-error" role="alert">{error}</p>}
      {conflicts.length>0&&<div className="conflict-summary"><strong>{t("affectedAppointments")}</strong><ul>{conflicts.map(item=><li key={item.id}>{formatDate(item.startAt)} · {item.patient.name} · {item.service.name} · {item.chair.name}</li>)}</ul></div>}
      <button className="button button-primary" disabled={isSubmitting||!doctors.length}>{isSubmitting?t("saving"):t("saveLeave")}</button><p className="management-hint">{t("leaveTimezoneNote")}</p>
    </form>
    <div className="management-card"><span className="section-kicker">{t("doctorLeave")}</span>{entries.length?<div className="management-table-wrap"><table className="management-table"><thead><tr><th>{t("doctor")}</th><th>{t("period")}</th><th>{t("reason")}</th><th>{t("actions")}</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td>{entry.doctor.name}</td><td>{formatDate(entry.startAt)} – {formatDate(entry.endAt)}</td><td>{entry.reason}</td><td><button className="button button-outline" type="button" onClick={()=>cancel(entry.id)}>{t("cancelLeave")}</button></td></tr>)}</tbody></table></div>:<p className="management-empty">{t("noLeave")}</p>}</div>
  </div>;
}
