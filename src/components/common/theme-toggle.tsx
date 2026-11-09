"use client";
import {Moon,Sun} from "lucide-react";
import {useTheme} from "@/components/providers/theme-provider";
import {useTranslations} from "next-intl";

export function ThemeToggle() {
  const {resolvedTheme, setTheme} = useTheme();
  const t = useTranslations("common");
  const isDark=resolvedTheme==="dark";
  return <button className="tw-theme-switch relative w-[58px] h-[32px] flex-[none] flex items-center justify-between p-[0_8px] [border:1px_solid_var(--line)] rounded-[999px] [background:var(--mint)] [color:var(--muted)] cursor-pointer shadow-[inset_0_1px_2px_rgba(20,50,45,.08)] [transition:background_.2s,border-color_.2s] [&:focus-visible]:[outline:2px_solid_var(--teal)] [&:focus-visible]:[outline-offset:3px] [.tw-dashboard-preferences_&]:w-[54px] [.tw-dashboard-preferences_&]:h-[30px]" type="button" role="switch" aria-label={t("theme")} aria-checked={isDark} data-theme={isDark?"dark":"light"} onClick={()=>setTheme(isDark?"light":"dark")}><Sun className="tw-theme-switch-sun relative z-[1] [transition:color_.2s] [.tw-theme-switch[data-theme='light']_&]:[color:var(--teal-dark)]" size={15}/><Moon className="tw-theme-switch-moon relative z-[1] [transition:color_.2s] [.tw-theme-switch[data-theme='dark']_&]:[color:var(--teal-dark)]" size={15}/><span className="tw-theme-switch-thumb absolute top-[3px] left-[3px] w-[24px] h-[24px] rounded-[50%] [background:var(--surface)] shadow-[0_2px_6px_rgba(18,48,44,.2)] [transition:transform_.22s_cubic-bezier(.2,.8,.2,1)] [.tw-theme-switch[data-theme='dark']_&]:[transform:translateX(26px)] [.tw-dashboard-preferences_&]:w-[22px] [.tw-dashboard-preferences_&]:h-[22px] [.tw-dashboard-preferences_.tw-theme-switch[data-theme='dark']_&]:[transform:translateX(24px)]"/></button>;
}
