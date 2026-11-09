import {connection} from "next/server";
import {AlertCircle,CheckCircle2,Clock3,Mail,MailCheck} from "lucide-react";
import {prisma} from "@/lib/prisma";
import {requireRole} from "@/lib/auth/authorize";
import {RetryNotificationButton} from "@/components/management/retry-notification-button";
import {DeleteNotificationButton} from "@/components/management/delete-notification-button";
import {getTranslations} from "next-intl/server";
import {RetryIntegrationButton} from "@/components/management/retry-integration-button";

export const instant=false;

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{page?: string;integrationPage?:string}>;
};

export default async function AdminNotificationsPage({params,searchParams}:Props) {
  const {locale}=await params;
  await requireRole("ADMIN",locale);
  await connection();
  const t=await getTranslations("notificationUi");
  const ui=await getTranslations("notificationEnhancement");
  const search=await searchParams;
  const requestedPage=Number(search.page);
  const requestedIntegrationPage=Number(search.integrationPage);
  const page=Number.isInteger(requestedPage)&&requestedPage>0?requestedPage:1;
  const integrationPage=Number.isInteger(requestedIntegrationPage)&&requestedIntegrationPage>0?requestedIntegrationPage:1;
  const limit=20;
  const [total,pending,sent,failed,integrationTotal]=await Promise.all([
    prisma.notificationLog.count(),
    prisma.notificationLog.count({where:{status:"PENDING"}}),
    prisma.notificationLog.count({where:{status:"SENT"}}),
    prisma.notificationLog.count({where:{status:"FAILED"}}),
    prisma.integrationLog.count(),
  ]);
  const totalPages=Math.max(1,Math.ceil(total/limit));
  const currentPage=Math.min(page,totalPages);
  const totalIntegrationPages=Math.max(1,Math.ceil(integrationTotal/limit));
  const currentIntegrationPage=Math.min(integrationPage,totalIntegrationPages);
  const items=await prisma.notificationLog.findMany({
    orderBy:{createdAt:"desc"},
    skip:(currentPage-1)*limit,
    take:limit,
    select:{
    id:true,
    type:true,
    status:true,
    subject:true,
    recipientEmail:true,
    createdAt:true,
    attempts:true,
    providerMessage:true,
      appointment:{select:{
        patientName:true,
        patient:{select:{name:true}},
        doctor:{select:{name:true}},
        service:{select:{name:true}},
        startAt:true,
      }},
    },
  });
  const integrations=await prisma.integrationLog.findMany({
    orderBy:{createdAt:"desc"},
    skip:(currentIntegrationPage-1)*limit,
    take:limit,
    include:{appointment:{select:{patientName:true,patient:{select:{name:true}},doctor:{select:{name:true}},service:{select:{name:true}},startAt:true}}},
  });

  return <section className="tw-management-page grid gap-[22px] max-w-[length:1180px] m-[0_auto]">
    <header className="tw-management-page-header flex items-end justify-between gap-[20px] [&_h1]:m-[8px_0] [&_h1]:text-[length:clamp(28px,4vw,40px)] [&_h1]:tracking-[-1.6px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col tw-notification-page-header mb-[2px]">
      <div>
        <span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("operations")}</span>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </div>
    </header>

    <div className="tw-notification-summary grid grid-cols-[repeat(4,minmax(0,1fr))] gap-[14px] [@media(max-width:760px)]:grid-cols-[repeat(2,minmax(0,1fr))] [@media(max-width:420px)]:gap-[8px]">
      <article className="tw-notification-metric relative grid gap-[8px] min-w-[length:0] min-h-[145px] p-[18px] [border:1px_solid_var(--line)] rounded-[15px] [background:linear-gradient(145deg,color-mix(in_srgb,var(--teal)_5%,var(--surface)),var(--surface)_72%)] shadow-[0_8px_26px_color-mix(in_srgb,var(--text)_4%,transparent)] [&>strong]:text-[length:clamp(25px,3vw,34px)] [&>strong]:leading-[1] [&>strong]:tracking-[-.04em] [&>small]:[color:var(--muted)] [&>small]:text-[length:10px] [&>small]:leading-[1.45]"><span className="tw-notification-metric-icon absolute top-[15px] right-[15px] grid w-[36px] h-[36px] [place-items:center] rounded-[11px] [background:color-mix(in_srgb,var(--teal)_11%,var(--surface))] [color:var(--teal)] [.tw-notification-metric.tw-is-pending_&]:[background:color-mix(in_srgb,#d97706_11%,var(--surface))] [.tw-notification-metric.tw-is-pending_&]:[color:#a66b25] [.tw-notification-metric.tw-is-sent_&]:[background:color-mix(in_srgb,#16a34a_10%,var(--surface))] [.tw-notification-metric.tw-is-sent_&]:[color:#36794f] [.tw-notification-metric.tw-is-failed_&]:[background:color-mix(in_srgb,#dc2626_9%,var(--surface))] [.tw-notification-metric.tw-is-failed_&]:[color:#a95049]"><Mail size={18}/></span><span className="tw-notification-metric-label max-w-[length:calc(100%_-_42px)] [color:var(--muted)] text-[length:11px] font-bold">{t("total")}</span><strong>{total}</strong><small>{ui("totalHint")}</small></article>
      <article className="tw-notification-metric relative grid gap-[8px] min-w-[length:0] min-h-[145px] p-[18px] [border:1px_solid_var(--line)] rounded-[15px] [background:linear-gradient(145deg,color-mix(in_srgb,var(--teal)_5%,var(--surface)),var(--surface)_72%)] shadow-[0_8px_26px_color-mix(in_srgb,var(--text)_4%,transparent)] [&>strong]:text-[length:clamp(25px,3vw,34px)] [&>strong]:leading-[1] [&>strong]:tracking-[-.04em] [&>small]:[color:var(--muted)] [&>small]:text-[length:10px] [&>small]:leading-[1.45] tw-is-pending"><span className="tw-notification-metric-icon absolute top-[15px] right-[15px] grid w-[36px] h-[36px] [place-items:center] rounded-[11px] [background:color-mix(in_srgb,var(--teal)_11%,var(--surface))] [color:var(--teal)] [.tw-notification-metric.tw-is-pending_&]:[background:color-mix(in_srgb,#d97706_11%,var(--surface))] [.tw-notification-metric.tw-is-pending_&]:[color:#a66b25] [.tw-notification-metric.tw-is-sent_&]:[background:color-mix(in_srgb,#16a34a_10%,var(--surface))] [.tw-notification-metric.tw-is-sent_&]:[color:#36794f] [.tw-notification-metric.tw-is-failed_&]:[background:color-mix(in_srgb,#dc2626_9%,var(--surface))] [.tw-notification-metric.tw-is-failed_&]:[color:#a95049]"><Clock3 size={18}/></span><span className="tw-notification-metric-label max-w-[length:calc(100%_-_42px)] [color:var(--muted)] text-[length:11px] font-bold">{t("pending")}</span><strong>{pending}</strong><small>{ui("pendingHint")}</small></article>
      <article className="tw-notification-metric relative grid gap-[8px] min-w-[length:0] min-h-[145px] p-[18px] [border:1px_solid_var(--line)] rounded-[15px] [background:linear-gradient(145deg,color-mix(in_srgb,var(--teal)_5%,var(--surface)),var(--surface)_72%)] shadow-[0_8px_26px_color-mix(in_srgb,var(--text)_4%,transparent)] [&>strong]:text-[length:clamp(25px,3vw,34px)] [&>strong]:leading-[1] [&>strong]:tracking-[-.04em] [&>small]:[color:var(--muted)] [&>small]:text-[length:10px] [&>small]:leading-[1.45] tw-is-sent"><span className="tw-notification-metric-icon absolute top-[15px] right-[15px] grid w-[36px] h-[36px] [place-items:center] rounded-[11px] [background:color-mix(in_srgb,var(--teal)_11%,var(--surface))] [color:var(--teal)] [.tw-notification-metric.tw-is-pending_&]:[background:color-mix(in_srgb,#d97706_11%,var(--surface))] [.tw-notification-metric.tw-is-pending_&]:[color:#a66b25] [.tw-notification-metric.tw-is-sent_&]:[background:color-mix(in_srgb,#16a34a_10%,var(--surface))] [.tw-notification-metric.tw-is-sent_&]:[color:#36794f] [.tw-notification-metric.tw-is-failed_&]:[background:color-mix(in_srgb,#dc2626_9%,var(--surface))] [.tw-notification-metric.tw-is-failed_&]:[color:#a95049]"><CheckCircle2 size={18}/></span><span className="tw-notification-metric-label max-w-[length:calc(100%_-_42px)] [color:var(--muted)] text-[length:11px] font-bold">{t("sent")}</span><strong>{sent}</strong><small>{ui("sentHint")}</small></article>
      <article className="tw-notification-metric relative grid gap-[8px] min-w-[length:0] min-h-[145px] p-[18px] [border:1px_solid_var(--line)] rounded-[15px] [background:linear-gradient(145deg,color-mix(in_srgb,var(--teal)_5%,var(--surface)),var(--surface)_72%)] shadow-[0_8px_26px_color-mix(in_srgb,var(--text)_4%,transparent)] [&>strong]:text-[length:clamp(25px,3vw,34px)] [&>strong]:leading-[1] [&>strong]:tracking-[-.04em] [&>small]:[color:var(--muted)] [&>small]:text-[length:10px] [&>small]:leading-[1.45] tw-is-failed"><span className="tw-notification-metric-icon absolute top-[15px] right-[15px] grid w-[36px] h-[36px] [place-items:center] rounded-[11px] [background:color-mix(in_srgb,var(--teal)_11%,var(--surface))] [color:var(--teal)] [.tw-notification-metric.tw-is-pending_&]:[background:color-mix(in_srgb,#d97706_11%,var(--surface))] [.tw-notification-metric.tw-is-pending_&]:[color:#a66b25] [.tw-notification-metric.tw-is-sent_&]:[background:color-mix(in_srgb,#16a34a_10%,var(--surface))] [.tw-notification-metric.tw-is-sent_&]:[color:#36794f] [.tw-notification-metric.tw-is-failed_&]:[background:color-mix(in_srgb,#dc2626_9%,var(--surface))] [.tw-notification-metric.tw-is-failed_&]:[color:#a95049]"><AlertCircle size={18}/></span><span className="tw-notification-metric-label max-w-[length:calc(100%_-_42px)] [color:var(--muted)] text-[length:11px] font-bold">{t("failed")}</span><strong>{failed}</strong><small>{ui("failedHint")}</small></article>
    </div>
    <aside className="tw-notification-workflow-note flex items-start gap-[12px] p-[15px_17px] [border:1px_solid_color-mix(in_srgb,var(--teal)_18%,var(--line))] rounded-[12px] [background:color-mix(in_srgb,var(--teal)_5%,var(--surface))] [&>span]:grid [&>span]:flex-[0_0_34px] [&>span]:w-[34px] [&>span]:h-[34px] [&>span]:[place-items:center] [&>span]:rounded-[10px] [&>span]:[background:color-mix(in_srgb,var(--teal)_13%,var(--surface))] [&>span]:[color:var(--teal)] [&_p]:grid [&_p]:gap-[4px] [&_p]:m-[0] [&_strong]:text-[length:12px] [&_small]:[color:var(--muted)] [&_small]:text-[length:11px] [&_small]:leading-[1.55]"><span><MailCheck size={19}/></span><p><strong>{ui("emailWorkflowTitle")}</strong><small>{ui("emailWorkflowDescription")}</small></p></aside>

    {items.length===0?<div className="tw-management-empty p-[38px_24px] text-center [border:1px_dashed_var(--line)] rounded-[14px] [background:var(--surface)] [&_h2]:mb-[7px] [&_h2]:text-[length:17px] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px]"><h2>{t("emptyTitle")}</h2><p>{t("emptyDescription")}</p></div>:<div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{items.map(item=><article key={item.id} className="tw-management-card [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] min-w-[length:0] p-[24px] [border:1px_solid_var(--line)] rounded-[16px] [background:var(--surface)] shadow-[var(--shadow)] [@media(max-width:650px)]:p-[17px] grid min-w-0 content-start gap-4 p-4 sm:p-5">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="m-0 break-words text-sm font-bold">{t(`type_${item.type}`)}</h2><p className="mt-1 break-words text-xs text-[var(--muted)]">{item.appointment?.patient?.name??item.appointment?.patientName??"—"}</p></div>
        <span className={`tw-status-badge inline-flex p-[5px_9px] rounded-[999px] text-[length:10px] font-[750] shrink-0 ${item.status==="SENT"?"tw-is-active [@media(min-width:761px)]:[.tw-main-nav>a&]:[background:var(--mint)] [@media(min-width:761px)]:[.tw-main-nav>a&]:[color:var(--teal-dark)] [@media(min-width:761px)]:[.tw-main-nav>a&]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--teal)_14%,transparent)] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:[content:''] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:absolute [@media(min-width:761px)]:[.tw-main-nav>a&:after]:left-[50%] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:bottom-[4px] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:w-[13px] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:h-[2px] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:rounded-[2px] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:[background:var(--teal)] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:[transform:translateX(-50%)] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:flex [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:items-center [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:[color:var(--teal-dark)] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:[background:var(--mint)] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:[border-bottom-color:transparent] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:rounded-[8px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:pl-[10px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:[content:''] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:w-[3px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:self-stretch [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:rounded-[3px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:[background:var(--teal)] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:mr-[8px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:pl-[12px] [.tw-status-badge&]:[background:var(--mint)] [.tw-status-badge&]:[color:var(--teal-dark)]":item.status==="FAILED"?"tw-is-inactive [.tw-status-badge&]:[background:var(--peach)] [.tw-status-badge&]:[color:#8e573d]":""}`}>{t(`status_${item.status}`)}</span>
      </header>
      <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="col-span-2 min-w-0"><dt className="text-[var(--muted)]">{t("subject")}</dt><dd className="mt-1 break-words font-semibold">{item.subject}</dd></div>
        <div className="col-span-2 min-w-0"><dt className="text-[var(--muted)]">{t("recipient")}</dt><dd className="mt-1 break-all font-semibold">{item.recipientEmail}</dd></div>
        <div className="min-w-0"><dt className="text-[var(--muted)]">{t("doctor")}</dt><dd className="mt-1 break-words font-semibold">{item.appointment?.doctor.name??"—"}</dd></div>
        <div className="min-w-0"><dt className="text-[var(--muted)]">{t("service")}</dt><dd className="mt-1 break-words font-semibold">{item.appointment?.service.name??"—"}</dd></div>
        <div className="min-w-0"><dt className="text-[var(--muted)]">{t("appointment")}</dt><dd className="mt-1 break-words font-semibold">{item.appointment?new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(item.appointment.startAt):"—"}</dd></div>
        <div className="min-w-0"><dt className="text-[var(--muted)]">{t("created")}</dt><dd className="mt-1 break-words font-semibold">{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(item.createdAt)}</dd></div>
      </dl>
      {item.status==="FAILED"&&<p className="m-0 break-words rounded-lg bg-rose-500/5 p-3 text-xs text-rose-800">{item.providerMessage??"Delivery failed"}{item.attempts>0?<span className="mt-1 block">{t("attempts",{count:item.attempts})}</span>:null}</p>}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">{item.status==="FAILED"&&item.attempts<5?<RetryNotificationButton id={item.id}/>:item.status==="FAILED"?<span className="text-xs text-[var(--muted)]">{ui("retryLimitReached")}</span>:null}<DeleteNotificationButton id={item.id}/></div>
    </article>)}</div>}

    <nav className="tw-notification-pagination flex items-center justify-between gap-[14px] mt-[20px] [&>span]:[color:var(--muted)] [&>span]:text-[length:11px] [&>div]:flex [&>div]:gap-[8px] [@media(max-width:420px)]:items-start [@media(max-width:420px)]:flex-col" aria-label={t("pagination")}>
      <span>{t("pageSummary",{page:currentPage,totalPages})}</span>
      <div>
        {currentPage>1?<a className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" href={`?page=${currentPage-1}`}>{t("previous")}</a>:null}
        {currentPage<totalPages?<a className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" href={`?page=${currentPage+1}`}>{t("next")}</a>:null}
      </div>
    </nav>
    <section className="grid gap-4 border-t border-[var(--line)] pt-6">
      <header><h2 className="m-0 text-xl font-semibold text-[var(--text)]">{t("integrationsTitle")}</h2><p className="mb-0 mt-1 text-sm text-[var(--muted)]">{t("integrationsDescription")}</p></header>
      {!integrations.length?<p className="m-0 text-sm text-[var(--muted)]">{t("integrationsEmpty")}</p>:<div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{integrations.map(item=><article key={item.id} className="grid min-w-0 gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-2"><strong className="text-sm text-[var(--text)]">{t(`channel_${item.channel}`)} · {t(`type_${item.type}`)}</strong><span className="text-xs font-semibold text-[var(--muted)]">{t(`status_${item.status}`)}</span></div>
        <p className="m-0 break-all text-xs text-[var(--muted)]">{item.appointment.patient?.name??item.appointment.patientName} · {item.recipient}</p>
        {item.providerMessage&&<p className="m-0 break-words text-xs text-rose-700">{item.providerMessage}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3"><span className="text-xs text-[var(--muted)]">{t("attempts",{count:item.attempts})}</span>{item.status==="FAILED"&&item.attempts<5?<RetryIntegrationButton id={item.id}/>:null}</div>
      </article>)}</div>}
      {integrationTotal>limit?<nav className="flex items-center justify-between gap-3 text-xs" aria-label={t("integrationsTitle")}><span className="text-[var(--muted)]">{t("pageSummary",{page:currentIntegrationPage,totalPages:totalIntegrationPages})}</span><div className="flex gap-2">{currentIntegrationPage>1?<a className="rounded-lg border border-[var(--line)] px-3 py-2 text-[var(--text)]" href={`?page=${currentPage}&integrationPage=${currentIntegrationPage-1}`}>{t("previous")}</a>:null}{currentIntegrationPage<totalIntegrationPages?<a className="rounded-lg border border-[var(--line)] px-3 py-2 text-[var(--text)]" href={`?page=${currentPage}&integrationPage=${currentIntegrationPage+1}`}>{t("next")}</a>:null}</div></nav>:null}
    </section>
  </section>;
}
