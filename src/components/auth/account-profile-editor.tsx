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

type Role="ADMIN"|"PATIENT"|"RECEPTIONIST";

type Props={
  initialName:string;
  email:string;
  initialPhone:string;
  initialImage:string|null;
  emailVerified:boolean;
  joined:string;
  updated:string;
  role:Role;
};

export function AccountProfileEditor({initialName,email,initialPhone,initialImage,emailVerified,joined,updated,role}:Props){
  const t=useTranslations("accountProfile");
  const router=useRouter();
  const inputRef=useRef<HTMLInputElement>(null);
  const [name,setName]=useState(initialName);
  const [phone,setPhone]=useState(initialPhone);
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
        body:JSON.stringify({name,phone}),
      });
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error??"Could not save your profile.");
      await updateProfile(user,{displayName:name});
      toast.success("Profile updated");
      router.refresh();
    }catch(error){
      toast.error(error instanceof Error?error.message:"Could not save your profile.");
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
      if(!response.ok||!result.image)throw new Error(result.error??"Could not upload your photo.");
      await updateProfile(user,{photoURL:result.image});
      setImage(result.image);
      toast.success("Profile photo updated");
      router.refresh();
    }catch(error){
      toast.error(error instanceof Error?error.message:"Could not upload your photo.");
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
    }catch(error){
      toast.error(error instanceof Error?error.message:"Could not send the verification email.");
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
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error??"Could not update verification status.");
      setVerified(true);
      toast.success("Email verified");
      router.refresh();
    }catch(error){
      toast.error(error instanceof Error?error.message:"Could not check email verification.");
    }finally{
      setSaving(false);
    }
  }

  return <section className="admin-profile-page">
    <header className="management-page-header">
      <div><span className="section-kicker">{t("account")}</span><h1>{t("title")}</h1><p>{t("description")}</p></div>
    </header>
    <article className="admin-profile-card">
      <div className="admin-profile-hero">
        <button type="button" className="admin-profile-avatar relative" onClick={()=>inputRef.current?.click()} disabled={uploading} aria-label="Change profile photo">
          {image?<Image src={image} alt="" width={100} height={100} unoptimized/>:<UserRound size={42}/>}
          <span className="admin-profile-camera"><Camera size={15}/></span>
        </button>
        <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a profile photo" onChange={event=>void uploadImage(event.target.files?.[0])}/>
        <div className="admin-profile-identity">
          <span className="admin-profile-role"><ShieldCheck size={14}/>{t(role==="ADMIN"?"adminRole":role==="PATIENT"?"patientRole":"receptionistRole")}</span>
          <h2>{name}</h2>
          <p>{email}</p>
        </div>
        <span className={`admin-profile-verification${verified?" is-verified":""}`}>
          <BadgeCheck size={16}/>{verified?t("verified"):t("notVerified")}
        </span>
      </div>
      <div className="admin-profile-details">
        <div><span><UserRound size={16}/>{t("fullName")}</span><strong>{name}</strong></div>
        <div><span><Mail size={16}/>{t("email")}</span><strong>{email}</strong></div>
        <div><span><Phone size={16}/>{t("phone")}</span><strong>{phone||t("notProvided")}</strong></div>
        <div><span><ShieldCheck size={16}/>{t("role")}</span><strong>{t(role==="ADMIN"?"adminRole":role==="PATIENT"?"patientRole":"receptionistRole")}</strong></div>
        <div><span><CalendarDays size={16}/>{t("joined")}</span><strong>{joined}</strong></div>
        <div><span><CalendarDays size={16}/>{t("updated")}</span><strong>{updated}</strong></div>
      </div>
      <form className="grid gap-4 border-t border-[var(--line)] p-5 sm:grid-cols-2" onSubmit={saveProfile}>
        <label className="management-field">{t("fullName")}<input required minLength={2} maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></label>
        <label className="management-field">{t("phone")}<input type="tel" maxLength={30} value={phone} onChange={event=>setPhone(event.target.value)}/></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className="button button-primary" type="submit" disabled={saving}>{saving?"Saving…":"Save profile"}</button>
          {!verified&&<><button className="button button-outline" type="button" onClick={()=>void sendVerification()} disabled={saving}>{saving?"Please wait…":"Send verification email"}</button><button className="button button-outline" type="button" onClick={()=>void refreshVerification()} disabled={saving}>Check verification</button></>}
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
