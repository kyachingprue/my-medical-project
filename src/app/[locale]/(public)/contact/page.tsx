import {Clock3,Mail,MapPin,Phone} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

export default function ContactPage(){
  const t=useTranslations("pages.contact");
  return <div className="content-page">
    <section className="page-hero"><span className="section-kicker">{t("kicker")}</span><h1>{t("title")} <em>{t("accent")}</em></h1><p>{t("lead")}</p></section>
    <section className="contact-grid"><div className="contact-info">
      <div className="contact-item"><span><MapPin/></span><div><h2>{t("findUs")}</h2><p>Smile Care Dental Clinic<br/>Gulshan Avenue, Dhaka, Bangladesh</p></div></div>
      <div className="contact-item"><span><Phone/></span><div><h2>{t("phone")}</h2><a href="tel:+8801700000000">+880 1700-000000</a></div></div>
      <div className="contact-item"><span><Mail/></span><div><h2>{t("email")}</h2><a href="mailto:hello@smilecraft.example">hello@smilecraft.example</a></div></div>
      <div className="contact-item"><span><Clock3/></span><div><h2>{t("hours")}</h2><p>{t("days")}<br/>{t("closed")}</p></div></div>
      <p className="data-note">{t("dataNote")}</p>
    </div><div className="contact-card"><span className="section-kicker">{t("ctaKicker")}</span><h2>{t("ctaTitle")}</h2><p>{t("ctaText")}</p><Link className="button button-primary" href="/appointment">{t("ctaButton")} ↗</Link><div className="contact-card-note">{t("urgent")}</div><div className="contact-card-decoration">✳</div></div></section>
  </div>;
}
