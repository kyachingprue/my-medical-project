import {ArrowLeft, Sparkles} from "lucide-react";
import {useTranslations} from "next-intl";
import type {ReactNode} from "react";
import {Link} from "@/i18n/navigation";

export function AuthPanel({mode,children}:{mode:"sign-in"|"register"|"forgot";children:ReactNode}) {
  const t=useTranslations("auth");
  const title=mode==="register"?t("createAccount"):mode==="forgot"?t("forgot"):t("welcome");
  const description=mode==="register"?t("registerDescription"):mode==="forgot"?t("resetDescription"):t("signInDescription");
  return <div className="auth-page"><div className="auth-backdrop"><div className="auth-glow"/><div className="auth-art"><span className="art-sparkle"><Sparkles/></span><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><div className="art-smile">☺</div><div className="art-caption"><strong>A little care goes a long way.</strong><span>Thoughtful dentistry, made personal.</span></div></div></div><div className="auth-content"><Link className="auth-back" href="/"><ArrowLeft size={17}/>{t("backToSite")}</Link><div className="auth-card"><Link className="brand auth-brand" href="/"><span className="brand-mark"><span/></span><span>smile<span className="brand-light">craft</span></span></Link><h1>{title}</h1><p className="auth-description">{description}</p>{children}<div className="auth-switch">{mode==="sign-in"?<>{t("noAccount")} <Link href="/register">{t("registerLink")}</Link></>:mode==="register"?<>{t("hasAccount")} <Link href="/sign-in">{t("loginLink")}</Link></>:<Link href="/sign-in">{t("backToSignIn")}</Link>}</div><p className="auth-privacy">{t("privacy")}</p></div></div></div>;
}
