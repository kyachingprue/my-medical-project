"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useState} from "react";

export function DeleteNotificationButton({id}:{id:string}){
  const t=useTranslations("notificationUi");
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function remove(){
    if(!window.confirm(t("confirmDelete")))return;
    setBusy(true);
    setError("");
    try{
      const response=await fetch(`/api/admin/notifications/${id}`,{method:"DELETE"});
      const body=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(body.error?.message??t("deleteFailed"));
      router.refresh();
    }catch(cause){
      setError(cause instanceof Error?cause.message:t("deleteFailed"));
    }finally{
      setBusy(false);
    }
  }

  return <div className="notification-row-actions">
    <button className="button button-danger" type="button" disabled={busy} onClick={remove}>{busy?t("deleting"):t("delete")}</button>
    {error?<small role="alert">{error}</small>:null}
  </div>;
}
