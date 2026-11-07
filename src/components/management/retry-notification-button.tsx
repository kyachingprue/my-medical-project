"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

export function RetryNotificationButton({id}:{id:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function retry(){
    setBusy(true);
    setError("");
    try{
      const response=await fetch(`/api/admin/notifications/${id}/retry`,{method:"PATCH"});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??"Could not retry this notification.");
      router.refresh();
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Could not retry this notification.");
    }finally{
      setBusy(false);
    }
  }
  return <div><button className="button button-outline" type="button" onClick={retry} disabled={busy}>{busy?"Retrying…":"Retry"}</button>{error?<small role="alert">{error}</small>:null}</div>;
}
