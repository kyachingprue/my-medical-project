import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPanel } from "@/components/auth/auth-panel";
import { getCurrentUser } from "@/lib/auth/session";
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ returnTo?: string | string[] }> };

export default function SignInPage({ params, searchParams }: Props) {
  return <Suspense fallback={<AuthPanel mode="sign-in"><AuthForm mode="sign-in" /></AuthPanel>}><SignInContent params={params} searchParams={searchParams} /></Suspense>;
}

async function SignInContent({ params, searchParams }: Props) {
  const [{ returnTo }, { locale }, user] = await Promise.all([searchParams, params, getCurrentUser()]);
  const safeReturnTo = returnTo === "/appointment" ? returnTo : undefined;
  if (user) {
    if (user.role === "PATIENT" && safeReturnTo) redirect(`/${locale}${safeReturnTo}`);
    const dashboard = user.role === "ADMIN" ? "/admin/dashboard" : user.role === "RECEPTIONIST" ? "/receptionist/dashboard" : "/patient/dashboard";
    redirect(`/${locale}${dashboard}`);
  }
  return <AuthPanel mode="sign-in"><AuthForm mode="sign-in" returnTo={safeReturnTo} /></AuthPanel>;
}
