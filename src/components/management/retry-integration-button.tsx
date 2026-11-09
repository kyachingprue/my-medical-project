"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {toast} from "react-hot-toast";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";

export function RetryIntegrationButton({id}:{id:string}){
  const t=useTranslations("notificationUi");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  async function retry(){
    setBusy(true);
    const loading=toast.loading(feedback("processing"));
    try{
      const response=await fetch(`/api/admin/integrations/${id}/retry`,{method:"PATCH"});
      const result=await response.json() as {error?:{code?:string}};
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,result.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:t("retryFailed"),
        }));
        return;
      }
      toast.success(t("retrySuccess"));
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      toast.dismiss(loading);
      setBusy(false);
      router.refresh();
    }
  }
  return <button className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-semibold text-[var(--text)] disabled:opacity-50" type="button" onClick={()=>void retry()} disabled={busy}>{busy?t("retrying"):t("retry")}</button>;
}
