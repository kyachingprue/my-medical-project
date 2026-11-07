import {connection} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireRole} from "@/lib/auth/authorize";
import {RetryNotificationButton} from "@/components/management/retry-notification-button";
import {DeleteNotificationButton} from "@/components/management/delete-notification-button";
import {getTranslations} from "next-intl/server";

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{page?: string}>;
};

export default async function AdminNotificationsPage({params,searchParams}:Props) {
  const {locale}=await params;
  await requireRole("ADMIN",locale);
  await connection();
  const t=await getTranslations("notificationUi");
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
    include:{
      appointment:{select:{
        id:true,
        patientName:true,
        patient:{select:{name:true}},
        doctor:{select:{name:true}},
        service:{select:{name:true}},
        startAt:true,
      }},
    },
  });

  return <section className="management-page">
    <header className="management-page-header">
      <div>
        <span className="section-kicker">{t("operations")}</span>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </div>
    </header>

    <div className="notification-summary">
      <article className="dashboard-card"><div className="stat-label">{t("total")}</div><div className="stat-value">{total}</div></article>
      <article className="dashboard-card"><div className="stat-label">{t("pending")}</div><div className="stat-value">{pending}</div></article>
      <article className="dashboard-card"><div className="stat-label">{t("sent")}</div><div className="stat-value">{sent}</div></article>
      <article className="dashboard-card"><div className="stat-label">{t("failed")}</div><div className="stat-value">{failed}</div></article>
    </div>

    {items.length===0?<div className="management-empty"><h2>{t("emptyTitle")}</h2><p>{t("emptyDescription")}</p></div>:<div className="management-table-wrap"><table className="management-table notification-table"><thead><tr>
      <th>{t("type")}</th><th>{t("patient")}</th><th>{t("doctor")}</th><th>{t("service")}</th><th>{t("appointment")}</th><th>{t("recipient")}</th><th>{t("status")}</th><th>{t("subject")}</th><th>{t("created")}</th><th>{t("deliveryDetails")}</th><th>{t("actions")}</th>
    </tr></thead><tbody>{items.map(item=><tr key={item.id}>
      <td>{t(`type_${item.type}`)}</td>
      <td>{item.appointment?.patient?.name??item.appointment?.patientName??"—"}</td>
      <td>{item.appointment?.doctor.name??"—"}</td>
      <td>{item.appointment?.service.name??"—"}</td>
      <td>{item.appointment?new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(item.appointment.startAt):"—"}</td>
      <td>{item.recipientEmail}</td>
      <td><span className={`status-badge ${item.status==="SENT"?"is-active":item.status==="FAILED"?"is-inactive":""}`}>{t(`status_${item.status}`)}</span></td>
      <td>{item.subject}</td>
      <td>{new Intl.DateTimeFormat(undefined,{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(item.createdAt)}</td>
      <td>{item.providerMessage??"—"}{item.attempts>0?<small>{t("attempts",{count:item.attempts})}</small>:null}</td>
      <td><div className="notification-row-actions">{item.status==="FAILED"?<RetryNotificationButton id={item.id}/>:null}<DeleteNotificationButton id={item.id}/></div></td>
    </tr>)}</tbody></table></div>}

    <nav className="notification-pagination" aria-label={t("pagination")}>
      <span>{t("pageSummary",{page:currentPage,totalPages})}</span>
      <div>
        {currentPage>1?<a className="button button-outline" href={`?page=${currentPage-1}`}>{t("previous")}</a>:null}
        {currentPage<totalPages?<a className="button button-outline" href={`?page=${currentPage+1}`}>{t("next")}</a>:null}
      </div>
    </nav>
  </section>;
}
