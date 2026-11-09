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
  return <span className="tw-status-action [&_small]:[color:#b43e37] [&_small]:text-[length:11px] grid gap-[5px] [justify-items:start]"><button type="button" className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" disabled={busy} onClick={toggle}>{busy?t("saving"):isActive?t("deactivate"):t("reactivate")}</button>{error&&<small role="alert">{error}</small>}</span>;
}
