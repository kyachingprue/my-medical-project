"use client";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {reload,sendEmailVerification,updateProfile} from "firebase/auth";
import {firebaseAuth} from "@/lib/firebase/client";

export function ProfileEditor({initialName,initialPhone,emailVerified}:{initialName:string;initialPhone:string;emailVerified:boolean}){
  const t=useTranslations("dashboard");
  const [name,setName]=useState(initialName);
  const [phone,setPhone]=useState(initialPhone);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [verified,setVerified]=useState(emailVerified);
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setMessage("");
    if(!firebaseAuth?.currentUser){setMessage(t("signInAgain"));return}
    setBusy(true);
    try{
      const response=await fetch("/api/auth/profile",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${await firebaseAuth.currentUser.getIdToken()}`},body:JSON.stringify({name,phone})});
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error??t("profileError"));
      await updateProfile(firebaseAuth.currentUser,{displayName:name});
      setMessage(t("profileUpdated"));
    }catch(error){setMessage(error instanceof Error?error.message:t("profileError"))}
    finally{setBusy(false)}
  }
  async function resendVerification(){
    if(!firebaseAuth?.currentUser){setMessage(t("signInAgain"));return}
    setBusy(true);setMessage("");
    try{await sendEmailVerification(firebaseAuth.currentUser);setMessage(t("verificationSent"))}
    catch(error){setMessage(error instanceof Error?error.message:t("verificationError"))}
    finally{setBusy(false)}
  }
  async function checkVerification(){
    const user=firebaseAuth?.currentUser;
    if(!user){setMessage(t("signInAgain"));return}
    setBusy(true);setMessage("");
    try{
      await reload(user);
      if(!user.emailVerified){setMessage(t("emailNotVerified"));return}
      const response=await fetch("/api/auth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:await user.getIdToken(true),expectedRole:"PATIENT"})});
      if(!response.ok)throw new Error(t("verificationError"));
      setVerified(true);
      setMessage(t("emailVerified"));
    }catch(error){setMessage(error instanceof Error?error.message:t("verificationError"))}
    finally{setBusy(false)}
  }
  return <section className="dashboard-subpage"><span className="section-kicker">{t("accountDetails")}</span><h1>{t("profile")}</h1><p>{t("profileIntro")}</p><p role="status">{verified?t("emailVerified"):t("emailNotVerified")}</p>{!verified?<div className="profile-form"><button className="button button-outline" type="button" onClick={resendVerification} disabled={busy}>{busy?t("saving"):t("sendVerification")}</button><button className="button button-outline" type="button" onClick={checkVerification} disabled={busy}>{t("checkVerification")}</button></div>:null}<form className="profile-form" onSubmit={save}><label>{t("fullName")}<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label>{t("phoneNumber")}<input maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} placeholder={t("optional")}/></label>{message&&<p role="status">{message}</p>}<button className="button button-primary" disabled={busy}>{busy?t("saving"):t("saveChanges")}</button></form></section>;
}
