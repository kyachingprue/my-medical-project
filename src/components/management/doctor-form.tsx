"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useState} from "react";
import type {ReactNode} from "react";
import {useForm} from "react-hook-form";
import {doctorSchema} from "@/lib/management/schemas";
import type {z} from "zod";

type Values=z.input<typeof doctorSchema>;
type DoctorValues=Values&{id?:string};
export function DoctorForm({initial}:{initial?:DoctorValues}){
  const t=useTranslations("management");
  const router=useRouter();
  const [error,setError]=useState("");
  const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<Values>({
    resolver:zodResolver(doctorSchema),
    defaultValues:initial??{name:"",email:"",phone:"",profileImage:"",specialization:"",qualification:"",experienceYears:0,bio:"",isActive:true},
  });
  async function submit(values:Values){
    setError("");
    try{
      const response=await fetch(initial?.id?`/api/doctors/${initial.id}`:"/api/doctors",{method:initial?.id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const payload=await response.json() as {error?:{message?:string};data?:{id:string}};
      if(!response.ok)throw new Error(payload.error?.message??t("saveFailed"));
      router.push("/admin/doctors");
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:t("saveFailed"))}
  }
  return <form className="management-form" onSubmit={handleSubmit(submit)}>
    <div className="management-form-grid">
      <ManagementField label={t("doctorName")} error={errors.name?.message}><input {...register("name")}/></ManagementField>
      <ManagementField label={t("email")} error={errors.email?.message}><input type="email" {...register("email")}/></ManagementField>
      <ManagementField label={t("phone")} error={errors.phone?.message}><input type="tel" {...register("phone")}/></ManagementField>
      <ManagementField label={t("specialization")} error={errors.specialization?.message}><input {...register("specialization")}/></ManagementField>
      <ManagementField label={t("qualification")} error={errors.qualification?.message}><input {...register("qualification")}/></ManagementField>
      <ManagementField label={t("experienceYears")} error={errors.experienceYears?.message}><input type="number" min="0" max="70" {...register("experienceYears",{valueAsNumber:true})}/></ManagementField>
      <ManagementField label={t("profileImage")} error={errors.profileImage?.message}><input type="url" {...register("profileImage")}/></ManagementField>
      <ManagementField label={t("biography")} error={errors.bio?.message} full><textarea rows={5} {...register("bio")}/></ManagementField>
    </div>
    {initial?.id&&<label className="management-checkbox"><input type="checkbox" {...register("isActive")}/>{t("active")}</label>}
    {error&&<p className="management-error" role="alert">{error}</p>}
    <button className="button button-primary" disabled={isSubmitting}>{isSubmitting?t("saving"):t("save")}</button>
  </form>;
}

export function ManagementField({label,error,full,children}:{label:string;error?:string;full?:boolean;children:ReactNode}){
  return <label className={`management-field ${full?"is-full":""}`}><span>{label}</span>{children}{error&&<small role="alert">{error}</small>}</label>;
}
