"use client";

import {LogOut} from "lucide-react";
import {signOut} from "firebase/auth";
import {useState} from "react";
import {toast} from "react-hot-toast";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";
import {firebaseAuth} from "@/lib/firebase/client";

export function DashboardSignOutButton(){
  const t=useTranslations("clinicSettings");
  const feedback=useTranslations("feedback");
  const common=useTranslations("common");
  const router=useRouter();
  const [busy,setBusy]=useState(false);

  async function logout(){
    if(busy)return;
    setBusy(true);
    const loadingToast=toast.loading(feedback("processing"));
    try{
      const response=await fetch("/api/auth/session",{method:"DELETE"});
      if(firebaseAuth)await signOut(firebaseAuth);
      if(!response.ok){
        toast.error(getSafeApiErrorMessage(response.status,undefined,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:common("error"),
        }));
      }else{
        toast.success(feedback("logoutSuccess"));
      }
      router.push("/");
    }catch(error){
      console.error("Could not sign out from the receptionist dashboard:",error);
      toast.error(common("error"));
    }finally{
      toast.dismiss(loadingToast);
      setBusy(false);
    }
  }

  return <button type="button" onClick={()=>void logout()} disabled={busy} className="inline-flex min-h-[42px] items-center justify-center gap-[8px] rounded-[9px] [border:1px_solid_var(--line)] [background:var(--surface)] px-[13px] text-[12px] font-semibold [color:var(--text)] [transition:border-color_.2s,color_.2s] hover:[border-color:var(--teal)] hover:[color:var(--teal)] disabled:cursor-wait disabled:opacity-60">
    <LogOut size={15}/>{busy?t("signingOut"):t("signOut")}
  </button>;
}
