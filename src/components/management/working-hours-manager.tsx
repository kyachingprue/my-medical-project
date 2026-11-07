"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {Weekday} from "@prisma/client";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {weekdays,workingHoursSchema} from "@/lib/management/schemas";
import type {z} from "zod";

type Values=z.input<typeof workingHoursSchema>;
type DoctorOption={id:string;name:string;specialization:string};
type HoursRecord={id:string;doctorId:string;dayOfWeek:Weekday;startTime:string;endTime:string;isActive:boolean;doctor:{name:string}};
export function WorkingHoursManager({doctors,entries}:{doctors:DoctorOption[];entries:HoursRecord[]}){
  const t=useTranslations("management");
  const router=useRouter();
  const [error,setError]=useState("");
  const {register,handleSubmit,reset,formState:{isSubmitting}}=useForm<Values>({
    resolver:zodResolver(workingHoursSchema),
    defaultValues:{doctorId:doctors[0]?.id??"",dayOfWeek:Weekday.SATURDAY,startTime:"10:00",endTime:"13:00",copyToDays:[]},
  });
  async function submit(values:Values){
    setError("");
    try{
      const response=await fetch("/api/admin/working-hours",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??t("saveFailed"));
      setError("");
      reset({...values,copyToDays:[]});
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:t("saveFailed"))}
  }
  async function deactivate(id:string){
    if(!window.confirm(t("confirmDeactivate")))return;
    const response=await fetch(`/api/admin/working-hours/${id}`,{method:"DELETE"});
    if(!response.ok){const result=await response.json() as {error?:{message?:string}};setError(result.error?.message??t("saveFailed"));return}
    router.refresh();
  }
  return <div className="management-stack">
    <form className="management-card management-form" onSubmit={handleSubmit(submit)}>
      <span className="section-kicker">{t("addSchedule")}</span>
      <div className="management-form-grid">
        <label className="management-field"><span>{t("doctor")}</span><select {...register("doctorId")}>{doctors.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialization}</option>)}</select></label>
        <label className="management-field"><span>{t("weekday")}</span><select {...register("dayOfWeek")}>{weekdays.filter(day=>day!==Weekday.FRIDAY).map(day=><option key={day} value={day}>{t(`day_${day}`)}</option>)}</select></label>
        <label className="management-field"><span>{t("startTime")}</span><input type="time" {...register("startTime")}/></label>
        <label className="management-field"><span>{t("endTime")}</span><input type="time" {...register("endTime")}/></label>
      </div>
      <div className="copy-days"><span>{t("copyScheduleTo")}</span><div>{weekdays.filter(day=>day!==Weekday.FRIDAY).map(day=><label key={day}><input type="checkbox" value={day} {...register("copyToDays")}/>{t(`day_${day}`)}</label>)}</div></div>
      {error&&<p className="management-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={isSubmitting||!doctors.length}>{isSubmitting?t("saving"):t("saveSchedule")}</button>
    </form>
    <div className="management-card"><span className="section-kicker">{t("weeklySchedule")}</span>{entries.length?<div className="management-table-wrap"><table className="management-table"><thead><tr><th>{t("doctor")}</th><th>{t("weekday")}</th><th>{t("hours")}</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td>{entry.doctor.name}</td><td>{t(`day_${entry.dayOfWeek}`)}</td><td>{entry.startTime}–{entry.endTime}</td><td><span className={`status-badge ${entry.isActive?"is-active":"is-inactive"}`}>{entry.isActive?t("active"):t("inactive")}</span></td><td>{entry.isActive&&<button className="button button-outline" type="button" onClick={()=>deactivate(entry.id)}>{t("deactivate")}</button>}</td></tr>)}</tbody></table></div>:<p className="management-empty">{t("noSchedule")}</p>}</div>
    <p className="management-hint">{t("clinicHoursNote")}</p>
  </div>;
}
