import {Suspense} from "react";
import {AuthForm} from "@/components/auth/auth-form";
import {AuthPanel} from "@/components/auth/auth-panel";
type Props={searchParams:Promise<{returnTo?:string|string[]}>};

export default function SignInPage({searchParams}:Props) {
  return <Suspense fallback={<AuthPanel mode="sign-in"><AuthForm mode="sign-in"/></AuthPanel>}><SignInContent searchParams={searchParams}/></Suspense>;
}

async function SignInContent({searchParams}:Props) {
  const {returnTo}=await searchParams;
  const safeReturnTo=returnTo==="/appointment"?returnTo:undefined;
  return <AuthPanel mode="sign-in"><AuthForm mode="sign-in" returnTo={safeReturnTo}/></AuthPanel>;
}
