import {ArrowRight,Sparkles} from "lucide-react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

export function DentalCareBanner(){
  const t=useTranslations("homeBanner");

  return <section className="tw-dental-banner max-w-[length:1184px] m-[0_auto_90px] p-[0_24px] [@media(max-width:760px)]:mb-[60px] [@media(max-width:760px)]:p-[0_18px]">
    <div className="relative grid grid-cols-[1fr_minmax(250px,.8fr)] items-center gap-[36px] overflow-hidden rounded-[26px] p-[clamp(26px,5vw,56px)] [background:var(--teal-dark)] [color:var(--bg)] shadow-[var(--shadow)] [&:before]:[content:''] [&:before]:absolute [&:before]:w-[280px] [&:before]:h-[280px] [&:before]:rounded-[50%] [&:before]:border [&:before]:border-[color-mix(in_srgb,var(--bg)_20%,transparent)] [&:before]:right-[35%] [&:before]:top-[-180px] [@media(max-width:760px)]:grid-cols-[1fr] [@media(max-width:760px)]:gap-[24px] [@media(max-width:760px)]:rounded-[22px]">
      <div className="relative z-[1] max-w-[length:520px]">
        <span className="inline-flex items-center gap-[8px] text-[length:10px] font-extrabold tracking-[1.5px] opacity-[.88]"><Sparkles size={15}/>{t("kicker")}</span>
        <h2 className="m-[14px_0] text-[length:clamp(29px,4vw,43px)] leading-[1.12] tracking-[-1.6px]">{t("title")}</h2>
        <p className="mb-[24px] max-w-[length:450px] text-[length:14px] leading-[1.75] opacity-[.82]">{t("text")}</p>
        <Link className="inline-flex min-h-[48px] items-center justify-center gap-[10px] rounded-[10px] p-[12px_17px] [background:var(--surface)] [color:var(--text)] text-[length:12px] font-bold transition-transform duration-200 hover:-translate-y-[2px]" href="/appointment">{t("action")}<ArrowRight size={16}/></Link>
      </div>
      <div className="relative min-h-[245px] overflow-hidden rounded-[18px] [border:1px_solid_color-mix(in_srgb,var(--bg)_28%,transparent)] [@media(max-width:760px)]:min-h-[205px]">
        <Image src="/hero.jpeg" alt="" fill sizes="(max-width: 760px) 90vw, 36vw" className="object-cover"/>
      </div>
    </div>
  </section>;
}
