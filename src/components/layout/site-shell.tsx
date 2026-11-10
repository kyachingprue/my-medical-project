import type {ReactNode} from "react";
import {SiteNav} from "@/components/navigation/site-nav";
import {SiteFooter} from "./site-footer";
import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {prisma} from "@/lib/prisma";

export async function SiteShell({children}:{children:ReactNode}){
  await connection();
  const [settings,t]=await Promise.all([
    prisma.clinicSettings.findUnique({where:{id:"clinic"},select:{announcementEnabled:true,announcement:true}}),
    getTranslations("clinicSettings"),
  ]);
  return <>
    <SiteNav/>
    {settings?.announcementEnabled&&settings.announcement?<div role="status" className="mx-auto mt-4 flex w-[min(100%-24px,1180px)] items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--teal)_25%,var(--line))] bg-[var(--mint)] px-4 py-3 text-sm text-[var(--text)]"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--teal)]"/><p className="m-0 leading-6"><span className="font-semibold">{t("announcementLabel")}: </span>{settings.announcement}</p></div>:null}
    <main className="tw-site-main min-h-[60vh]">{children}</main>
    <SiteFooter/>
  </>;
}
