"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";

type ServiceOption={id:string;name:string};
export function DoctorServiceAssignment({doctorId,services,selectedIds}:{doctorId:string;services:ServiceOption[];selectedIds:string[]}){
  const t=useTranslations("management");
  const router=useRouter();
  const [selected,setSelected]=useState(selectedIds);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function save(){
    setBusy(true);setMessage("");
    try{
      const response=await fetch(`/api/doctors/${doctorId}/services`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceIds:selected})});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??t("saveFailed"));
      setMessage(t("saved"));
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:t("saveFailed"))}
    finally{setBusy(false)}
  }
  return <section className="management-card"><div className="management-card-heading"><div><span className="section-kicker">{t("doctorServices")}</span><p>{t("doctorServicesHelp")}</p></div><button className="button button-primary" type="button" disabled={busy} onClick={save}>{busy?t("saving"):t("save")}</button></div><div className="service-check-list">{services.map(service=><label key={service.id}><input type="checkbox" checked={selected.includes(service.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,service.id]:current.filter(id=>id!==service.id))}/>{service.name}</label>)}</div>{message&&<p className="management-message" role="status">{message}</p>}</section>;
}
