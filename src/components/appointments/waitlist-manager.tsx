"use client";

import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";

type Role="patient"|"receptionist"|"admin";
type Props={
  role:Role;
  entries:{
    id:string;fromDate:Date|string;throughDate:Date|string;notes:string|null;
    status:"WAITING"|"CONTACTED"|"BOOKED"|"CANCELLED";
    service:{id:string;name:string};doctor:{id:string;name:string}|null;
    patient:{id:string;name:string;email:string};
  }[];
  services:{id:string;name:string}[];
  doctors:{id:string;name:string;serviceIds?:string[]}[];
};
const inputClass="min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--text)]";

export function WaitlistManager({role,entries,services,doctors}:Props){
  const t=useTranslations("waitlist");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [serviceId,setServiceId]=useState("");
  const [doctorId,setDoctorId]=useState("");
  const availableDoctors=doctors.filter(doctor=>doctor.serviceIds?.includes(serviceId));

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    setBusy(true);
    const loading=toast.loading(feedback("processing"));
    try{
      const response=await fetch("/api/waitlist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(form.entries()))});
      const result=await response.json() as {error?:{code?:string}};
      if(!response.ok){
        toast.error(result.error?.code==="DOCTOR_SERVICE_UNAVAILABLE"?t("doctorUnavailable"):getSafeApiErrorMessage(response.status,result.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:feedback("serverError"),
        }));
        return;
      }
      formElement.reset();
      setServiceId("");
      setDoctorId("");
      toast.success(t("added"));
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      toast.dismiss(loading);
      setBusy(false);
    }
  }

  async function updateEntry(id:string,status:string){
    setBusy(true);
    const loading=toast.loading(feedback("processing"));
    try{
      const response=await fetch(`/api/waitlist/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
      const result=await response.json() as {error?:{code?:string}};
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,result.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:feedback("serverError"),
        }));
        return;
      }
      toast.success(feedback("changesSaved"));
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      toast.dismiss(loading);
      setBusy(false);
    }
  }

  async function cancelEntry(id:string){
    setBusy(true);
    const loading=toast.loading(feedback("processing"));
    try{
      const response=await fetch(`/api/waitlist/${id}`,{method:"DELETE"});
      const result=await response.json() as {error?:{code?:string}};
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,result.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:feedback("serverError"),
        }));
        return;
      }
      toast.success(t("cancelled"));
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      toast.dismiss(loading);
      setBusy(false);
    }
  }

  const formatDate=(value:Date|string)=>new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium"}).format(new Date(value));
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka"}).format(new Date());
  const maxDate=new Date(`${today}T00:00:00+06:00`);
  maxDate.setDate(maxDate.getDate()+30);
  const maxDateValue=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka"}).format(maxDate);

  return <section className="grid gap-6">
    <header className="grid gap-2"><span className="text-xs font-bold tracking-[.15em] text-[var(--teal)]">{t("kicker")}</span><h1 className="m-0 text-3xl font-semibold text-[var(--text)]">{t("title")}</h1><p className="m-0 max-w-3xl text-sm leading-6 text-[var(--muted)]">{t(role==="patient"?"patientDescription":"staffDescription")}</p></header>
    {role==="patient"&&<form onSubmit={submit} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:grid-cols-2 sm:p-6">
      <label className="grid gap-2 text-sm font-medium text-[var(--text)]">{t("service")}<select className={inputClass} name="serviceId" required value={serviceId} onChange={event=>{setServiceId(event.target.value);setDoctorId("");}}><option value="" disabled>{t("selectService")}</option>{services.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium text-[var(--text)]">{t("doctor")}<select className={inputClass} name="doctorId" value={doctorId} disabled={!serviceId} onChange={event=>setDoctorId(event.target.value)}><option value="">{serviceId?t("anyDoctor"):t("selectServiceFirst")}</option>{availableDoctors.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium text-[var(--text)]">{t("fromDate")}<input className={inputClass} type="date" name="fromDate" required min={today} max={maxDateValue}/></label>
      <label className="grid gap-2 text-sm font-medium text-[var(--text)]">{t("throughDate")}<input className={inputClass} type="date" name="throughDate" required min={today} max={maxDateValue}/></label>
      <label className="grid gap-2 text-sm font-medium text-[var(--text)] sm:col-span-2">{t("notes")}<textarea className={`${inputClass} min-h-24 resize-y py-2`} name="notes" maxLength={1000}/></label>
      <button className="min-h-11 w-fit rounded-lg bg-[var(--teal)] px-5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2" disabled={busy||services.length===0}>{busy?t("saving"):t("joinWaitlist")}</button>
    </form>}
    <section className="grid gap-3">
      <h2 className="m-0 text-xl font-semibold text-[var(--text)]">{t("entries")}</h2>
      {!entries.length?<p className="m-0 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">{t("empty")}</p>:entries.map(entry=><article key={entry.id} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid gap-1"><strong className="text-sm text-[var(--text)]">{entry.service.name}{entry.doctor?` · ${entry.doctor.name}`:""}</strong>{role!=="patient"&&<span className="text-xs text-[var(--muted)]">{entry.patient.name} · {entry.patient.email}</span>}<span className="text-xs text-[var(--muted)]">{formatDate(entry.fromDate)} – {formatDate(entry.throughDate)}</span>{entry.notes&&<span className="whitespace-pre-wrap text-xs text-[var(--muted)]">{entry.notes}</span>}<span className="text-xs font-semibold text-[var(--teal)]">{t(`status_${entry.status}`)}</span></div>
        {entry.status!=="CANCELLED"&&entry.status!=="BOOKED"&&(role==="patient"
          ?<button className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-xs font-semibold text-[var(--text)] disabled:opacity-50" disabled={busy} onClick={()=>void cancelEntry(entry.id)}>{t("cancelRequest")}</button>
          :<select aria-label={t("updateStatus")} className={inputClass} disabled={busy} value={entry.status} onChange={event=>void updateEntry(entry.id,event.target.value)}><option value="WAITING">{t("status_WAITING")}</option><option value="CONTACTED">{t("status_CONTACTED")}</option><option value="BOOKED">{t("status_BOOKED")}</option><option value="CANCELLED">{t("status_CANCELLED")}</option></select>)}
      </article>)}
    </section>
  </section>;
}
