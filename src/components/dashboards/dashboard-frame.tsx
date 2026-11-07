import {ArrowUpRight,HeartHandshake,Stethoscope} from "lucide-react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import type {ReactNode} from "react";
import {Link} from "@/i18n/navigation";
import {DashboardMenu} from "./dashboard-menu";
import {ThemeToggle} from "@/components/common/theme-toggle";
import {LanguageSwitcher} from "@/components/navigation/language-switcher";
import {AdminNotificationBell} from "./admin-notification-bell";
type Role="patient"|"receptionist"|"admin";
const labels={patient:"patient",receptionist:"receptionist",admin:"admin"} as const;
export function DashboardFrame({role,name,image,children}:{role:Role;name:string;image:string|null;children:ReactNode}){
  const t=useTranslations("dashboard");
  return <div className="dashboard-layout"><aside className="dashboard-sidebar"><Link className="brand dashboard-brand" href="/"><span className="brand-mark"><span/></span><span>smile<span className="brand-light">craft</span></span></Link><div className="dashboard-clinic"><span className="clinic-avatar"><Stethoscope size={17}/></span><span><strong>Smile Care</strong><small>{t(labels[role])}</small></span><ArrowUpRight size={14}/></div><span className="sidebar-label">{t("sidebarLabel")}</span><DashboardMenu role={role}/><div className="sidebar-help"><HeartHandshake size={18}/><strong>{t("helpTitle")}</strong><p>{t("helpText")}</p><Link href="/contact">{t("contactClinic")} <ArrowUpRight size={14}/></Link></div><Link className="dashboard-back" href="/">← {t("backWebsite")}</Link></aside><div className="dashboard-main"><header className="dashboard-topbar"><div className="dashboard-topbar-info"><span className="dashboard-kicker">SMILE CARE DENTAL CLINIC</span><strong>{t("welcome")}, {name.split(" ")[0]}</strong></div><div className="dashboard-topbar-actions">{role==="admin"?<AdminNotificationBell/>:null}<div className="dashboard-preferences"><LanguageSwitcher/><ThemeToggle/></div><div className="dashboard-user">{image ? <Image src={image} alt="" width={34} height={34} unoptimized /> : <span>{name.slice(0,1).toUpperCase()}</span>}<div><strong>{name}</strong><small>{t(labels[role])}</small></div></div></div></header><main className="dashboard-content">{children}</main></div></div>;
}
