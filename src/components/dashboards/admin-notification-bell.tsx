"use client";

import {Bell} from "lucide-react";
import {useTranslations} from "next-intl";
import {useEffect,useState} from "react";
import {Link} from "@/i18n/navigation";

type Summary={
  pending:number;
  failed:number;
  actionable:number;
  items:Array<{
    id:string;
    type:string;
    status:"PENDING"|"SENT"|"FAILED";
    subject:string;
    recipientEmail:string;
    createdAt:string;
    appointment:{patientName:string;patient:{name:string}|null;doctor:{name:string}}|null;
  }>;
};

export function AdminNotificationBell(){
  const t=useTranslations("notificationUi");
  const [summary,setSummary]=useState<Summary|null>(null);
  const [error,setError]=useState("");
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      try{
        const response=await fetch("/api/admin/notifications/summary",{cache:"no-store"});
        const body=await response.json() as {data?:Summary;error?:{message?:string}};
        if(!response.ok||!body.data)throw new Error(body.error?.message??t("loadFailed"));
        if(active){setSummary(body.data);setError("")}
      }catch(cause){
        if(active){
          const message=cause instanceof Error?cause.message:t("loadFailed");
          console.error("Could not refresh dashboard notifications:",cause);
          setError(message);
        }
      }
    };
    void load();
    const interval=setInterval(()=>void load(),60_000);
    return ()=>{active=false;clearInterval(interval)};
  },[t]);

  return <div className="dashboard-notification">
    <button type="button" className="dashboard-notification-trigger" aria-label={t("bellLabel",{count:summary?.actionable??0})} aria-expanded={open} aria-haspopup="dialog" onClick={()=>setOpen(value=>!value)}>
      <Bell size={19}/>
      {summary&&summary.actionable>0?<span className="dashboard-notification-count">{summary.actionable>99?"99+":summary.actionable}</span>:null}
    </button>
    {open?<div className="dashboard-notification-popover" role="dialog" aria-label={t("recentTitle")}>
      <div className="dashboard-notification-heading"><strong>{t("recentTitle")}</strong><span>{t("actionableSummary",{pending:summary?.pending??0,failed:summary?.failed??0})}</span></div>
      {error?<p className="dashboard-notification-error" role="alert">{error}</p>:null}
      {!summary&&!error?<p className="dashboard-notification-empty">{t("loading")}</p>:null}
      {summary?.items.length===0?<p className="dashboard-notification-empty">{t("emptyDescription")}</p>:null}
      {summary?.items.length?<ul>{summary.items.map(item=><li key={item.id}>
        <span className={`notification-dot status-${item.status.toLowerCase()}`}/>
        <span><strong>{item.appointment?.patient?.name??item.appointment?.patientName??item.recipientEmail}</strong><small>{item.appointment?.doctor.name??item.subject}</small><small>{t(`status_${item.status}`)} · {new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date(item.createdAt))}</small></span>
      </li>)}</ul>:null}
      <Link href="/admin/notifications" onClick={()=>setOpen(false)}>{t("viewAll")}</Link>
    </div>:null}
  </div>;
}
