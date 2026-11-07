import {Suspense} from "react";
import {DashboardOverview} from "@/components/dashboards/dashboard-overview";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";

export default function ReceptionistDashboardPage() {
  return <Suspense fallback={<DashboardLoading label="Loading your dashboard"/>}><DashboardOverview role="receptionist" /></Suspense>;
}
