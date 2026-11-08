"use client";

import {ThemeProvider as NextThemeProvider} from "next-themes";
import {Toaster} from "sonner";
import type {ReactNode} from "react";

export function ThemeProvider({children}: {children: ReactNode}) {
  return <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>{children}<Toaster position="top-center" richColors/></NextThemeProvider>;
}
