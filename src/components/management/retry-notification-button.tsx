"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "react-hot-toast";

export function RetryNotificationButton({id}:{id:string}){
  const t=useTranslations("notificationUi");
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  async function retry(){
    setBusy(true);
    try{
      const response=await fetch(`/api/admin/notifications/${id}/retry`,{method:"PATCH"});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??"Could not retry this notification.");
      toast.success(t("retrySuccess"));
    }catch(cause){
      toast.error(cause instanceof Error?cause.message:t("retryFailed"),{duration:8000});
    }finally{
      setBusy(false);
      router.refresh();
    }
  }
  return <button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" type="button" onClick={retry} disabled={busy}>{busy?t("retrying"):t("retry")}</button>;
}
