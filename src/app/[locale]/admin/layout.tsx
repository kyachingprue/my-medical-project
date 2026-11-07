import type {ReactNode} from "react";
import {Suspense} from "react";
import {DashboardFrame} from "@/components/dashboards/dashboard-frame";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {requireRole} from "@/lib/auth/authorize";

export default function AdminLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}){
  return <Suspense fallback={<DashboardLoading kind="workspace" label="Loading your secure workspace"/>}>
    <ProtectedAdminLayout params={params}>{children}</ProtectedAdminLayout>
  </Suspense>;
}

async function ProtectedAdminLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireRole("ADMIN",locale);
  return <DashboardFrame role="admin" name={user.name} image={user.image}>{children}</DashboardFrame>;
}
