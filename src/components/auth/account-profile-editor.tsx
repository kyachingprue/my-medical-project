"use client";

import Image from "next/image";
import {BadgeCheck,CalendarDays,Camera,Mail,Phone,ShieldCheck,UserRound} from "lucide-react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {onAuthStateChanged, reload, sendEmailVerification, updateProfile} from "firebase/auth";
import type {User} from "firebase/auth";
import type {FormEvent} from "react";
import {useRef,useState} from "react";
import {toast} from "react-hot-toast";
import {firebaseAuth} from "@/lib/firebase/client";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";

type Role="ADMIN"|"PATIENT"|"RECEPTIONIST"|"DOCTOR";

type Props={
  initialName:string;
  email:string;
  initialPhone:string;
  initialSmsNotificationsEnabled?:boolean;
  initialImage:string|null;
  emailVerified:boolean;
  joined:string;
  updated:string;
  role:Role;
};

export function AccountProfileEditor({initialName,email,initialPhone,initialSmsNotificationsEnabled=false,initialImage,emailVerified,joined,updated,role}:Props){
  const t=useTranslations("accountProfile");
  const feedback=useTranslations("feedback");
  const router=useRouter();
  const safeApiError=(status:number)=>getSafeApiErrorMessage(status,undefined,{
    permissionError:feedback("permissionError"),
    serverError:feedback("serverError"),
    validationError:feedback("validationError"),
    fallback:feedback("serverError"),
  });
  const inputRef=useRef<HTMLInputElement>(null);
  const [name,setName]=useState(initialName);
  const [phone,setPhone]=useState(initialPhone);
  const [smsNotificationsEnabled,setSmsNotificationsEnabled]=useState(initialSmsNotificationsEnabled);
  const [image,setImage]=useState(initialImage);
  const [verified,setVerified]=useState(emailVerified);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);

  async function saveProfile(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const user=await getCurrentFirebaseUser();
    if(!user)return toast.error("Sign in again before editing your profile.");
    setSaving(true);
    try{
      const response=await fetch("/api/auth/profile",{
        method:"PATCH",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${await user.getIdToken()}`},
        body:JSON.stringify({name,phone,...(role==="PATIENT"?{smsNotificationsEnabled}:{})}),
      });
      if(!response.ok){toast.error(safeApiError(response.status));return}
      await updateProfile(user,{displayName:name});
      toast.success(feedback("changesSaved"));
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      setSaving(false);
    }
  }

  async function uploadImage(file:File|undefined){
    if(!file)return;
    const user=await getCurrentFirebaseUser();
    if(!user)return toast.error("Sign in again before changing your photo.");
    setUploading(true);
    try{
      const body=new FormData();
      body.set("image",file);
      const response=await fetch("/api/auth/profile/image",{
        method:"POST",
        headers:{Authorization:`Bearer ${await user.getIdToken()}`},
        body,
      });
      const result=await response.json() as {image?:string;error?:string};
      if(!response.ok){toast.error(safeApiError(response.status));return}
      if(!result.image){toast.error(feedback("serverError"));return}
      await updateProfile(user,{photoURL:result.image});
      setImage(result.image);
      toast.success("Profile photo updated");
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      setUploading(false);
      if(inputRef.current)inputRef.current.value="";
    }
  }

  async function sendVerification(){
    const user=await getCurrentFirebaseUser();
    if(!user)return toast.error("Sign in again before verifying your email.");
    setSaving(true);
    try{
      await sendEmailVerification(user);
      toast.success("Verification email sent");
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      setSaving(false);
    }
  }

  async function refreshVerification(){
    const user=await getCurrentFirebaseUser();
    if(!user)return toast.error("Sign in again before checking email verification.");
    setSaving(true);
    try{
      await reload(user);
      if(!user.emailVerified){
        toast.error("Your email is not verified yet.");
        return;
      }
      const response=await fetch("/api/auth/profile",{
        method:"POST",
        headers:{Authorization:`Bearer ${await user.getIdToken(true)}`},
      });
      if(!response.ok){toast.error(safeApiError(response.status));return}
      setVerified(true);
      toast.success("Email verified");
      router.refresh();
    }catch{
      toast.error(feedback("serverError"));
    }finally{
      setSaving(false);
    }
  }

  return <section className="tw-admin-profile-page grid gap-[22px] max-w-[length:980px] m-[0_auto]">
    <header className="tw-management-page-header flex items-end justify-between gap-[20px] [&_h1]:m-[8px_0] [&_h1]:text-[length:clamp(28px,4vw,40px)] [&_h1]:tracking-[-1.6px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col">
      <div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">{t("account")}</span><h1>{t("title")}</h1><p>{t("description")}</p></div>
    </header>
    <article className="tw-admin-profile-card overflow-hidden [border:1px_solid_var(--line)] rounded-[18px] [background:var(--surface)] shadow-[var(--shadow)]">
      <div className="tw-admin-profile-hero relative flex items-center gap-[22px] p-[clamp(22px,5vw,38px)] [background:linear-gradient(125deg,color-mix(in_srgb,var(--teal)_12%,var(--surface)),var(--surface)_72%)] [@media(max-width:640px)]:items-start [@media(max-width:640px)]:[flex-wrap:wrap] [@media(max-width:640px)]:gap-[15px]">
        <button type="button" className="tw-admin-profile-avatar grid [place-items:center] flex-[0_0_100px] w-[100px] h-[100px] overflow-hidden [border:4px_solid_var(--surface)] rounded-[50%] [background:var(--mint)] [color:var(--teal)] shadow-[0_4px_18px_rgba(20,50,45,.12)] [&_img]:w-[100%] [&_img]:h-[100%] [&_img]:object-cover [@media(max-width:640px)]:basis-[76px] [@media(max-width:640px)]:w-[76px] [@media(max-width:640px)]:h-[76px] [&:focus-visible]:[outline:3px_solid_color-mix(in_srgb,var(--teal)_45%,transparent)] [&:focus-visible]:[outline-offset:3px] p-[0] cursor-pointer [transition:transform_.16s_ease,opacity_.16s_ease] [&:not(:disabled):hover]:[transform:scale(1.03)] [&:disabled]:cursor-wait [&:disabled]:opacity-[.65] [@media(prefers-reduced-motion:reduce)]:[transition:none] relative" onClick={()=>inputRef.current?.click()} disabled={uploading} aria-label="Change profile photo">
          {image?<Image src={image} alt="" width={100} height={100} unoptimized/>:<UserRound size={42}/>}
          <span className="tw-admin-profile-camera absolute right-[0] bottom-[0] grid w-[30px] h-[30px] [place-items:center] [border:2px_solid_var(--surface)] rounded-[50%] [background:var(--teal)] [color:var(--bg)] shadow-[0_3px_10px_rgba(20,50,45,.18)] [transition:transform_.16s_ease] [.tw-admin-profile-avatar:not(:disabled):hover_&]:[transform:scale(1.08)] [@media(prefers-reduced-motion:reduce)]:[transition:none]"><Camera size={15}/></span>
        </button>
        <input ref={inputRef} className="tw-sr-only absolute w-[1px] h-[1px] p-[0] m-[-1px] overflow-hidden [clip:rect(0,0,0,0)] whitespace-nowrap [border:0]" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a profile photo" onChange={event=>void uploadImage(event.target.files?.[0])}/>
        <div className="tw-admin-profile-identity min-w-[length:0] [&_h2]:m-[10px_0_5px] [&_h2]:text-[length:clamp(22px,4vw,30px)] [&_h2]:tracking-[-.7px] [&_h2]:[overflow-wrap:anywhere] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:12px] [&_p]:[overflow-wrap:anywhere]">
          <span className="tw-admin-profile-role inline-flex items-center gap-[6px] p-[6px_9px] rounded-[999px] [background:color-mix(in_srgb,var(--teal)_12%,var(--surface))] [color:var(--teal)] text-[length:10px] font-[750]"><ShieldCheck size={14}/>{t(role==="ADMIN"?"adminRole":role==="PATIENT"?"patientRole":role==="DOCTOR"?"doctorRole":"receptionistRole")}</span>
          <h2>{name}</h2>
          <p>{email}</p>
        </div>
        <span className={`tw-admin-profile-verification inline-flex items-center gap-[6px] p-[6px_9px] rounded-[999px] [background:color-mix(in_srgb,var(--teal)_12%,var(--surface))] [color:var(--teal)] text-[length:10px] font-[750] ml-[auto] [background:var(--peach)] [color:#8e573d] whitespace-nowrap [@media(max-width:640px)]:ml-[0]${verified?" tw-is-verified [.tw-admin-profile-verification&]:[background:var(--mint)] [.tw-admin-profile-verification&]:[color:var(--teal-dark)]":""}`}>
          <BadgeCheck size={16}/>{verified?t("verified"):t("notVerified")}
        </span>
      </div>
      <div className="tw-admin-profile-details grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[0_26px] p-[8px_clamp(18px,4vw,38px)_25px] [&>div]:grid [&>div]:gap-[8px] [&>div]:min-w-[length:0] [&>div]:p-[17px_0] [&>div]:[border-bottom:1px_solid_var(--line)] [&>div>span]:flex [&>div>span]:items-center [&>div>span]:gap-[8px] [&>div>span]:[color:var(--muted)] [&>div>span]:text-[length:10px] [&>div>span]:font-bold [&>div>span_svg]:[color:var(--teal)] [&_strong]:text-[length:12px] [&_strong]:[overflow-wrap:anywhere] [@media(max-width:640px)]:grid-cols-[minmax(0,1fr)] [@media(max-width:640px)]:pb-[18px]">
        <div><span><UserRound size={16}/>{t("fullName")}</span><strong>{name}</strong></div>
        <div><span><Mail size={16}/>{t("email")}</span><strong>{email}</strong></div>
        <div><span><Phone size={16}/>{t("phone")}</span><strong>{phone||t("notProvided")}</strong></div>
        <div><span><ShieldCheck size={16}/>{t("role")}</span><strong>{t(role==="ADMIN"?"adminRole":role==="PATIENT"?"patientRole":role==="DOCTOR"?"doctorRole":"receptionistRole")}</strong></div>
        <div><span><CalendarDays size={16}/>{t("joined")}</span><strong>{joined}</strong></div>
        <div><span><CalendarDays size={16}/>{t("updated")}</span><strong>{updated}</strong></div>
      </div>
      <form className="grid gap-4 border-t border-[var(--line)] p-5 sm:grid-cols-2" onSubmit={saveProfile}>
        <label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]">{t("fullName")}<input required minLength={2} maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></label>
        <label className="tw-management-field grid gap-[7px] min-w-[length:0] [color:var(--text)] text-[length:12px] [font-weight:650] [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_textarea]:w-[100%] [&_textarea]:min-h-[42px] [&_textarea]:p-[10px_12px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[8px] [&_textarea]:[background:var(--bg)] [&_textarea]:[color:var(--text)] [&_textarea]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_textarea]:[resize:vertical] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_textarea:focus]:border-[color:var(--teal)] [&_textarea:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_small]:[color:#b43e37] [&_small]:text-[length:11px]">{t("phone")}<input type="tel" maxLength={30} value={phone} onChange={event=>setPhone(event.target.value)}/></label>
        {role==="PATIENT"&&<label className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)] sm:col-span-2"><input className="mt-1 accent-[var(--teal)]" type="checkbox" checked={smsNotificationsEnabled} onChange={event=>setSmsNotificationsEnabled(event.target.checked)}/><span>{t("smsConsent")}</span></label>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" type="submit" disabled={saving}>{saving?"Saving…":"Save profile"}</button>
          {!verified&&<><button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" type="button" onClick={()=>void sendVerification()} disabled={saving}>{saving?"Please wait…":"Send verification email"}</button><button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" type="button" onClick={()=>void refreshVerification()} disabled={saving}>Check verification</button></>}
        </div>
      </form>
    </article>
  </section>;
}

async function getCurrentFirebaseUser(){
  const auth=firebaseAuth;
  if(!auth)return null;
  if(auth.currentUser)return auth.currentUser;
  return new Promise<User|null>(resolve=>{
    const unsubscribe=onAuthStateChanged(auth,user=>{
      unsubscribe();
      resolve(user);
    });
  });
}
