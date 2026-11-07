import type {ReactNode} from "react";
import {Suspense} from "react";
import {DashboardFrame} from "@/components/dashboards/dashboard-frame";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";
import {requireRole} from "@/lib/auth/authorize";

export default function PatientDashboardLayout({children, params}: {children: ReactNode; params: Promise<{locale: string}>}) {
  return <Suspense fallback={<DashboardLoading kind="workspace" label="Loading your secure workspace"/>}><ProtectedPatientLayout params={params}>{children}</ProtectedPatientLayout></Suspense>;
}

async function ProtectedPatientLayout({children, params}: {children: ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const user = await requireRole("PATIENT", locale);
  return <DashboardFrame role="patient" name={user.name} image={user.image}>{children}</DashboardFrame>;
}
