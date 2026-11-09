"use client";
import { statusStyleClasses } from "@/lib/tailwind-status-classes";

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
  const requestInFlight=useRef(false);

  const refreshSummary=useCallback(async(markVisibleAsRead=false)=>{
    if(requestInFlight.current)return;
    requestInFlight.current=true;
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
      const url=`/api/admin/notifications/summary${params.size?`?${params}`:""}`;
      let response:Response;
      try{
        response=await fetch(url,{cache:"no-store"});
      }catch(cause){
        if(!(cause instanceof TypeError))throw cause;
        await new Promise(resolve=>setTimeout(resolve,1000));
        response=await fetch(url,{cache:"no-store"});
      }
      const body=await response.json() as {data?:Summary;error?:{message?:string}};
      if(!response.ok||!body.data)throw new Error(t("loadFailed"));
      if(!readCursor.current||markVisibleAsRead){
        readCursor.current=body.data.latestCreatedAt??body.data.serverTime;
        try{window.localStorage.setItem(notificationReadCursorKey,readCursor.current)}catch(cause){console.error("Could not save the notification cursor:",cause)}
      }
      setSummary({...body.data,unreadCount:markVisibleAsRead?0:body.data.unreadCount});
      setError("");
    }catch(cause){
      if(!(cause instanceof TypeError))console.error("Could not refresh dashboard notifications:",cause);
      setError(t("loadFailed"));
    }finally{
      requestInFlight.current=false;
    }
  },[t]);

  useEffect(()=>{
    const initial=setTimeout(()=>void refreshSummary(),0);
    const interval=setInterval(()=>void refreshSummary(),60_000);
    return ()=>{clearTimeout(initial);clearInterval(interval)};
  },[refreshSummary]);

  return <div className="tw-dashboard-notification relative flex-[0_0_auto]">
    <button type="button" className="tw-dashboard-notification-trigger relative grid [place-items:center] w-[38px] h-[38px] [border:1px_solid_var(--line)] rounded-[11px] [background:var(--surface)] [color:var(--text)] cursor-pointer [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)] [&[aria-expanded='true']]:border-[color:var(--teal)] [&[aria-expanded='true']]:[color:var(--teal)]" aria-label={t("bellLabel",{count:summary?.unreadCount??0})} aria-expanded={open} aria-haspopup="dialog" onClick={()=>{const willOpen=!open;setOpen(willOpen);if(willOpen)void refreshSummary(true)}}>
      <Bell size={19}/>
      {summary&&summary.unreadCount>0?<span className="tw-dashboard-notification-count absolute top-[-6px] right-[-6px] min-w-[length:17px] h-[17px] p-[0_4px] grid [place-items:center] [border:2px_solid_var(--surface)] rounded-[999px] [background:#c4473e] [color:white] text-[length:9px] font-[750] leading-[1]">{summary.unreadCount>99?"99+":summary.unreadCount}</span>:null}
    </button>
    {open?<div className="tw-dashboard-notification-popover absolute top-[calc(100%_+_10px)] right-[0] z-[60] w-[min(370px,calc(100vw_-_24px))] max-h-[min(480px,70vh)] overflow-auto p-[14px] [border:1px_solid_var(--line)] rounded-[13px] [background:var(--surface)] shadow-[0_14px_40px_rgba(15,35,32,.16)] [color:var(--text)] [&_ul]:grid [&_ul]:gap-[0] [&_ul]:m-[0] [&_ul]:p-[0] [&_ul]:[list-style:none] [&_li]:flex [&_li]:items-start [&_li]:gap-[10px] [&_li]:p-[11px_4px] [&_li]:[border-bottom:1px_solid_var(--line)] [&_li>span:last-child]:grid [&_li>span:last-child]:min-w-[length:0] [&_li>span:last-child]:gap-[4px] [&_li_strong]:text-[length:11px] [&_li_strong]:[overflow-wrap:anywhere] [&_li_small]:[color:var(--muted)] [&_li_small]:text-[length:9px] [&_li_small]:leading-[1.4] [&_li_small]:[overflow-wrap:anywhere] [&>a]:block [&>a]:p-[12px_4px_2px] [&>a]:[color:var(--teal)] [&>a]:text-[length:11px] [&>a]:font-bold [@media(max-width:420px)]:right-[-95px]" role="dialog" aria-label={t("recentTitle")}>
      <div className="tw-dashboard-notification-heading grid gap-[5px] p-[3px_4px_12px] [border-bottom:1px_solid_var(--line)] [&_strong]:text-[length:13px] [&_span]:[color:var(--muted)] [&_span]:text-[length:10px]"><strong>{t("recentTitle")}</strong><span>{t("unread",{count:summary?.unreadCount??0})} · {t("actionableSummary",{pending:summary?.pending??0,failed:summary?.failed??0})}</span></div>
      {error?<div className="m-[13px_4px] grid gap-2"><p className="tw-dashboard-notification-error [color:var(--muted)] text-[length:10px] m-0 [color:#b43e37]" role="alert">{error}</p><button type="button" className="justify-self-start border-0 bg-transparent p-0 text-[length:10px] font-bold [color:var(--teal)] underline cursor-pointer" onClick={()=>void refreshSummary()}>{t("retry")}</button></div>:null}
      {!summary&&!error?<p className="tw-dashboard-notification-empty [color:var(--muted)] text-[length:10px] m-[13px_4px]">{t("loading")}</p>:null}
      {summary?.items.length===0?<p className="tw-dashboard-notification-empty [color:var(--muted)] text-[length:10px] m-[13px_4px]">{t("emptyDescription")}</p>:null}
      {summary?.items.length?<ul>{summary.items.map(item=><li key={item.id}>
        <span className={`tw-notification-dot flex-[0_0_8px] w-[8px] h-[8px] mt-[3px] rounded-[50%] [background:#dfa63a] ${statusStyleClasses[item.status.toLowerCase()] ?? ""}`}/>
        <span><strong>{item.appointment?.patient?.name??item.appointment?.patientName??item.recipientEmail}</strong><small>{item.subject}</small><small>{item.appointment?`${item.appointment.service.name} · ${item.appointment.doctor.name} · ${new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date(item.appointment.startAt))}`:item.recipientEmail}</small><small>{t(`status_${item.status}`)} · {new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date(item.createdAt))}</small></span>
      </li>)}</ul>:null}
      <Link href="/admin/notifications" onClick={()=>setOpen(false)}>{t("viewAll")}</Link>
    </div>:null}
  </div>;
}
