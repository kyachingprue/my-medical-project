import type {ReactNode} from "react";
import {SiteNav} from "@/components/navigation/site-nav";
import {SiteFooter} from "./site-footer";

export function SiteShell({children}:{children:ReactNode}){return <><SiteNav/><main className="site-main">{children}</main><SiteFooter/></>}
