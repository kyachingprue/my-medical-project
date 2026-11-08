"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {toast} from "react-hot-toast";

export function DeleteNotificationButton({id}:{id:string}){
  const t=useTranslations("notificationUi");
  const router=useRouter();
  const [busy,setBusy]=useState(false);

  async function remove(){
    if(!window.confirm(t("confirmDelete")))return;
    setBusy(true);
    try{
      const response=await fetch(`/api/admin/notifications/${id}`,{method:"DELETE"});
      const body=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(body.error?.message??t("deleteFailed"));
      toast.success("Notification deleted");
      router.refresh();
    }catch(cause){
      toast.error(cause instanceof Error?cause.message:t("deleteFailed"));
    }finally{
      setBusy(false);
    }
  }

  return <button className="button button-danger" type="button" disabled={busy} onClick={remove}>{busy?t("deleting"):t("delete")}</button>;
}
