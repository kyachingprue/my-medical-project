import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {Suspense} from "react";
import {DashboardFrame} from "@/components/dashboards/dashboard-frame";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {requireRole} from "@/lib/auth/authorize";

export default function DoctorDashboardLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}){
  return <Suspense fallback={<DashboardLoading kind="workspace" label="Loading your secure workspace"/>}>
    <ProtectedDoctorDashboard params={params}>{children}</ProtectedDoctorDashboard>
  </Suspense>;
}

async function ProtectedDoctorDashboard({children,params}:{children:ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireRole("DOCTOR",locale);
  if(!user.doctorId)redirect(`/${locale}/unauthorized`);
  return <DashboardFrame role="doctor" name={user.name} image={user.image}>{children}</DashboardFrame>;
}
