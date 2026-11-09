"use client";

import Image from "next/image";
import {onAuthStateChanged, signOut, type User} from "firebase/auth";
import {ChevronDown,Menu,X} from "lucide-react";
import {useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";
import {toast} from "react-hot-toast";
import {ThemeToggle} from "@/components/common/theme-toggle";
import {firebaseAuth} from "@/lib/firebase/client";
import {getSafeApiErrorMessage} from "@/lib/api/client-errors";
import {Link, usePathname, useRouter} from "@/i18n/navigation";
import {LanguageSwitcher} from "./language-switcher";

const links = [["home", "/"], ["about", "/about"], ["services", "/services"], ["doctors", "/doctors"], ["appointment", "/appointment"], ["contact", "/contact"]] as const;
type AccountRole="PATIENT"|"RECEPTIONIST"|"ADMIN";

export function SiteNav() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const feedback = useTranslations("feedback");
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [menu, setMenu] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(false);
  const [profile, setProfile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setIsMobileNav(media.matches);
      if (!media.matches) setMenu(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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
    const loadingToast=toast.loading(feedback("processing"));
    try {
      const response = await fetch("/api/auth/session", {method: "DELETE"});
      if (firebaseAuth) await signOut(firebaseAuth);
      if (!response.ok) {
        toast.error(getSafeApiErrorMessage(response.status,undefined,{
          permissionError:feedback("permissionError"),
          serverError:feedback("serverError"),
          validationError:feedback("validationError"),
          fallback:common("error"),
        }));
        return;
      }
      setProfile(false);
      toast.success(feedback("logoutSuccess"));
      router.push("/");
    } catch {toast.error(common("error"))}
    finally{toast.dismiss(loadingToast)}
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

  return <header className="tw-site-header sticky z-[30] top-[0] [background:color-mix(in_srgb,var(--bg)_90%,transparent)] [backdrop-filter:blur(16px)] [border-bottom:1px_solid_color-mix(in_srgb,var(--line)_75%,transparent)] [@media(max-width:760px)]:[backdrop-filter:none]">
    <div className="tw-nav-shell h-[78px] max-w-[length:1240px] p-[0_28px] m-[auto] flex items-center gap-[46px] [@media(max-width:980px)]:gap-[20px] [@media(max-width:760px)]:h-[66px] [@media(max-width:760px)]:p-[0_17px] [@media(max-width:760px)]:justify-between [@media(min-width:761px)]:grid [@media(min-width:761px)]:grid-cols-[auto_minmax(0,1fr)_auto] [@media(min-width:761px)]:gap-[16px]" ref={navRef}>
      <Link className="tw-brand inline-flex items-center gap-[10px] text-[length:23px] font-[750] tracking-[-1.2px] whitespace-nowrap [@media(min-width:761px)]:[.tw-nav-shell>&]:[justify-self:start]" href="/" aria-label="SmileCraft home"><span className="tw-brand-mark w-[28px] h-[28px] rounded-[10px_10px_10px_2px] [background:var(--teal)] grid [place-items:center] [transform:rotate(-8deg)] [&_span]:w-[11px] [&_span]:h-[11px] [&_span]:[border:2px_solid_white] [&_span]:rounded-[50%] [&_span]:relative [&_span:after]:[content:''] [&_span:after]:absolute [&_span:after]:[background:white] [&_span:after]:w-[3px] [&_span:after]:h-[5px] [&_span:after]:right-[-3px] [&_span:after]:bottom-[-3px] [&_span:after]:rounded-[5px] [.tw-clinic-sign_&]:w-[20px] [.tw-clinic-sign_&]:h-[20px]"><span /></span><span>smile<span className="tw-brand-light font-normal [color:var(--teal)] [.tw-brand-inverted_&]:[color:#b9ded2]">craft</span></span></Link>
      <button className={`hidden [@media(max-width:760px)]:fixed [@media(max-width:760px)]:inset-[0] [@media(max-width:760px)]:z-[40] [@media(max-width:760px)]:block [@media(max-width:760px)]:w-[100%] [@media(max-width:760px)]:h-[100%] [@media(max-width:760px)]:p-[0] [@media(max-width:760px)]:[border:0] [@media(max-width:760px)]:[background:rgba(10,25,23,.46)] [@media(max-width:760px)]:opacity-[0] [@media(max-width:760px)]:invisible [@media(max-width:760px)]:pointer-events-none [@media(max-width:760px)]:[transition:opacity_280ms_ease,visibility_0s_linear_280ms] [@media(prefers-reduced-motion:reduce)]:[transition:none]${menu?" [@media(max-width:760px)]:opacity-[1] [@media(max-width:760px)]:!visible [@media(max-width:760px)]:!pointer-events-auto [@media(max-width:760px)]:[transition:opacity_280ms_ease,visibility_0s]":""}`} type="button" aria-label={t("close")} tabIndex={menu?0:-1} onClick={()=>setMenu(false)}/>
      <nav id="mobile-navigation" aria-hidden={isMobileNav && !menu} inert={isMobileNav && !menu} style={{transform: isMobileNav && !menu ? "translateX(100%)" : "translateX(0)"}} className={`tw-main-nav flex items-center gap-[29px] flex-[1] [&_a]:text-[length:13px] [&_a]:font-semibold [&_a]:[color:var(--muted)] [&_a]:[transition:color_.2s] [&_a:hover]:[color:var(--teal)] [@media(max-width:980px)]:gap-[16px] [@media(max-width:980px)]:[&_a]:text-[length:11px] [@media(min-width:761px)]:[justify-self:start] [@media(min-width:761px)]:justify-start [@media(min-width:761px)]:gap-[5px] [@media(min-width:761px)]:flex-[none] [@media(min-width:761px)]:[&>a]:relative [@media(min-width:761px)]:[&>a]:p-[10px_13px] [@media(min-width:761px)]:[&>a]:rounded-[999px] [@media(min-width:761px)]:[&>a]:[transition:color_.18s,background_.18s,box-shadow_.18s] [@media(min-width:761px)]:[&>a:hover]:[background:var(--mint)] [@media(min-width:761px)_and_(max-width:980px)]:gap-[1px] [@media(min-width:761px)_and_(max-width:980px)]:[&>a]:p-[9px_8px] [@media(min-width:761px)_and_(max-width:980px)]:[&>a]:text-[length:10px] [@media(max-width:760px)]:fixed [@media(max-width:760px)]:top-[0] [@media(max-width:760px)]:right-[0] [@media(max-width:760px)]:bottom-[0] [@media(max-width:760px)]:left-auto [@media(max-width:760px)]:z-[50] [@media(max-width:760px)]:w-[88vw] [@media(max-width:760px)]:max-w-[390px] [@media(max-width:760px)]:h-[100vh] [@media(max-width:760px)]:h-[100dvh] [@media(max-width:760px)]:flex-col [@media(max-width:760px)]:items-stretch [@media(max-width:760px)]:justify-start [@media(max-width:760px)]:gap-[0] [@media(max-width:760px)]:overflow-y-auto [@media(max-width:760px)]:[overscroll-behavior:contain] [@media(max-width:760px)]:[align-content:start] [@media(max-width:760px)]:[padding:env(safe-area-inset-top)_20px_calc(24px_+_env(safe-area-inset-bottom))] [@media(max-width:760px)]:[border:0] [@media(max-width:760px)]:[border-left:1px_solid_var(--line)] [@media(max-width:760px)]:rounded-[0] [@media(max-width:760px)]:[background:var(--surface)] [@media(max-width:760px)]:shadow-[-18px_0_55px_rgba(20,45,41,.2)] [@media(max-width:760px)]:[transition:transform_320ms_cubic-bezier(.22,.8,.25,1)] [@media(max-width:760px)]:[&>a]:min-h-[48px] [@media(max-width:760px)]:[&>a]:flex [@media(max-width:760px)]:[&>a]:items-center [@media(max-width:760px)]:[&>a]:p-[12px_8px] [@media(max-width:760px)]:[&>a]:[border-bottom:1px_solid_var(--line)] [@media(max-width:760px)]:[&>a]:text-[length:14px] [@media(max-width:760px)]:[&>a]:[color:var(--text)] [@media(prefers-reduced-motion:reduce)]:[transition:none] ${menu ? "tw-is-open" : ""}`} aria-label="Main navigation">
        <div className="[@media(min-width:761px)]:hidden [@media(max-width:760px)]:sticky [@media(max-width:760px)]:z-[1] [@media(max-width:760px)]:top-[0] [@media(max-width:760px)]:flex [@media(max-width:760px)]:min-h-[76px] [@media(max-width:760px)]:items-center [@media(max-width:760px)]:justify-between [@media(max-width:760px)]:mb-[8px] [@media(max-width:760px)]:p-[0_0_12px] [@media(max-width:760px)]:[border-bottom:1px_solid_var(--line)] [@media(max-width:760px)]:[background:var(--surface)]">
          <span className="tw-mobile-nav-title [@media(max-width:760px)]:text-[length:20px] [@media(max-width:760px)]:font-[750] [@media(max-width:760px)]:tracking-[-.7px] [@media(max-width:760px)]:[color:var(--text)] [@media(max-width:760px)]:[&_span]:font-normal [@media(max-width:760px)]:[&_span]:[color:var(--teal)]">smile<span>craft</span></span>
          <button className="[@media(max-width:760px)]:grid [@media(max-width:760px)]:w-[42px] [@media(max-width:760px)]:h-[42px] [@media(max-width:760px)]:[place-items:center] [@media(max-width:760px)]:p-[0] [@media(max-width:760px)]:[border:1px_solid_var(--line)] [@media(max-width:760px)]:rounded-[12px] [@media(max-width:760px)]:[background:var(--surface)] [@media(max-width:760px)]:[color:var(--text)]" type="button" aria-label={t("close")} onClick={()=>setMenu(false)}><X size={22}/></button>
        </div>
        {links.map(([key, url]) => {
          const active = url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`);
          return <Link key={key} href={url} className={active ? "tw-is-active [@media(min-width:761px)]:[.tw-main-nav>a&]:[background:var(--mint)] [@media(min-width:761px)]:[.tw-main-nav>a&]:[color:var(--teal-dark)] [@media(min-width:761px)]:[.tw-main-nav>a&]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--teal)_14%,transparent)] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:[content:''] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:absolute [@media(min-width:761px)]:[.tw-main-nav>a&:after]:left-[50%] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:bottom-[4px] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:w-[13px] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:h-[2px] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:rounded-[2px] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:[background:var(--teal)] [@media(min-width:761px)]:[.tw-main-nav>a&:after]:[transform:translateX(-50%)] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:flex [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:items-center [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:[color:var(--teal-dark)] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:[background:var(--mint)] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:[border-bottom-color:transparent] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:rounded-[8px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:pl-[10px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:[content:''] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:w-[3px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:self-stretch [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:rounded-[3px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:[background:var(--teal)] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&:before]:mr-[8px] [@media(max-width:760px)]:[.tw-main-nav.tw-is-open>a&]:pl-[12px] [.tw-status-badge&]:[background:var(--mint)] [.tw-status-badge&]:[color:var(--teal-dark)]" : undefined} aria-current={active ? "page" : undefined} onClick={() => setMenu(false)}>{t(key)}</Link>;
        })}
        <div className="tw-mobile-nav-actions hidden [@media(max-width:760px)]:flex [@media(max-width:760px)]:gap-[13px] [@media(max-width:760px)]:p-[14px_4px_0] [@media(max-width:760px)]:gap-[16px] [@media(max-width:760px)]:p-[20px_8px_10px]"><LanguageSwitcher /><ThemeToggle /></div>
        <div className="tw-mobile-auth-actions hidden [@media(max-width:760px)]:grid [@media(max-width:760px)]:gap-[10px] [@media(max-width:760px)]:p-[8px_3px_4px] [@media(max-width:760px)]:[&>a]:text-[length:12px] [@media(max-width:760px)]:p-[14px_8px_4px]">
          {user ? <Link className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" href={action.href} onClick={() => setMenu(false)}>{action.label}</Link> : <><Link href="/sign-in" onClick={() => setMenu(false)}>{t("signIn")}</Link><Link className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px]" href={action.href} onClick={() => setMenu(false)}>{action.label}</Link></>}
        </div>
      </nav>
      <div className="tw-nav-actions flex items-center gap-[17px] [@media(max-width:980px)]:gap-[10px] [@media(min-width:761px)]:[justify-self:end] [@media(min-width:761px)_and_(max-width:980px)]:gap-[8px]">
        <LanguageSwitcher /><ThemeToggle />
        <button className="[@media(min-width:761px)]:hidden [@media(max-width:760px)]:grid [@media(max-width:760px)]:w-[40px] [@media(max-width:760px)]:h-[40px] [@media(max-width:760px)]:[flex:0_0_auto] [@media(max-width:760px)]:[place-items:center] [@media(max-width:760px)]:p-[0] [@media(max-width:760px)]:[border:1px_solid_var(--line)] [@media(max-width:760px)]:rounded-[12px] [@media(max-width:760px)]:[background:var(--surface)] [@media(max-width:760px)]:[color:var(--text)] [@media(max-width:760px)]:cursor-pointer [@media(max-width:760px)]:shadow-[0_3px_12px_color-mix(in_srgb,var(--teal)_10%,transparent)]" type="button" aria-label={t(menu?"close":"menu")} aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu((open) => !open)}><Menu size={21}/></button>
        {user ? <div className="tw-profile-menu relative" ref={menuRef}>
          <button className="tw-profile-trigger flex items-center gap-[7px] [border:0] [background:transparent] [color:var(--text)]" aria-label="Open account menu" aria-expanded={profile} aria-haspopup="menu" onClick={() => setProfile((open) => !open)}>
            {user.photoURL ? <Image className="tw-avatar w-[33px] h-[33px] grid [place-items:center] rounded-[50%] [background:var(--mint)] [color:var(--teal)] font-bold object-cover" src={user.photoURL} alt="" width={33} height={33} unoptimized /> : <span className="tw-avatar w-[33px] h-[33px] grid [place-items:center] rounded-[50%] [background:var(--mint)] [color:var(--teal)] font-bold object-cover">{(user.displayName || user.email || "S").slice(0, 1).toUpperCase()}</span>}<ChevronDown size={15} />
          </button>
          {profile && <div className="tw-profile-dropdown absolute right-[0] top-[48px] w-[220px] [background:var(--surface)] [border:1px_solid_var(--line)] rounded-[12px] p-[8px] shadow-[var(--shadow)] [&_a]:flex [&_a]:w-[100%] [&_a]:p-[10px] [&_a]:[border:0] [&_a]:[background:transparent] [&_a]:[color:var(--text)] [&_a]:text-[length:13px] [&_a]:text-left [&_a]:rounded-[7px] [&_button]:flex [&_button]:w-[100%] [&_button]:p-[10px] [&_button]:[border:0] [&_button]:[background:transparent] [&_button]:[color:var(--text)] [&_button]:text-[length:13px] [&_button]:text-left [&_button]:rounded-[7px] [&_a:hover]:[background:var(--mint)] [&_button:hover]:[background:var(--mint)]" role="menu">
            <div className="tw-profile-summary p-[9px_10px_12px] [border-bottom:1px_solid_var(--line)] mb-[5px] grid gap-[4px] [&_strong]:text-[length:13px] [&_span]:text-[length:11px] [&_span]:[color:var(--muted)]"><strong>{user.displayName || "SmileCraft patient"}</strong><span>{user.email}</span></div>
            <Link role="menuitem" href="/dashboard" onClick={() => setProfile(false)}>{t("dashboard")}</Link>
            <Link role="menuitem" href="/dashboard/profile" onClick={() => setProfile(false)}>{t("profile")}</Link>
            <button role="menuitem" onClick={logout}>{t("signOut")}</button>
          </div>}
        </div> : <Link className="tw-nav-signin text-[length:13px] font-semibold [color:var(--muted)] [transition:color_.2s] [&:hover]:[color:var(--teal)] [@media(max-width:760px)]:hidden" href="/sign-in">{t("signIn")}</Link>}
        <Link className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-primary [background:var(--teal)] [color:white] shadow-[0_7px_18px_color-mix(in_srgb,var(--teal)_25%,transparent)] [&:hover]:[background:var(--teal-dark)] [&_span]:text-[length:17px] tw-nav-cta p-[11px_15px] text-[length:12px] [@media(max-width:980px)]:hidden" href={action.href}>{action.label}<span>↗</span></Link>
      </div>
    </div>
  </header>;
}
