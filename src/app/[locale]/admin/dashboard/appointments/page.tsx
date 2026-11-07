import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {ReceptionWorkspace} from "@/components/appointments/reception-workspace";

export default async function AdminAppointmentsPage(){
  await connection();
  const t=await getTranslations("appointments");
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("adminAppointments")}</span><h1>{t("appointments")}</h1><p>{t("adminIntroduction")}</p></div></header><ReceptionWorkspace role="admin"/></section>;
}
