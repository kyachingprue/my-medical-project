import {redirect} from "next/navigation";
import {Suspense} from "react";
import {getCurrentUser} from "@/lib/auth/session";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
export default function DashboardRedirect({params}:{params:Promise<{locale:string}>}){
  return <Suspense fallback={<DashboardLoading kind="workspace" label="Loading your workspace"/>}><RedirectByRole params={params}/></Suspense>;
}
async function RedirectByRole({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;const user=await getCurrentUser();
  if(!user)return redirect(`/${locale}/sign-in`);
  return redirect(`/${locale}/${user.role.toLowerCase()}/dashboard`);
}
