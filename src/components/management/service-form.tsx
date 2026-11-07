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
  return <form className="management-form" onSubmit={handleSubmit(submit)}>
    <div className="management-form-grid">
      <ManagementField label={t("serviceName")} error={errors.name?.message}><input {...register("name")}/></ManagementField>
      <ManagementField label={t("slug")} error={errors.slug?.message}><input {...register("slug")}/></ManagementField>
      <ManagementField label={t("durationMinutes")} error={errors.durationMinutes?.message}><input type="number" min="5" max="480" {...register("durationMinutes",{valueAsNumber:true})}/></ManagementField>
      <ManagementField label={t("price")} error={errors.price?.message}><input type="number" min="0" step="0.01" {...register("price",{valueAsNumber:true})}/></ManagementField>
      <ManagementField label={t("image")} error={errors.image?.message}><input type="url" {...register("image")}/></ManagementField>
      <ManagementField label={t("description")} error={errors.description?.message} full><textarea rows={5} {...register("description")}/></ManagementField>
    </div>
    {initial?.id&&<label className="management-checkbox"><input type="checkbox" {...register("isActive")}/>{t("active")}</label>}
    {error&&<p className="management-error" role="alert">{error}</p>}
    <button className="button button-primary" disabled={isSubmitting}>{isSubmitting?t("saving"):t("save")}</button>
  </form>;
}
