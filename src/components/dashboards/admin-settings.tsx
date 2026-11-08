"use client";

import {useTranslations} from "next-intl";
import {toast} from "react-hot-toast";
import {useTheme} from "@/components/providers/theme-provider";
import {setAdminPreference,useAdminPreferences} from "@/lib/admin-preferences";
import type {AdminPreferences} from "@/lib/admin-preferences";

export function AdminSettings(){
  const t=useTranslations("dashboard");
  const {theme,setTheme}=useTheme();
  const preferences=useAdminPreferences();

  function save<Key extends keyof AdminPreferences>(key:Key,value:AdminPreferences[Key]){
    try{
      setAdminPreference(key,value);
      toast.success("Preference saved");
    }catch(error){
      toast.error(error instanceof Error?error.message:"Could not save this preference");
    }
  }

  return <section className="management-page">
    <header className="management-page-header"><div><span className="section-kicker">{t("admin")}</span><h1>{t("settings")}</h1><p>Personalize your admin workspace. Changes are saved automatically on this device.</p></div></header>
    <div className="grid gap-5 md:grid-cols-2">
      <article className="management-card grid content-start gap-4">
        <div><h2 className="mb-1 text-lg font-semibold">Appearance</h2><p>Choose the theme used across your workspace.</p></div>
        <label className="management-field">Color theme
          <select value={theme} onChange={event=>{const value=event.target.value;if(value==="light"||value==="dark"||value==="system"){setTheme(value);toast.success("Theme changed")}}}>
            <option value="system">Match device</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>
      </article>
      <article className="management-card grid content-start gap-4">
        <div><h2 className="mb-1 text-lg font-semibold">Appointments</h2><p>Set your default schedule view and how often the list refreshes.</p></div>
        <label className="management-field">Default schedule view
          <select value={preferences.view} onChange={event=>save("view",event.target.value as AdminPreferences["view"])}>
            <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
          </select>
        </label>
        <label className="management-field">Automatic refresh
          <select value={preferences.refresh} onChange={event=>{const value=event.target.value;save("refresh",value==="30"?30:value==="60"?60:0)}}>
            <option value="0">Off</option><option value="30">Every 30 seconds</option><option value="60">Every minute</option>
          </select>
        </label>
      </article>
      <article className="management-card grid content-start gap-4 md:col-span-2">
        <div><h2 className="mb-1 text-lg font-semibold">Data density</h2><p>Choose how much information is shown in appointment tables.</p></div>
        <div className="flex flex-wrap gap-3">
          {(["comfortable","compact"] as const).map(option=><button key={option} type="button" aria-pressed={preferences.density===option} onClick={()=>save("density",option)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition active:scale-95 ${preferences.density===option?"border-teal-700 bg-teal-700/10 text-teal-800":"border-slate-300 text-slate-600 hover:bg-slate-100"}`}>{option==="comfortable"?"Comfortable":"Compact"}</button>)}
        </div>
      </article>
    </div>
  </section>;
}
