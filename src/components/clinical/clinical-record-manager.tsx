"use client";

import {useState,type FormEvent} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";

type PatientOption={id:string;name:string;email:string};
type HealthRecord={id:string;patientId:string;title:string;diagnosis:string;treatment:string;notes:string|null;recordedAt:Date;patient:{name:string};createdBy:{name:string}};
type Prescription={id:string;patientId:string;medication:string;dosage:string;frequency:string;duration:string;instructions:string|null;issuedAt:Date;patient:{name:string};createdBy:{name:string}};
type Props={patients:PatientOption[];records:HealthRecord[];prescriptions:Prescription[];locale:string};
type EntryType="record"|"prescription";

const fieldClass="w-full min-h-11 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--teal)]";

export function ClinicalRecordManager({patients,records,prescriptions,locale}:Props){
  const t=useTranslations("clinical");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const [type,setType]=useState<EntryType>("record");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    const payload=Object.fromEntries(form.entries());
    const loadingToast=toast.loading(feedback("processing"));
    setBusy(true);
    try{
      const response=await fetch("/api/admin/clinical-records",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...payload,type}),
      });
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
      formElement.reset();
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      toast.dismiss(loadingToast);
      setBusy(false);
    }
  }

  const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium"});

  return <section className="grid gap-6">
    <header className="grid gap-2">
      <span className="text-xs font-bold tracking-[.15em] text-[var(--teal)]">{t("adminKicker")}</span>
      <h1 className="m-0 text-3xl font-semibold tracking-tight text-[var(--text)]">{t("adminTitle")}</h1>
      <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--muted)]">{t("adminDescription")}</p>
    </header>

    <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--text)]">
          {t("patient")}
          <select className={fieldClass} name="patientId" required defaultValue="">
            <option value="" disabled>{t("selectPatient")}</option>
            {patients.map(patient=><option key={patient.id} value={patient.id}>{patient.name} · {patient.email}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text)]">
          {t("entryType")}
          <select className={fieldClass} value={type} onChange={event=>setType(event.target.value as EntryType)}>
            <option value="record">{t("healthRecord")}</option>
            <option value="prescription">{t("prescription")}</option>
          </select>
        </label>
      </div>

      {type==="record"?<div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("recordTitle")} name="title" required/>
        <Field label={t("diagnosis")} name="diagnosis" required multiline/>
        <Field label={t("treatment")} name="treatment" required multiline/>
        <Field label={t("notes")} name="notes" multiline/>
      </div>:<div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("medication")} name="medication" required/>
        <Field label={t("dosage")} name="dosage" required/>
        <Field label={t("frequency")} name="frequency" required/>
        <Field label={t("duration")} name="duration" required/>
        <Field label={t("instructions")} name="instructions" multiline/>
      </div>}
      <button type="submit" disabled={busy||patients.length===0} className="min-h-11 w-fit rounded-lg bg-[var(--teal)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
        {busy?t("saving"):t("saveEntry")}
      </button>
    </form>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="grid content-start gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div><h2 className="m-0 text-lg font-semibold text-[var(--text)]">{t("recentRecords")}</h2><p className="mb-0 mt-1 text-sm text-[var(--muted)]">{t("recordsCount",{count:records.length})}</p></div>
        {records.length===0?<EmptyState text={t("noRecords")}/>:records.map(record=><article key={record.id} className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-[var(--text)]">{record.title}</h3><span className="text-xs text-[var(--muted)]">{dateFormat.format(record.recordedAt)}</span></div>
          <p className="m-0 text-sm text-[var(--text)]"><strong>{t("patient")}:</strong> {record.patient.name}</p>
          <p className="m-0 text-sm text-[var(--muted)]"><strong>{t("diagnosis")}:</strong> {record.diagnosis}</p>
          <p className="m-0 text-sm text-[var(--muted)]"><strong>{t("treatment")}:</strong> {record.treatment}</p>
          <p className="m-0 text-xs text-[var(--muted)]">{t("authoredBy",{name:record.createdBy.name})}</p>
        </article>)}
      </section>
      <section className="grid content-start gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div><h2 className="m-0 text-lg font-semibold text-[var(--text)]">{t("recentPrescriptions")}</h2><p className="mb-0 mt-1 text-sm text-[var(--muted)]">{t("prescriptionsCount",{count:prescriptions.length})}</p></div>
        {prescriptions.length===0?<EmptyState text={t("noPrescriptions")}/>:prescriptions.map(prescription=><article key={prescription.id} className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-[var(--text)]">{prescription.medication}</h3><span className="text-xs text-[var(--muted)]">{dateFormat.format(prescription.issuedAt)}</span></div>
          <p className="m-0 text-sm text-[var(--text)]"><strong>{t("patient")}:</strong> {prescription.patient.name}</p>
          <p className="m-0 text-sm text-[var(--muted)]">{prescription.dosage} · {prescription.frequency} · {prescription.duration}</p>
          {prescription.instructions&&<p className="m-0 text-sm text-[var(--muted)]">{prescription.instructions}</p>}
          <p className="m-0 text-xs text-[var(--muted)]">{t("authoredBy",{name:prescription.createdBy.name})}</p>
        </article>)}
      </section>
    </div>
  </section>;
}

function Field({label,name,required,multiline}:{label:string;name:string;required?:boolean;multiline?:boolean}){
  return <label className="grid gap-2 text-sm font-medium text-[var(--text)]">
    {label}
    {multiline
      ?<textarea className={`${fieldClass} min-h-24 resize-y`} name={name} required={required}/>
      :<input className={fieldClass} name={name} required={required} maxLength={name==="title"?160:undefined}/>}
  </label>;
}

function EmptyState({text}:{text:string}){
  return <p className="rounded-xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">{text}</p>;
}
