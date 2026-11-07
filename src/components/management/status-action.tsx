"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";

export function StatusAction({resource,id,isActive}:{resource:"doctors"|"services"|"admin/chairs";id:string;isActive:boolean}){
  const t=useTranslations("management");
  const router=useRouter();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function toggle(){
    if(isActive&&!window.confirm(t("confirmDeactivate")))return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/${resource}/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:!isActive})});
      const payload=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(payload.error?.message??t("saveFailed"));
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:t("saveFailed"))}
    finally{setBusy(false)}
  }
  return <span className="status-action"><button type="button" className="button button-outline" disabled={busy} onClick={toggle}>{busy?t("saving"):isActive?t("deactivate"):t("reactivate")}</button>{error&&<small role="alert">{error}</small>}</span>;
}
