"use client";

import {Bell} from "lucide-react";
import {useTranslations} from "next-intl";
import {useCallback,useEffect,useRef,useState} from "react";
import {Link} from "@/i18n/navigation";

const notificationReadCursorKey="admin-notifications-read-cursor";

type Summary={
  total:number;
  pending:number;
  failed:number;
  actionable:number;
  unreadCount:number;
  latestCreatedAt:string|null;
  serverTime:string;
  items:Array<{
    id:string;
    type:string;
    status:"PENDING"|"SENT"|"FAILED";
    subject:string;
    recipientEmail:string;
    createdAt:string;
    appointment:{patientName:string;patient:{name:string}|null;doctor:{name:string};service:{name:string};startAt:string}|null;
  }>;
};

export function AdminNotificationBell(){
  const t=useTranslations("notificationUi");
  const [summary,setSummary]=useState<Summary|null>(null);
  const [error,setError]=useState("");
  const [open,setOpen]=useState(false);
  const readCursor=useRef<string|null>(null);
  const cursorInitialized=useRef(false);

  const refreshSummary=useCallback(async(markVisibleAsRead=false)=>{
    try{
      if(!cursorInitialized.current){
        try{
          const storedCursor=window.localStorage.getItem(notificationReadCursorKey);
          readCursor.current=storedCursor&&Number.isFinite(Date.parse(storedCursor))?storedCursor:null;
        }catch(cause){console.error("Could not read the notification cursor:",cause)}
        cursorInitialized.current=true;
      }
      const params=new URLSearchParams();
      if(readCursor.current)params.set("after",readCursor.current);
      const response=await fetch(`/api/admin/notifications/summary${params.size?`?${params}`:""}`,{cache:"no-store"});
      const body=await response.json() as {data?:Summary;error?:{message?:string}};
      if(!response.ok||!body.data)throw new Error(body.error?.message??t("loadFailed"));
      if(!readCursor.current||markVisibleAsRead){
        readCursor.current=body.data.latestCreatedAt??body.data.serverTime;
        try{window.localStorage.setItem(notificationReadCursorKey,readCursor.current)}catch(cause){console.error("Could not save the notification cursor:",cause)}
      }
      setSummary({...body.data,unreadCount:markVisibleAsRead?0:body.data.unreadCount});
      setError("");
    }catch(cause){
      const message=cause instanceof Error?cause.message:t("loadFailed");
      console.error("Could not refresh dashboard notifications:",cause);
      setError(message);
    }
  },[t]);

  useEffect(()=>{
    const initial=setTimeout(()=>void refreshSummary(),0);
    const interval=setInterval(()=>void refreshSummary(),60_000);
    return ()=>{clearTimeout(initial);clearInterval(interval)};
  },[refreshSummary]);

  return <div className="dashboard-notification">
    <button type="button" className="dashboard-notification-trigger" aria-label={t("bellLabel",{count:summary?.unreadCount??0})} aria-expanded={open} aria-haspopup="dialog" onClick={()=>{const willOpen=!open;setOpen(willOpen);if(willOpen)void refreshSummary(true)}}>
      <Bell size={19}/>
      {summary&&summary.unreadCount>0?<span className="dashboard-notification-count">{summary.unreadCount>99?"99+":summary.unreadCount}</span>:null}
    </button>
    {open?<div className="dashboard-notification-popover" role="dialog" aria-label={t("recentTitle")}>
      <div className="dashboard-notification-heading"><strong>{t("recentTitle")}</strong><span>{t("unread",{count:summary?.unreadCount??0})} · {t("actionableSummary",{pending:summary?.pending??0,failed:summary?.failed??0})}</span></div>
      {error?<p className="dashboard-notification-error" role="alert">{error}</p>:null}
      {!summary&&!error?<p className="dashboard-notification-empty">{t("loading")}</p>:null}
      {summary?.items.length===0?<p className="dashboard-notification-empty">{t("emptyDescription")}</p>:null}
      {summary?.items.length?<ul>{summary.items.map(item=><li key={item.id}>
        <span className={`notification-dot status-${item.status.toLowerCase()}`}/>
        <span><strong>{item.appointment?.patient?.name??item.appointment?.patientName??item.recipientEmail}</strong><small>{item.subject}</small><small>{item.appointment?`${item.appointment.service.name} · ${item.appointment.doctor.name} · ${new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date(item.appointment.startAt))}`:item.recipientEmail}</small><small>{t(`status_${item.status}`)} · {new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date(item.createdAt))}</small></span>
      </li>)}</ul>:null}
      <Link href="/admin/notifications" onClick={()=>setOpen(false)}>{t("viewAll")}</Link>
    </div>:null}
  </div>;
}
