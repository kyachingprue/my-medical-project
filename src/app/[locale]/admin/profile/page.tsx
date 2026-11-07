import Image from "next/image";
import {BadgeCheck,CalendarDays,Mail,Phone,ShieldCheck,UserRound} from "lucide-react";
import {connection} from "next/server";
import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/authorize";

export default async function AdminProfilePage({params}:{params:Promise<{locale:string}>}){
  await connection();
  const {locale}=await params;
  const [user,t]=await Promise.all([requireRole("ADMIN",locale),getTranslations("adminProfile")]);
  const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium"});

  return <section className="admin-profile-page">
    <header className="management-page-header">
      <div><span className="section-kicker">{t("account")}</span><h1>{t("title")}</h1><p>{t("description")}</p></div>
    </header>
    <article className="admin-profile-card">
      <div className="admin-profile-hero">
        <div className="admin-profile-avatar">
          {user.image?<Image src={user.image} alt="" width={100} height={100} unoptimized/>:<UserRound size={42}/>}
        </div>
        <div className="admin-profile-identity">
          <span className="admin-profile-role"><ShieldCheck size={14}/>{t("adminRole")}</span>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
        <span className={`admin-profile-verification${user.emailVerified?" is-verified":""}`}>
          <BadgeCheck size={16}/>{user.emailVerified?t("verified"):t("notVerified")}
        </span>
      </div>
      <div className="admin-profile-details">
        <div><span><UserRound size={16}/>{t("fullName")}</span><strong>{user.name}</strong></div>
        <div><span><Mail size={16}/>{t("email")}</span><strong>{user.email}</strong></div>
        <div><span><Phone size={16}/>{t("phone")}</span><strong>{user.phone||t("notProvided")}</strong></div>
        <div><span><ShieldCheck size={16}/>{t("role")}</span><strong>{t("adminRole")}</strong></div>
        <div><span><CalendarDays size={16}/>{t("joined")}</span><strong>{dateFormat.format(user.createdAt)}</strong></div>
        <div><span><CalendarDays size={16}/>{t("updated")}</span><strong>{dateFormat.format(user.updatedAt)}</strong></div>
      </div>
    </article>
  </section>;
}
