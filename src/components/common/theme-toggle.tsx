"use client";
import {Moon,Sun} from "lucide-react";
import {useTheme} from "@/components/providers/theme-provider";
import {useTranslations} from "next-intl";

export function ThemeToggle() {
  const {resolvedTheme, setTheme} = useTheme();
  const t = useTranslations("common");
  const isDark=resolvedTheme==="dark";
  return <button className="theme-switch" type="button" role="switch" aria-label={t("theme")} aria-checked={isDark} data-theme={isDark?"dark":"light"} onClick={()=>setTheme(isDark?"light":"dark")}><Sun className="theme-switch-sun" size={15}/><Moon className="theme-switch-moon" size={15}/><span className="theme-switch-thumb"/></button>;
}
