"use client";

import {useTranslations} from "next-intl";
import {toast} from "react-hot-toast";
import {useTheme} from "@/components/providers/theme-provider";
import {setAdminPreference,useAdminPreferences} from "@/lib/admin-preferences";
import type {AdminPreferences} from "@/lib/admin-preferences";

export function AdminSettings(){
  const t=useTranslations("dashboard");
  const feedback=useTranslations("feedback");
  const {theme,setTheme}=useTheme();
  const preferences=useAdminPreferences();

  function save<Key extends keyof AdminPreferences>(key:Key,value:AdminPreferences[Key]){
    try{
      setAdminPreference(key,value);
      toast.success(feedback("changesSaved"));
    }catch{
      toast.error(feedback("serverError"));
    }
  }

  return <section className="tw-management-page grid gap-[22px] max-w-[length:1180px] m-[0_auto]">
    <header className="tw-management-page-header flex items-end justify-between gap-[20px] [&_h1]:m-[8px_0] [&_h1]:text-[length:clamp(28px,4vw,40px)] [&_h1]:tracking-[-1.6px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("admin")}</span><h1>{t("settings")}</h1><p>Personalize your admin workspace. Changes are saved automatically on this device.</p></div></header>
    <div className="grid gap-5 md:grid-cols-2">
      <article className="tw-management-card [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] min-w-[length:0] p-[24px] [border:1px_solid_var(--line)] rounded-[16px] [background:var(--surface)] shadow-[var(--shadow)] [@media(max-width:650px)]:p-[17px] grid content-start gap-4">
        <div><h2 className="mb-1 text-lg font-semibold">Appearance</h2><p>Choose the theme used across your workspace.</p></div>
        <label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]">Color theme
          <select value={theme} onChange={event=>{const value=event.target.value;if(value==="light"||value==="dark"||value==="system"){setTheme(value);toast.success("Theme changed")}}}>
            <option value="system">Match device</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>
      </article>
      <article className="tw-management-card [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] min-w-[length:0] p-[24px] [border:1px_solid_var(--line)] rounded-[16px] [background:var(--surface)] shadow-[var(--shadow)] [@media(max-width:650px)]:p-[17px] grid content-start gap-4">
        <div><h2 className="mb-1 text-lg font-semibold">Appointments</h2><p>Set your default schedule view and how often the list refreshes.</p></div>
        <label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]">Default schedule view
          <select value={preferences.view} onChange={event=>save("view",event.target.value as AdminPreferences["view"])}>
            <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
          </select>
        </label>
        <label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]">Automatic refresh
          <select value={preferences.refresh} onChange={event=>{const value=event.target.value;save("refresh",value==="30"?30:value==="60"?60:0)}}>
            <option value="0">Off</option><option value="30">Every 30 seconds</option><option value="60">Every minute</option>
          </select>
        </label>
      </article>
      <article className="tw-management-card [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] min-w-[length:0] p-[24px] [border:1px_solid_var(--line)] rounded-[16px] [background:var(--surface)] shadow-[var(--shadow)] [@media(max-width:650px)]:p-[17px] grid content-start gap-4 md:col-span-2">
        <div><h2 className="mb-1 text-lg font-semibold">Data density</h2><p>Choose how much information is shown in appointment tables.</p></div>
        <div className="flex flex-wrap gap-3">
          {(["comfortable","compact"] as const).map(option=><button key={option} type="button" aria-pressed={preferences.density===option} onClick={()=>save("density",option)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition active:scale-95 ${preferences.density===option?"border-teal-700 bg-teal-700/10 text-teal-800":"border-slate-300 text-slate-600 hover:bg-slate-100"}`}>{option==="comfortable"?"Comfortable":"Compact"}</button>)}
        </div>
      </article>
    </div>
  </section>;
}
