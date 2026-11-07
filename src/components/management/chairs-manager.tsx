"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";
import type {FormEvent} from "react";

type ChairItem={id:string;name:string;description:string|null;isActive:boolean;_count:{appointments:number}};
export function ChairsManager({chairs}:{chairs:ChairItem[]}){
  const t=useTranslations("management");
  const router=useRouter();
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setBusy(true);
    try{
      const response=await fetch("/api/admin/chairs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,description})});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??t("saveFailed"));
      setName("");setDescription("");router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:t("saveFailed"))}
    finally{setBusy(false)}
  }
  async function toggle(chair:ChairItem){
    if(chair.isActive&&!window.confirm(t("confirmDeactivate")))return;
    setError("");setBusy(true);
    try{
      const response=await fetch(`/api/admin/chairs/${chair.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:!chair.isActive})});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??t("saveFailed"));
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:t("saveFailed"))}
    finally{setBusy(false)}
  }
  return <div className="management-stack">
    <form className="management-card management-form" onSubmit={create}><span className="section-kicker">{t("addChair")}</span><div className="management-form-grid"><label className="management-field"><span>{t("chairName")}</span><input required value={name} onChange={event=>setName(event.target.value)}/></label><label className="management-field"><span>{t("description")}</span><input value={description} onChange={event=>setDescription(event.target.value)}/></label></div>{error&&<p className="management-error" role="alert">{error}</p>}<button className="button button-primary" disabled={busy}>{busy?t("saving"):t("save")}</button></form>
    <div className="management-card"><span className="section-kicker">{t("clinicChairs")}</span>{chairs.length?<div className="management-table-wrap"><table className="management-table"><thead><tr><th>{t("chairName")}</th><th>{t("description")}</th><th>{t("appointments")}</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{chairs.map(chair=><tr key={chair.id}><td>{chair.name}</td><td>{chair.description||"—"}</td><td>{chair._count.appointments}</td><td><span className={`status-badge ${chair.isActive?"is-active":"is-inactive"}`}>{chair.isActive?t("active"):t("inactive")}</span></td><td><button className="button button-outline" type="button" disabled={busy} onClick={()=>toggle(chair)}>{chair.isActive?t("deactivate"):t("reactivate")}</button></td></tr>)}</tbody></table></div>:<p className="management-empty">{t("noChairs")}</p>}</div>
  </div>;
}
