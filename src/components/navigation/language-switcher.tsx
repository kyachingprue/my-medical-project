"use client";
import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const path = usePathname();
  return <label className="tw-language-picker [&_select]:[border:0] [&_select]:[background:transparent] [&_select]:[color:var(--text)] [&_select]:text-[length:11px] [&_select]:font-bold [&_select]:[outline:none] [&_select]:cursor-pointer [&_option]:[color:#19302e] [@media(max-width:760px)]:[.tw-nav-actions>&]:hidden [.tw-dashboard-preferences_&_select]:min-h-[34px] [.tw-dashboard-preferences_&_select]:p-[0_5px]"><span className="tw-sr-only absolute w-[1px] h-[1px] p-[0] m-[-1px] overflow-hidden [clip:rect(0,0,0,0)] whitespace-nowrap [border:0]">{t("language")}</span><select aria-label={t("language")} value={locale} onChange={(e) => router.replace(path, {locale: e.target.value})}><option value="en">EN</option><option value="bn">বাংলা</option></select></label>;
}
