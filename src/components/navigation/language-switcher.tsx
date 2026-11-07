"use client";
import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const path = usePathname();
  return <label className="language-picker"><span className="sr-only">{t("language")}</span><select aria-label={t("language")} value={locale} onChange={(e) => router.replace(path, {locale: e.target.value})}><option value="en">EN</option><option value="bn">বাংলা</option></select></label>;
}
