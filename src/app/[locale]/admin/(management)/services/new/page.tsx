import {Link} from "@/i18n/navigation";
import {getTranslations} from "next-intl/server";
import {ServiceForm} from "@/components/management/service-form";
export default async function NewServicePage(){
  const t=await getTranslations("management");
  return <section className="management-page"><Link href="/admin/services" className="back-link">← {t("backToServices")}</Link><header className="management-page-header"><div><span className="section-kicker">{t("adminDirectory")}</span><h1>{t("addService")}</h1><p>{t("serviceFormHelp")}</p></div></header><div className="management-card"><ServiceForm/></div></section>;
}
