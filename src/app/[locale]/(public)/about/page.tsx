import {HeartHandshake,ShieldCheck,Sparkles} from "lucide-react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

export default function AboutPage(){
  const t=useTranslations("pages.about");
  return <div className="content-page">
    <section className="page-hero"><span className="section-kicker">{t("kicker")}</span><h1>{t("title")} <em>{t("accent")}</em></h1><p>{t("lead")}</p></section>
    <section className="about-story"><div className="about-art"><HeartHandshake size={76}/><span>{t("promise")}</span></div><div><span className="section-kicker">{t("storyKicker")}</span><h2>{t("storyTitle")}</h2><p>{t("storyOne")}</p><p>{t("storyTwo")}</p></div></section>
    <section className="values-grid"><article><HeartHandshake/><h3>{t("mission")}</h3><p>{t("missionText")}</p></article><article><Sparkles/><h3>{t("vision")}</h3><p>{t("visionText")}</p></article><article><ShieldCheck/><h3>{t("promise")}</h3><p>{t("promiseText")}</p></article></section>
    <section className="page-cta"><h2>{t("ctaTitle")}</h2><Link className="button button-primary" href="/sign-in">{t("ctaButton")} ↗</Link></section>
  </div>;
}
