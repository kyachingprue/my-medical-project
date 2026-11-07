import {AuthForm} from "@/components/auth/auth-form";
import {AuthPanel} from "@/components/auth/auth-panel";
export default async function SignInPage({searchParams}:{searchParams:Promise<{returnTo?:string}>}) {
  const {returnTo}=await searchParams;
  const safeReturnTo=returnTo==="/appointment"?returnTo:undefined;
  return <AuthPanel mode="sign-in"><AuthForm mode="sign-in" returnTo={safeReturnTo}/></AuthPanel>;
}
