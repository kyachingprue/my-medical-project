import type {ReactNode} from "react";
import {Suspense} from "react";
import {SiteNav} from "@/components/navigation/site-nav";
import {SiteFooter} from "./site-footer";
import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {prisma} from "@/lib/prisma";

export function SiteShell({children}:{children:ReactNode}){
  return <>
    <SiteNav/>
    <Suspense fallback={null}><PublicAnnouncement/></Suspense>
    <main className="tw-site-main min-h-[60vh]">{children}</main>
    <SiteFooter/>
  </>;
}

async function PublicAnnouncement(){
  await connection();
  const [settings,t]=await Promise.all([
    prisma.clinicSettings.findUnique({where:{id:"clinic"},select:{announcementEnabled:true,announcement:true}}),
    getTranslations("clinicSettings"),
  ]);
  if(!settings?.announcementEnabled||!settings.announcement)return null;
  return <div role="status" className="mx-auto mt-4 flex w-[min(100%-24px,1180px)] items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--teal)_25%,var(--line))] bg-[var(--mint)] px-4 py-3 text-sm text-[var(--text)]"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--teal)]"/><p className="m-0 leading-6"><span className="font-semibold">{t("announcementLabel")}: </span>{settings.announcement}</p></div>;
}
