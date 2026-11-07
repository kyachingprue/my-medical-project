import {Suspense} from "react";
import {DashboardOverview} from "@/components/dashboards/dashboard-overview";
import {AnalyticsDashboard} from "@/components/appointments/analytics-dashboard";
import {DashboardLoading} from "@/components/dashboards/dashboard-loading";

export default function AdminDashboardPage() {
  return <Suspense fallback={<DashboardLoading kind="analytics" label="Loading your dashboard"/>}><DashboardOverview role="admin" /><AnalyticsDashboard /></Suspense>;
}
