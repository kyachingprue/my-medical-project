"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {serviceSchema} from "@/lib/management/schemas";
import type {z} from "zod";
import {ManagementField} from "./doctor-form";

type Values=z.input<typeof serviceSchema>;
type ServiceValues=Values&{id?:string};
export function ServiceForm({initial}:{initial?:ServiceValues}){
  const t=useTranslations("management");
  const router=useRouter();
  const [error,setError]=useState("");
  const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<Values>({
    resolver:zodResolver(serviceSchema),
    defaultValues:initial??{name:"",slug:"",description:"",durationMinutes:20,price:0,image:"",isActive:true},
  });
  async function submit(values:Values){
    setError("");
    try{
      const response=await fetch(initial?.id?`/api/services/${initial.id}`:"/api/services",{method:initial?.id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const payload=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(payload.error?.message??t("saveFailed"));
      router.push("/admin/services");
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:t("saveFailed"))}
  }
  return <form className="tw-management-form grid gap-[18px]" onSubmit={handleSubmit(submit)}>
    <div className="tw-management-form-grid grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[16px] [@media(max-width:650px)]:grid-cols-[1fr]">
      <ManagementField label={t("serviceName")} error={errors.name?.message}><input {...register("name")}/></ManagementField>
      <ManagementField label={t("slug")} error={errors.slug?.message}><input {...register("slug")}/></ManagementField>
      <ManagementField label={t("durationMinutes")} error={errors.durationMinutes?.message}><input type="number" min="5" max="480" {...register("durationMinutes",{valueAsNumber:true})}/></ManagementField>
      <ManagementField label={t("price")} error={errors.price?.message}><input type="number" min="0" step="0.01" {...register("price",{valueAsNumber:true})}/></ManagementField>
      <ManagementField label={t("image")} error={errors.image?.message}><input type="url" {...register("image")}/></ManagementField>
      <ManagementField label={t("description")} error={errors.description?.message} full><textarea rows={5} {...register("description")}/></ManagementField>
    </div>
    {initial?.id&&<label className="tw-management-checkbox flex items-center gap-[8px] [color:var(--muted)] text-[length:12px] [&_input]:[accent-color:var(--teal)]"><input type="checkbox" {...register("isActive")}/>{t("active")}</label>}
    {error&&<p className="tw-management-error m-[0] [color:#b43e37] text-[length:12px]" role="alert">{error}</p>}
    <button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" disabled={isSubmitting}>{isSubmitting?t("saving"):t("save")}</button>
  </form>;
}
