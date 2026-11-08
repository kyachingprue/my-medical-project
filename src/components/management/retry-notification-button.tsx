"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "react-hot-toast";

export function RetryNotificationButton({id}:{id:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  async function retry(){
    setBusy(true);
    try{
      const response=await fetch(`/api/admin/notifications/${id}/retry`,{method:"PATCH"});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??"Could not retry this notification.");
      toast.success("Patient email sent successfully");
    }catch(cause){
      toast.error(cause instanceof Error?cause.message:"Could not retry this notification.");
    }finally{
      setBusy(false);
      router.refresh();
    }
  }
  return <button className="button button-outline" type="button" onClick={retry} disabled={busy}>{busy?"Retrying…":"Retry"}</button>;
}
