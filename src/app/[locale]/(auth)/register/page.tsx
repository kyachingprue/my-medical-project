import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPanel } from "@/components/auth/auth-panel";
import { getCurrentUser } from "@/lib/auth/session";

type Props = { params: Promise<{ locale: string }> };

export default function RegisterPage({ params }: Props) {
  return <Suspense fallback={<AuthPanel mode="register"><AuthForm mode="register" /></AuthPanel>}><RegisterContent params={params} /></Suspense>;
}

async function RegisterContent({ params }: Props) {
  const [{ locale }, user] = await Promise.all([params, getCurrentUser()]);
  if (user) {
    const dashboard = user.role === "ADMIN" ? "/admin/dashboard" : user.role === "RECEPTIONIST" ? "/receptionist/dashboard" : "/patient/dashboard";
    redirect(`/${locale}${dashboard}`);
  }
  return <AuthPanel mode="register"><AuthForm mode="register" /></AuthPanel>;
}
