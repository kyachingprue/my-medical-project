import type {ReactNode} from "react";
import {Suspense} from "react";
import {connection} from "next/server";
import {SiteShell} from "@/components/layout/site-shell";
import {SiteNav} from "@/components/navigation/site-nav";
import {SiteFooter} from "@/components/layout/site-footer";

export default function PublicLayout({children}:{children:ReactNode}){
  return <Suspense fallback={<><SiteNav/><main className="min-h-[60vh]"/><SiteFooter/></>}>
    <RequestTimePublicLayout>{children}</RequestTimePublicLayout>
  </Suspense>;
}

async function RequestTimePublicLayout({children}:{children:ReactNode}){
  await connection();
  return <SiteShell>{children}</SiteShell>;
}
