import type {ReactNode} from "react";
import {Suspense} from "react";
import {DashboardFrame} from "@/components/dashboards/dashboard-frame";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {requireRole} from "@/lib/auth/authorize";

export default function ReceptionistLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}){
  return <Suspense fallback={<DashboardLoading kind="workspace" label="Loading your secure workspace"/>}><ProtectedReceptionistLayout params={params}>{children}</ProtectedReceptionistLayout></Suspense>;
}

async function ProtectedReceptionistLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireRole("RECEPTIONIST",locale);
  return <DashboardFrame role="receptionist" name={user.name} image={user.image}>{children}</DashboardFrame>;
}
