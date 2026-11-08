"use client";

import Image from "next/image";
import {onAuthStateChanged, signOut, type User} from "firebase/auth";
import {ChevronDown, Menu, X} from "lucide-react";
import {useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";
import {ThemeToggle} from "@/components/common/theme-toggle";
import {firebaseAuth} from "@/lib/firebase/client";
import {Link, usePathname, useRouter} from "@/i18n/navigation";
import {LanguageSwitcher} from "./language-switcher";

const links = [["home", "/"], ["about", "/about"], ["services", "/services"], ["doctors", "/doctors"], ["appointment", "/appointment"], ["contact", "/contact"]] as const;
type AccountRole="PATIENT"|"RECEPTIONIST"|"ADMIN";

export function SiteNav() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [menu, setMenu] = useState(false);
  const [profile, setProfile] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth) return;
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setRole(null);
      if (!nextUser) return;
      fetch("/api/auth/session", {cache: "no-store"})
        .then(async (response) => {
          if (!response.ok) throw new Error("Could not load the account role.");
          return await response.json() as {user: {role: AccountRole} | null};
        })
        .then((result) => {
          if (active && auth.currentUser?.uid === nextUser.uid) setRole(result.user?.role ?? null);
        })
        .catch((error: unknown) => {
          if (!active || auth.currentUser?.uid !== nextUser.uid) return;
          console.error("Could not load the signed-in user's role:", error);
          setRole(null);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setProfile(false);
      if (!navRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfile(false);
        setMenu(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(()=>{
    if(!menu)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=previousOverflow};
  },[menu]);

  async function logout() {
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/session", {method: "DELETE"});
      if (firebaseAuth) await signOut(firebaseAuth);
      if (!response.ok) throw new Error(common("error"));
      setProfile(false);
      router.push("/");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : common("error"));
    }
  }

  const action = !user
    ? {label: t("book"), href: "/appointment"}
    : role === "PATIENT"
      ? {label: t("bookings"), href: "/patient/dashboard/bookings"}
      : role === "RECEPTIONIST"
        ? {label: t("myAppointment"), href: "/receptionist/dashboard/appointments"}
        : role === "ADMIN"
          ? {label: t("dashboard"), href: "/admin/dashboard"}
          : {label: t("dashboard"), href: "/dashboard"};

  return <header className="site-header">
    <div className="nav-shell" ref={navRef}>
      <Link className="brand" href="/" aria-label="SmileCraft home"><span className="brand-mark"><span /></span><span>smile<span className="brand-light">craft</span></span></Link>
      <button className={`mobile-nav-backdrop ${menu ? "is-open" : ""}`} type="button" aria-label={t("close")} tabIndex={menu?0:-1} onClick={()=>setMenu(false)}/>
      <nav id="mobile-navigation" className={`main-nav ${menu ? "is-open" : ""}`} aria-label="Main navigation">
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">smile<span>craft</span></span>
          <button className="mobile-nav-close icon-button" type="button" aria-label={t("close")} onClick={()=>setMenu(false)}><X size={20}/></button>
        </div>
        {links.map(([key, url]) => {
          const active = url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`);
          return <Link key={key} href={url} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined} onClick={() => setMenu(false)}>{t(key)}</Link>;
        })}
        <div className="mobile-nav-actions"><LanguageSwitcher /><ThemeToggle /></div>
        <div className="mobile-auth-actions">
          {user ? <Link className="button button-primary" href={action.href} onClick={() => setMenu(false)}>{action.label}</Link> : <><Link href="/sign-in" onClick={() => setMenu(false)}>{t("signIn")}</Link><Link className="button button-primary" href={action.href} onClick={() => setMenu(false)}>{action.label}</Link></>}
        </div>
      </nav>
      <div className="nav-actions">
        <LanguageSwitcher /><ThemeToggle />
        {user ? <div className="profile-menu" ref={menuRef}>
          <button className="profile-trigger" aria-label="Open account menu" aria-expanded={profile} aria-haspopup="menu" onClick={() => setProfile((open) => !open)}>
            {user.photoURL ? <Image className="avatar" src={user.photoURL} alt="" width={33} height={33} unoptimized /> : <span className="avatar">{(user.displayName || user.email || "S").slice(0, 1).toUpperCase()}</span>}<ChevronDown size={15} />
          </button>
          {profile && <div className="profile-dropdown" role="menu">
            <div className="profile-summary"><strong>{user.displayName || "SmileCraft patient"}</strong><span>{user.email}</span></div>
            <Link role="menuitem" href="/dashboard" onClick={() => setProfile(false)}>{t("dashboard")}</Link>
            <Link role="menuitem" href="/dashboard/profile" onClick={() => setProfile(false)}>{t("profile")}</Link>
            <button role="menuitem" onClick={logout}>{t("signOut")}</button>
            {logoutError && <p className="logout-error" role="alert">{logoutError}</p>}
          </div>}
        </div> : <Link className="nav-signin" href="/sign-in">{t("signIn")}</Link>}
        <Link className="button button-primary nav-cta" href={action.href}>{action.label}<span>↗</span></Link>
        <button className="mobile-menu icon-button" aria-label={t("menu")} aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu((open) => !open)}><Menu /></button>
      </div>
    </div>
  </header>;
}
