"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";

export function StatusAction({resource,id,isActive}:{resource:"doctors"|"services"|"admin/chairs";id:string;isActive:boolean}){
  const t=useTranslations("management");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  async function toggle(){
    if(isActive&&!window.confirm(t("confirmDeactivate")))return;
    setBusy(true);
    const loadingToast=toast.loading(feedback("processing"));
    try{
      const response=await fetch(`/api/${resource}/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:!isActive})});
      const payload=await response.json() as {error?:{code?:string}};
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,payload.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:t("saveFailed"),
        }));
        return;
      }
      toast.success(feedback("changesSaved"));
      router.refresh();
    }catch{toast.error(feedback("serverError"))}
    finally{toast.dismiss(loadingToast);setBusy(false)}
  }
  return <span className="tw-status-action [&_small]:[color:#b43e37] [&_small]:text-[length:11px] grid gap-[5px] [justify-items:start]"><button type="button" className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" disabled={busy} onClick={toggle}>{busy?t("saving"):isActive?t("deactivate"):t("reactivate")}</button></span>;
}
