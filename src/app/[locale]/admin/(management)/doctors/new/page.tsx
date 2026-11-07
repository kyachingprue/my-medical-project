import {Link} from "@/i18n/navigation";
import {getTranslations} from "next-intl/server";
import {DoctorForm} from "@/components/management/doctor-form";
export default async function NewDoctorPage(){
  const t=await getTranslations("management");
  return <section className="management-page"><Link href="/admin/doctors" className="back-link">← {t("backToDoctors")}</Link><header className="management-page-header"><div><span className="section-kicker">{t("adminDirectory")}</span><h1>{t("addDoctor")}</h1><p>{t("doctorFormHelp")}</p></div></header><div className="management-card"><DoctorForm/></div></section>;
}
