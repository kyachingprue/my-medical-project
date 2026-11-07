import {redirect} from "next/navigation";
import {Suspense} from "react";
import {getCurrentUser} from "@/lib/auth/session";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
export default function DashboardSectionRedirect({params}:{params:Promise<{locale:string;section:string[]}>}){
  return <Suspense fallback={<DashboardLoading kind="workspace" label="Loading your workspace"/>}><RedirectSectionByRole params={params}/></Suspense>;
}
async function RedirectSectionByRole({params}:{params:Promise<{locale:string;section:string[]}>}){
  const {locale,section}=await params;const user=await getCurrentUser();
  if(!user)return redirect(`/${locale}/sign-in`);
  const role=user.role.toLowerCase();
  if(section.length===1&&section[0]==="bookings"&&role==="patient")return redirect(`/${locale}/patient/dashboard/bookings`);
  if(section.length===1&&section[0]==="profile"&&role==="patient")return redirect(`/${locale}/patient/dashboard/profile`);
  return redirect(`/${locale}/${role}/dashboard`);
}
