"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {BellRing,CalendarClock,Check,Globe2,Monitor,Save} from "lucide-react";
import {useTranslations} from "next-intl";
import {toast} from "react-hot-toast";
import {ThemeToggle} from "@/components/common/theme-toggle";
import {DashboardSignOutButton} from "@/components/auth/dashboard-sign-out-button";
import {useTheme} from "@/components/providers/theme-provider";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";
import {clinicWeekdays,type ClinicSettingsInput} from "@/lib/management/clinic-settings";

type Props={initialSettings:ClinicSettingsInput;locale:string};
type ApiResult={error?:{code?:string;details?:unknown};data?:ClinicSettingsInput};

const cardClass="grid content-start gap-[17px] min-w-[length:0] rounded-[16px] [border:1px_solid_var(--line)] [background:var(--surface)] p-[21px] shadow-[var(--shadow)] [@media(max-width:520px)]:p-[16px]";
const fieldClass="grid min-w-0 gap-[7px] text-[11px] font-semibold [color:var(--text)] [&_input]:min-h-[42px] [&_input]:min-w-0 [&_input]:rounded-[8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:[background:var(--bg)] [&_input]:px-[10px] [&_input]:[color:var(--text)] [&_input]:outline-none [&_input:focus]:[border-color:var(--teal)] [&_textarea]:min-h-[96px] [&_textarea]:resize-y [&_textarea]:rounded-[8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:[background:var(--bg)] [&_textarea]:p-[10px] [&_textarea]:[color:var(--text)] [&_textarea]:outline-none [&_textarea:focus]:[border-color:var(--teal)]";

