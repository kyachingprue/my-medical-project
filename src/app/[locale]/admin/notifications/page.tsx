import {connection} from "next/server";
import {AlertCircle,CheckCircle2,Clock3,Mail,MailCheck} from "lucide-react";
import {prisma} from "@/lib/prisma";
import {requireRole} from "@/lib/auth/authorize";
import {RetryNotificationButton} from "@/components/management/retry-notification-button";
import {DeleteNotificationButton} from "@/components/management/delete-notification-button";
import {getTranslations} from "next-intl/server";

export const instant=false;

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{page?: string}>;
};

export default async function AdminNotificationsPage({params,searchParams}:Props) {
  const {locale}=await params;
  await requireRole("ADMIN",locale);
  await connection();
  const t=await getTranslations("notificationUi");
  const ui=await getTranslations("notificationEnhancement");
  const requestedPage=Number((await searchParams).page);
  const page=Number.isInteger(requestedPage)&&requestedPage>0?requestedPage:1;
  const limit=20;
  const [total,pending,sent,failed]=await Promise.all([
    prisma.notificationLog.count(),
    prisma.notificationLog.count({where:{status:"PENDING"}}),
    prisma.notificationLog.count({where:{status:"SENT"}}),
    prisma.notificationLog.count({where:{status:"FAILED"}}),
  ]);
  const totalPages=Math.max(1,Math.ceil(total/limit));
  const currentPage=Math.min(page,totalPages);
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

  return <section className="management-page">
    <header className="management-page-header notification-page-header">
      <div>
        <span className="section-kicker">{t("operations")}</span>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </div>
    </header>

    <div className="notification-summary">
      <article className="notification-metric"><span className="notification-metric-icon"><Mail size={18}/></span><span className="notification-metric-label">{t("total")}</span><strong>{total}</strong><small>{ui("totalHint")}</small></article>
      <article className="notification-metric is-pending"><span className="notification-metric-icon"><Clock3 size={18}/></span><span className="notification-metric-label">{t("pending")}</span><strong>{pending}</strong><small>{ui("pendingHint")}</small></article>
      <article className="notification-metric is-sent"><span className="notification-metric-icon"><CheckCircle2 size={18}/></span><span className="notification-metric-label">{t("sent")}</span><strong>{sent}</strong><small>{ui("sentHint")}</small></article>
      <article className="notification-metric is-failed"><span className="notification-metric-icon"><AlertCircle size={18}/></span><span className="notification-metric-label">{t("failed")}</span><strong>{failed}</strong><small>{ui("failedHint")}</small></article>
    </div>
    <aside className="notification-workflow-note"><span><MailCheck size={19}/></span><p><strong>{ui("emailWorkflowTitle")}</strong><small>{ui("emailWorkflowDescription")}</small></p></aside>

    {items.length===0?<div className="management-empty"><h2>{t("emptyTitle")}</h2><p>{t("emptyDescription")}</p></div>:<div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{items.map(item=><article key={item.id} className="management-card grid min-w-0 content-start gap-4 p-4 sm:p-5">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="m-0 break-words text-sm font-bold">{t(`type_${item.type}`)}</h2><p className="mt-1 break-words text-xs text-[var(--muted)]">{item.appointment?.patient?.name??item.appointment?.patientName??"—"}</p></div>
        <span className={`status-badge shrink-0 ${item.status==="SENT"?"is-active":item.status==="FAILED"?"is-inactive":""}`}>{t(`status_${item.status}`)}</span>
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

    <nav className="notification-pagination" aria-label={t("pagination")}>
      <span>{t("pageSummary",{page:currentPage,totalPages})}</span>
      <div>
        {currentPage>1?<a className="button button-outline" href={`?page=${currentPage-1}`}>{t("previous")}</a>:null}
        {currentPage<totalPages?<a className="button button-outline" href={`?page=${currentPage+1}`}>{t("next")}</a>:null}
      </div>
    </nav>
  </section>;
}
