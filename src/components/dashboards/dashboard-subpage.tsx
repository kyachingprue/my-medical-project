import {ArrowLeft,Sparkles} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
export function DashboardSubpage({title}:{title:string}){const t=useTranslations("dashboard");return <section className="dashboard-subpage"><Link href="/dashboard" className="back-link"><ArrowLeft size={15}/>{t("overview")}</Link><span className="empty-page-icon"><Sparkles size={26}/></span><span className="section-kicker">{t("space")}</span><h1>{title}</h1><p>{t("emptyText")}</p></section>}
