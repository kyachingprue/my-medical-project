"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";

type ServiceOption={id:string;name:string};
export function DoctorServiceAssignment({doctorId,services,selectedIds}:{doctorId:string;services:ServiceOption[];selectedIds:string[]}){
  const t=useTranslations("management");
  const router=useRouter();
  const [selected,setSelected]=useState(selectedIds);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function save(){
    setBusy(true);setMessage("");
    try{
      const response=await fetch(`/api/doctors/${doctorId}/services`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceIds:selected})});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??t("saveFailed"));
      setMessage(t("saved"));
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:t("saveFailed"))}
    finally{setBusy(false)}
  }
  return <section className="tw-management-card [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] min-w-[length:0] p-[24px] [border:1px_solid_var(--line)] rounded-[16px] [background:var(--surface)] shadow-[var(--shadow)] [@media(max-width:650px)]:p-[17px]"><div className="tw-management-card-heading flex items-center justify-between gap-[18px] mb-[16px]"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("doctorServices")}</span><p>{t("doctorServicesHelp")}</p></div><button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" type="button" disabled={busy} onClick={save}>{busy?t("saving"):t("save")}</button></div><div className="tw-service-check-list [&_label]:flex [&_label]:items-center [&_label]:gap-[8px] [&_label]:[color:var(--muted)] [&_label]:text-[length:12px] [&_input]:[accent-color:var(--teal)] grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[12px] [@media(max-width:650px)]:grid-cols-[repeat(2,minmax(0,1fr))]">{services.map(service=><label key={service.id}><input type="checkbox" checked={selected.includes(service.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,service.id]:current.filter(id=>id!==service.id))}/>{service.name}</label>)}</div>{message&&<p className="tw-management-message m-[12px_0_0] [color:var(--teal)] text-[length:12px]" role="status">{message}</p>}</section>;
}