export function ReceptionistSettings({initialSettings,locale}:Props){
  const t=useTranslations("clinicSettings");
  const dashboard=useTranslations("dashboard");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const {theme,setTheme}=useTheme();
  const [settings,setSettings]=useState(initialSettings);
  const [saving,setSaving]=useState(false);
  const isBangla=locale==="bn";
  const weekdayFormat=new Intl.DateTimeFormat(isBangla?"bn-BD":"en-US",{weekday:"long",timeZone:"Asia/Dhaka"});
  const weekdays=clinicWeekdays.map((day,index)=>({
    day,
    label:weekdayFormat.format(new Date(Date.UTC(2026,0,4+index,12))),
  }));

  function updateHours(day:ClinicSettingsInput["businessHours"][number]["dayOfWeek"],changes:Partial<ClinicSettingsInput["businessHours"][number]>){
    setSettings(current=>({...current,businessHours:current.businessHours.map(entry=>entry.dayOfWeek===day?{...entry,...changes}:entry)}));
  }

  async function save(){
    setSaving(true);
    const loadingToast=toast.loading(feedback("processing"));
    try{
      const response=await fetch("/api/receptionist/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});
      const body=await response.json() as ApiResult;
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,body.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:t("saveFailed"),
        }));
        return;
      }
      if(!body.data)throw new Error("The settings response was missing saved data.");
      setSettings(body.data);
      toast.success(feedback("changesSaved"));
      router.refresh();
    }catch(error){
      console.error("Could not save receptionist website settings:",error);
      toast.error(t("saveFailed"));
    }finally{
      toast.dismiss(loadingToast);
      setSaving(false);
    }
  }

  return <section className="mx-auto grid w-full max-w-[1080px] gap-[20px]">
    <header className="flex flex-wrap items-end justify-between gap-[14px]">
      <div>
        <span className="inline-flex items-center gap-[7px] text-[10px] font-extrabold tracking-[1.4px] [color:var(--teal)]"><Globe2 size={14}/>{t("kicker")}</span>
        <h1 className="mb-[6px] mt-[8px] text-[clamp(25px,4vw,36px)] font-semibold tracking-[-1px] [color:var(--text)]">{dashboard("settings")}</h1>
        <p className="m-0 max-w-[620px] text-[13px] leading-[1.65] [color:var(--muted)]">{t("description")}</p>
      </div>
      <button type="button" onClick={()=>void save()} disabled={saving} className="inline-flex min-h-[44px] w-full items-center justify-center gap-[8px] rounded-[10px] [background:var(--teal)] px-[16px] text-[12px] font-bold text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--teal)_22%,transparent)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
        {saving?<span className="h-[15px] w-[15px] animate-spin rounded-full [border:2px_solid_rgba(255,255,255,.4)] [border-top-color:white]"/>:<Save size={15}/>}
        {saving?t("saving"):t("save")}
      </button>
    </header>

    <div className="grid gap-[15px] lg:grid-cols-2">
      <article className={cardClass}>
        <div className="flex items-start gap-[11px]">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] [background:var(--mint)] [color:var(--teal)]"><CalendarClock size={18}/></span>
          <div><h2 className="m-0 text-[15px] font-semibold [color:var(--text)]">{t("bookingTitle")}</h2><p className="mb-0 mt-[5px] text-[12px] leading-[1.55] [color:var(--muted)]">{t("bookingDescription")}</p></div>
        </div>
        <SettingSwitch checked={settings.bookingEnabled} onChange={checked=>setSettings(current=>({...current,bookingEnabled:checked}))} label={t("bookingEnabled")} detail={settings.bookingEnabled?t("bookingOn"):t("bookingOff")}/>
      </article>

      <article className={cardClass}>
        <div className="flex items-start gap-[11px]">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] [background:var(--mint)] [color:var(--teal)]"><BellRing size={18}/></span>
          <div><h2 className="m-0 text-[15px] font-semibold [color:var(--text)]">{t("announcementTitle")}</h2><p className="mb-0 mt-[5px] text-[12px] leading-[1.55] [color:var(--muted)]">{t("announcementDescription")}</p></div>
        </div>
        <SettingSwitch checked={settings.announcementEnabled} onChange={checked=>setSettings(current=>({...current,announcementEnabled:checked}))} label={t("announcementEnabled")} detail={settings.announcementEnabled?t("announcementVisible"):t("announcementHidden")}/>
        <label className={fieldClass}>{t("announcementText")}
          <textarea maxLength={500} value={settings.announcement} onChange={event=>setSettings(current=>({...current,announcement:event.target.value}))} placeholder={t("announcementPlaceholder")} aria-describedby="announcement-count"/>
          <span id="announcement-count" className="text-right text-[10px] font-normal [color:var(--muted)]">{settings.announcement.length}/500</span>
        </label>
      </article>
    </div>

    <article className={cardClass}>
      <div className="flex items-start gap-[11px]">
        <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] [background:var(--mint)] [color:var(--teal)]"><CalendarClock size={18}/></span>
        <div><h2 className="m-0 text-[15px] font-semibold [color:var(--text)]">{t("hoursTitle")}</h2><p className="mb-0 mt-[5px] text-[12px] leading-[1.55] [color:var(--muted)]">{t("hoursDescription")}</p></div>
      </div>
      <div className="grid gap-[9px] md:grid-cols-2">
        {weekdays.map(({day,label})=>{
          const hours=settings.businessHours.find(entry=>entry.dayOfWeek===day);
          if(!hours)return null;
          return <section key={day} className="grid gap-[12px] rounded-[12px] [border:1px_solid_var(--line)] p-[13px] [@media(max-width:520px)]:p-[11px]">
            <div className="flex items-center justify-between gap-[10px]">
              <h3 className="m-0 text-[12px] font-semibold [color:var(--text)]">{label}</h3>
              <label className="inline-flex min-h-[32px] cursor-pointer items-center gap-[7px] text-[10px] font-medium [color:var(--muted)]">
                <input type="checkbox" checked={hours.isOpen} onChange={event=>updateHours(day,{isOpen:event.target.checked})} className="h-[15px] w-[15px] accent-[var(--teal)]"/>
                {hours.isOpen?t("open"):t("closed")}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-[9px]">
              <label className={fieldClass}>{t("opens")}
                <input type="time" value={hours.startTime} disabled={!hours.isOpen} onChange={event=>updateHours(day,{startTime:event.target.value})}/>
              </label>
              <label className={fieldClass}>{t("closes")}
                <input type="time" value={hours.endTime} disabled={!hours.isOpen} onChange={event=>updateHours(day,{endTime:event.target.value})}/>
              </label>
              <label className={fieldClass}>{t("breakStarts")}
                <input type="time" value={hours.breakStart??""} disabled={!hours.isOpen} onChange={event=>updateHours(day,{breakStart:event.target.value||null})}/>
              </label>
              <label className={fieldClass}>{t("breakEnds")}
                <input type="time" value={hours.breakEnd??""} disabled={!hours.isOpen} onChange={event=>updateHours(day,{breakEnd:event.target.value||null})}/>
              </label>
            </div>
          </section>;
        })}
      </div>
      <p className="m-0 text-[11px] [color:var(--muted)]">{t("timezoneNote")}</p>
    </article>

    <div className="grid gap-[15px] sm:grid-cols-2">
      <article className={cardClass}>
        <div className="flex items-start gap-[11px]">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] [background:var(--mint)] [color:var(--teal)]"><Monitor size={18}/></span>
          <div><h2 className="m-0 text-[15px] font-semibold [color:var(--text)]">{t("appearanceTitle")}</h2><p className="mb-0 mt-[5px] text-[12px] leading-[1.55] [color:var(--muted)]">{t("appearanceDescription")}</p></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-[11px] [background:var(--bg)] p-[12px]">
          <span className="text-[11px] font-semibold [color:var(--text)]">{t("themeLabel")}</span>
          <div className="flex items-center gap-[10px]"><span className="text-[10px] [color:var(--muted)]">{t(theme==="system"?"themeSystem":theme==="dark"?"themeDark":"themeLight")}</span><ThemeToggle/></div>
        </div>
        <button type="button" onClick={()=>setTheme("system")} aria-pressed={theme==="system"} className="inline-flex min-h-[39px] items-center justify-center gap-[7px] rounded-[9px] [border:1px_solid_var(--line)] [background:var(--surface)] px-[12px] text-[11px] font-semibold [color:var(--text)] hover:[border-color:var(--teal)]">
          {theme==="system"?<Check size={14}/>:null}{t("useSystemTheme")}
        </button>
      </article>
      <article className={cardClass}>
        <div className="flex items-start gap-[11px]">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] [background:var(--mint)] [color:var(--teal)]"><Globe2 size={18}/></span>
          <div><h2 className="m-0 text-[15px] font-semibold [color:var(--text)]">{t("accountTitle")}</h2><p className="mb-0 mt-[5px] text-[12px] leading-[1.55] [color:var(--muted)]">{t("accountDescription")}</p></div>
        </div>
        <DashboardSignOutButton/>
      </article>
    </div>
  </section>;
}

function SettingSwitch({checked,onChange,label,detail}:{checked:boolean;onChange:(checked:boolean)=>void;label:string;detail:string}){
  return <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-[11px] [background:var(--bg)] p-[12px]">
    <span><span className="block text-[11px] font-semibold [color:var(--text)]">{label}</span><span className="mt-[3px] block text-[10px] [color:var(--muted)]">{detail}</span></span>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={()=>onChange(!checked)} className={`relative h-[28px] w-[49px] shrink-0 rounded-full [border:1px_solid_var(--line)] p-[3px] transition-colors focus-visible:[outline:2px_solid_var(--teal)] focus-visible:[outline-offset:2px] ${checked?"[background:var(--teal)]":"[background:var(--surface)]"}`}>
      <span className={`block h-[20px] w-[20px] rounded-full [background:white] shadow-[0_1px_4px_rgba(0,0,0,.2)] transition-transform ${checked?"translate-x-[20px]":"translate-x-0"}`}/>
    </button>
  </div>;
}
