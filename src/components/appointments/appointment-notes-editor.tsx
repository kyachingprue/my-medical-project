"use client";

import {useState,type FormEvent} from "react";
import {useTranslations} from "next-intl";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";

export function AppointmentNotesEditor({appointmentId,mode,patientNote,staffNotes}:{
  appointmentId:string;
  mode:"patient"|"staff";
  patientNote:string|null;
  staffNotes:string|null;
}){
  const t=useTranslations("appointments");
  const feedback=useTranslations("feedback");
  const [note,setNote]=useState(mode==="patient"?patientNote??"":staffNotes??"");
  const [busy,setBusy]=useState(false);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    const loading=toast.loading(feedback("processing"));
    try{
      const response=await fetch(`/api/appointments/${appointmentId}/notes`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(mode==="patient"?{patientNote:note}:{staffNotes:note}),
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
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      toast.dismiss(loading);
      setBusy(false);
    }
  }

  return <section className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
    {mode==="staff"&&patientNote&&<p className="m-0 whitespace-pre-wrap text-sm text-[var(--muted)]"><strong className="text-[var(--text)]">{t("patientNote")}:</strong> {patientNote}</p>}
    <form className="grid gap-3" onSubmit={save}>
      <label className="grid gap-2 text-sm font-medium text-[var(--text)]">
        {mode==="patient"?t("patientNote"):t("staffNotes")}
        <textarea className="min-h-24 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 text-sm text-[var(--text)]" maxLength={mode==="patient"?2000:5000} value={note} onChange={event=>setNote(event.target.value)}/>
      </label>
      <button className="min-h-10 w-fit rounded-lg bg-[var(--teal)] px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={busy}>{busy?t("saving"):t("saveNotes")}</button>
    </form>
  </section>;
}
