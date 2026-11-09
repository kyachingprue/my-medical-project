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
  return <form className="tw-auth-form grid gap-[15px]" onSubmit={handleSubmit(submit)} noValidate>
    {mode==="register"&&<Field label={t("name")} icon={<UserRound size={17}/>} error={errors.name?.message}><input autoComplete="name" placeholder="Alex Morgan" {...register("name")}/></Field>}
    {mode==="sign-in"&&<div className="tw-role-picker grid gap-[9px] m-[3px_0_4px]"><span className="tw-role-picker-label [color:var(--text)] text-[length:12px] font-bold">{t("chooseRole")}</span><div className="tw-role-options grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[7px] [@media(max-width:420px)]:gap-[5px]" role="group" aria-label={t("chooseRole")}>{roleOptions.map(({value,label,icon:Icon})=><button type="button" className={`tw-role-option min-h-[44px] flex items-center justify-center gap-[7px] p-[8px_5px] [border:1px_solid_var(--line)] rounded-[10px] [background:var(--surface)] [color:var(--muted)] text-[length:11px] [font-weight:650] [transition:border-color_.18s,background_.18s,color_.18s,box-shadow_.18s] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)] [@media(max-width:420px)]:gap-[4px] [@media(max-width:420px)]:text-[length:10px] [@media(max-width:420px)]:p-[7px_3px] [@media(max-width:420px)]:[&_svg]:w-[14px] [@media(max-width:420px)]:[&_svg]:h-[14px] ${selectedRole===value?"tw-is-selected [.tw-role-option&]:border-[color:var(--teal)] [.tw-role-option&]:[background:var(--mint)] [.tw-role-option&]:[color:var(--teal-dark)] [.tw-role-option&]:shadow-[inset_0_0_0_1px_var(--teal)] [.tw-slot-option&]:border-[color:var(--teal)] [.tw-slot-option&]:[background:color-mix(in_srgb,var(--teal)_10%,var(--surface))] [.tw-slot-option&]:[color:var(--teal)]":""}`} aria-pressed={selectedRole===value} key={value} onClick={()=>{setSelectedRole(value);setMessage("")}}><Icon size={16}/><span>{t(label)}</span></button>)}</div></div>}
    {mode==="register"&&<p className="tw-role-registration-note m-[0_0_4px] [color:var(--muted)] text-[length:11px] leading-[1.55]">{t("patientOnlyRegistration")}</p>}
    <Field label={t("email")} icon={<Mail size={17}/>} error={errors.email?.message}><input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")}/></Field>
    {mode!=="forgot"&&<>    <Field label={t("password")} icon={<LockKeyhole size={17}/>} error={errors.password?.message}><input type={show?"text":"password"} autoComplete={mode==="register"?"new-password":"current-password"} placeholder="••••••••" {...register("password")}/><button type="button" className="tw-field-eye [border:0] [background:transparent] [color:var(--muted)] flex" aria-label={t(show?"hidePassword":"showPassword")} onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></Field>{mode==="register"&&<Field label={t("confirmPassword")} icon={<LockKeyhole size={17}/>} error={errors.confirmPassword?.message}><input type={show?"text":"password"} autoComplete="new-password" placeholder="••••••••" {...register("confirmPassword")}/></Field>}</>}
    {mode==="register"&&<><label className="tw-terms-field flex items-center gap-[8px] [color:var(--muted)] text-[length:10px] [&_input]:[accent-color:var(--teal)]"><input type="checkbox" {...register("terms")}/><span>{t("terms")}</span></label>{errors.terms?.message&&<span className="tw-field-error block [color:#bd4b4b] text-[length:10px] mt-[5px]" role="alert">{errors.terms.message}</span>}</>}
    {mode==="sign-in"&&<div className="tw-auth-forgot text-right text-[length:10px] [color:var(--teal)]"><Link href="/forgot-password">{t("forgot")}</Link></div>}
    {message&&<p className="tw-form-notice p-[10px] rounded-[7px] [background:#fff0eb] [color:#964e37] text-[length:11px] leading-[1.5]" role="alert">{message}</p>}
    {!firebaseConfigured&&<p className="tw-config-hint p-[10px] rounded-[7px] [background:#fff0eb] [color:#964e37] text-[length:11px] leading-[1.5] [background:var(--mint)] [color:var(--muted)]">{t("firebaseConfig")}</p>}
    <button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px] tw-auth-submit w-[100%] h-[46px] mt-[4px]" disabled={busy}>{busy?t("wait"):t(mode==="register"?"register":mode==="forgot"?"reset":"signIn")}<span>↗</span></button>
    {mode==="sign-in"&&<><div className="tw-auth-divider flex items-center gap-[12px] [color:var(--muted)] text-[length:10px] [&:before]:[content:''] [&:before]:h-[1px] [&:before]:flex-[1] [&:before]:[background:var(--line)] [&:after]:[content:''] [&:after]:h-[1px] [&:after]:flex-[1] [&:after]:[background:var(--line)]"><span>{t("or")}</span></div><button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-google h-[45px] w-[100%] border-[color:var(--line)] [background:var(--surface)] [color:var(--text)] [&_strong]:[color:#4285f4]" type="button" onClick={google} disabled={busy}><strong>G</strong>{t("google")}</button></>}
  </form>;
}
function Field({label,icon,error,children}:{label:string;icon:ReactNode;error?:string;children:ReactNode}){return <div className="tw-form-field [&>label]:block [&>label]:text-[length:11px] [&>label]:font-bold [&>label]:mb-[7px]"><label>{label}</label><div className={`tw-input-wrap h-[47px] [border:1px_solid_var(--line)] rounded-[8px] flex items-center gap-[10px] p-[0_12px] [background:var(--bg)] [&:focus-within]:border-[color:var(--teal)] [&_input]:min-w-[length:0] [&_input]:flex-[1] [&_input]:[border:0] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[color:var(--text)] [&_input]:text-[length:12px] [&_input::placeholder]:[color:#9aa8a5] ${error?"tw-has-error [.tw-input-wrap&]:border-[color:#c75252]":""}`}><span className="tw-input-icon [color:var(--muted)] flex">{icon}</span>{children}</div>{error&&<span className="tw-field-error block [color:#bd4b4b] text-[length:10px] mt-[5px]">{error}</span>}</div>}
