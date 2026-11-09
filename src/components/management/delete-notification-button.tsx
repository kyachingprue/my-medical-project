"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";

export function DeleteNotificationButton({id}:{id:string}){
  const t=useTranslations("notificationUi");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const [busy,setBusy]=useState(false);

  async function remove(){
    setBusy(true);
    const loadingToast=toast.loading(feedback("processing"));
    try{
      const response=await fetch(`/api/admin/notifications/${id}`,{method:"DELETE"});
      const body=await response.json() as {error?:{code?:string}};
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,body.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:t("deleteFailed"),
        }));
        return;
      }
      toast.success(t("deleteSuccess"));
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      toast.dismiss(loadingToast);
      setBusy(false);
    }
  }

  return <button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-danger min-h-[32px] p-[0_10px] [border:1px_solid_#e8b8b3] rounded-[8px] [background:color-mix(in_srgb,#faeae8_68%,var(--surface))] [color:#a3423a] text-[length:10px] font-bold [&:hover:not(:disabled)]:[background:#faeae8] [&:disabled]:opacity-[.55] [&:disabled]:cursor-wait" type="button" disabled={busy} onClick={remove}>{busy?t("deleting"):t("delete")}</button>;
}
