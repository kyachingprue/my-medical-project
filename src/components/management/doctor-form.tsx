"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import type {ReactNode} from "react";
import {useForm} from "react-hook-form";
import {toast} from "react-hot-toast";
import {doctorSchema} from "@/lib/management/schemas";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";
import type {z} from "zod";

type Values=z.input<typeof doctorSchema>;
type DoctorValues=Values&{id?:string};
export function DoctorForm({initial}:{initial?:DoctorValues}){
  const t=useTranslations("management");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<Values>({
    resolver:zodResolver(doctorSchema),
    defaultValues:initial??{name:"",email:"",phone:"",profileImage:"",specialization:"",qualification:"",experienceYears:0,bio:"",isActive:true},
  });
  async function submit(values:Values){
    const loadingToast=toast.loading(feedback("processing"));
    try{
      const response=await fetch(initial?.id?`/api/doctors/${initial.id}`:"/api/doctors",{method:initial?.id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const payload=await response.json() as {error?:{code?:string};data?:{id:string}};
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,payload.error?.code,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:t("saveFailed"),
        }));
        return;
      }
      toast.success(feedback(initial?.id?"doctorUpdated":"doctorCreated"));
      router.push("/admin/doctors");
      router.refresh();
    }catch{toast.error(feedback("serverError"))}
    finally{toast.dismiss(loadingToast)}
  }
  return <form className="tw-management-form grid gap-[18px]" onSubmit={handleSubmit(submit)}>
    <div className="tw-management-form-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[16px] [@media(max-width:650px)]:grid-cols-[1fr]">
      <ManagementField label={t("doctorName")} error={errors.name?.message}><input {...register("name")}/></ManagementField>
      <ManagementField label={t("email")} error={errors.email?.message}><input type="email" {...register("email")}/></ManagementField>
      <ManagementField label={t("phone")} error={errors.phone?.message}><input type="tel" {...register("phone")}/></ManagementField>
      <ManagementField label={t("specialization")} error={errors.specialization?.message}><input {...register("specialization")}/></ManagementField>
      <ManagementField label={t("qualification")} error={errors.qualification?.message}><input {...register("qualification")}/></ManagementField>
      <ManagementField label={t("experienceYears")} error={errors.experienceYears?.message}><input type="number" min="0" max="70" {...register("experienceYears",{valueAsNumber:true})}/></ManagementField>
      <ManagementField label={t("profileImage")} error={errors.profileImage?.message}><input type="url" {...register("profileImage")}/></ManagementField>
      <ManagementField label={t("biography")} error={errors.bio?.message} full><textarea rows={5} {...register("bio")}/></ManagementField>
    </div>
    {initial?.id&&<label className="tw-management-checkbox flex items-center gap-[8px] [color:var(--muted)] text-[length:12px] [&_input]:[accent-color:var(--teal)]"><input type="checkbox" {...register("isActive")}/>{t("active")}</label>}
    <button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" disabled={isSubmitting}>{isSubmitting?t("saving"):t("save")}</button>
  </form>;
}

export function ManagementField({label,error,full,children}:{label:string;error?:string;full?:boolean;children:ReactNode}){
  return <label className={`tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px] ${full?"tw-is-full [.tw-management-field&]:col-[1/-1] [@media(max-width:650px)]:[.tw-management-field&]:col-[auto]":""}`}><span>{label}</span>{children}{error&&<small role="alert">{error}</small>}</label>;
}
