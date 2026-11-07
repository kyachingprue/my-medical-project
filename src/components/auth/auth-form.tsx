"use client";
import {zodResolver} from "@hookform/resolvers/zod";
import {createUserWithEmailAndPassword,GoogleAuthProvider,sendEmailVerification,sendPasswordResetEmail,signInWithEmailAndPassword,signInWithPopup,updateProfile} from "firebase/auth";
import {Eye,EyeOff,Headset,LockKeyhole,Mail,ShieldCheck,UserRound} from "lucide-react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {Link} from "@/i18n/navigation";
import {useState,type ReactNode} from "react";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {firebaseAuth,firebaseConfigured} from "@/lib/firebase/client";

type Mode="sign-in"|"register"|"forgot";
type AuthRole="PATIENT"|"RECEPTIONIST"|"ADMIN";
const roleOptions=[
  {value:"PATIENT",label:"rolePatient",icon:UserRound},
  {value:"RECEPTIONIST",label:"roleReceptionist",icon:Headset},
  {value:"ADMIN",label:"roleAdmin",icon:ShieldCheck},
] as const;
export function AuthForm({mode,returnTo}:{mode:Mode;returnTo?:string}) {
  const t=useTranslations("auth"); const v=useTranslations("validation"); const router=useRouter();
  const [show,setShow]=useState(false);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  const [selectedRole,setSelectedRole]=useState<AuthRole>("PATIENT");
  const schema=z.object({name:z.string().trim().min(2,v("name")).optional(),email:z.string().trim().email(v("email")),password:mode==="forgot"?z.string().optional():z.string().min(8,v("password")),confirmPassword:mode==="register"?z.string().min(1,v("confirm")):z.string().optional(),terms:mode==="register"?z.literal(true,{error:v("terms")}):z.boolean().optional()}).refine(value=>mode!=="register"||value.password===value.confirmPassword,{path:["confirmPassword"],message:v("match")});
  type Values=z.infer<typeof schema>;
  const {register,handleSubmit,formState:{errors}}=useForm<Values>({resolver:zodResolver(schema)});
  async function session(expectedRole:AuthRole){
    if(!firebaseAuth?.currentUser)throw new Error("Sign-in did not return a user.");
    const response=await fetch("/api/auth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:await firebaseAuth.currentUser.getIdToken(),expectedRole})});
    const payload=await response.json() as {role?:AuthRole;error?:string};
    if(response.status===403&&payload.error==="ROLE_MISMATCH"&&payload.role){
      const actualRole=roleOptions.find(option=>option.value===payload.role);
      setMessage(t("roleMismatch",{role:actualRole?t(actualRole.label):""}));
      return;
    }
    if(!response.ok||!payload.role)throw new Error(payload.error??"Could not start your session.");
    router.replace(payload.role==="PATIENT"&&returnTo?returnTo:payload.role==="ADMIN"?"/admin/dashboard":payload.role==="RECEPTIONIST"?"/receptionist/dashboard":"/patient/dashboard");
  }
  async function submit(v:Values){
    setMessage("");if(!firebaseAuth){setMessage("Firebase is not configured. Add the web credentials to .env.local.");return}
    setBusy(true);
    try{
      if(mode==="forgot"){await sendPasswordResetEmail(firebaseAuth,v.email);setMessage("Password reset email sent.");}
      else if(mode==="register"){const credential=await createUserWithEmailAndPassword(firebaseAuth,v.email,v.password!);await updateProfile(credential.user,{displayName:v.name!.trim()});await sendEmailVerification(credential.user);await session("PATIENT");}
      else{await signInWithEmailAndPassword(firebaseAuth,v.email,v.password!);await session(selectedRole);}
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to continue. Please try again.");}
    finally{setBusy(false)}
  }
  async function google(){
    if(!firebaseAuth){setMessage("Firebase is not configured. Add the web credentials to .env.local.");return}
    setBusy(true);setMessage("");try{await signInWithPopup(firebaseAuth,new GoogleAuthProvider());await session(selectedRole)}catch(error){setMessage(error instanceof Error?error.message:"Google sign-in failed.")}finally{setBusy(false)}
  }
  return <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
    {mode==="register"&&<Field label={t("name")} icon={<UserRound size={17}/>} error={errors.name?.message}><input autoComplete="name" placeholder="Alex Morgan" {...register("name")}/></Field>}
    {mode==="sign-in"&&<div className="role-picker"><span className="role-picker-label">{t("chooseRole")}</span><div className="role-options" role="group" aria-label={t("chooseRole")}>{roleOptions.map(({value,label,icon:Icon})=><button type="button" className={`role-option ${selectedRole===value?"is-selected":""}`} aria-pressed={selectedRole===value} key={value} onClick={()=>{setSelectedRole(value);setMessage("")}}><Icon size={16}/><span>{t(label)}</span></button>)}</div></div>}
    {mode==="register"&&<p className="role-registration-note">{t("patientOnlyRegistration")}</p>}
    <Field label={t("email")} icon={<Mail size={17}/>} error={errors.email?.message}><input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")}/></Field>
    {mode!=="forgot"&&<>    <Field label={t("password")} icon={<LockKeyhole size={17}/>} error={errors.password?.message}><input type={show?"text":"password"} autoComplete={mode==="register"?"new-password":"current-password"} placeholder="••••••••" {...register("password")}/><button type="button" className="field-eye" aria-label={t(show?"hidePassword":"showPassword")} onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></Field>{mode==="register"&&<Field label={t("confirmPassword")} icon={<LockKeyhole size={17}/>} error={errors.confirmPassword?.message}><input type={show?"text":"password"} autoComplete="new-password" placeholder="••••••••" {...register("confirmPassword")}/></Field>}</>}
    {mode==="register"&&<><label className="terms-field"><input type="checkbox" {...register("terms")}/><span>{t("terms")}</span></label>{errors.terms?.message&&<span className="field-error" role="alert">{errors.terms.message}</span>}</>}
    {mode==="sign-in"&&<div className="auth-forgot"><Link href="/forgot-password">{t("forgot")}</Link></div>}
    {message&&<p className="form-notice" role="alert">{message}</p>}
    {!firebaseConfigured&&<p className="config-hint">{t("firebaseConfig")}</p>}
    <button className="button button-primary auth-submit" disabled={busy}>{busy?t("wait"):t(mode==="register"?"register":mode==="forgot"?"reset":"signIn")}<span>↗</span></button>
    {mode==="sign-in"&&<><div className="auth-divider"><span>{t("or")}</span></div><button className="button button-google" type="button" onClick={google} disabled={busy}><strong>G</strong>{t("google")}</button></>}
  </form>;
}
function Field({label,icon,error,children}:{label:string;icon:ReactNode;error?:string;children:ReactNode}){return <div className="form-field"><label>{label}</label><div className={`input-wrap ${error?"has-error":""}`}><span className="input-icon">{icon}</span>{children}</div>{error&&<span className="field-error">{error}</span>}</div>}
