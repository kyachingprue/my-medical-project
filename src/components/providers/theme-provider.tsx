"use client";

import {createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore} from "react";
import type {ReactNode} from "react";
import {AppToaster} from "@/components/providers/app-toaster";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
let activeTheme: Theme = "system";
const themeListeners = new Set<() => void>();

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getThemeSnapshot() {
  return activeTheme;
}

function getServerThemeSnapshot(): Theme {
  return "system";
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function updateTheme(theme: Theme) {
  if (activeTheme === theme) {
    return;
  }

  activeTheme = theme;
  themeListeners.forEach(listener => listener());
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerSystemTheme(): ResolvedTheme {
  return "light";
}

function subscribeToSystemTheme(listener: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
}

export function ThemeProvider({children}: {children: ReactNode}) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  const setTheme = useCallback((nextTheme: Theme) => {
    updateTheme(nextTheme);

    try {
      window.localStorage.setItem("theme", nextTheme);
    } catch (error) {
      console.error("Unable to save the selected theme.", error);
    }
  }, []);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("theme");
      if (isTheme(savedTheme)) {
        updateTheme(savedTheme);
      }
    } catch (error) {
      console.error("Unable to read the saved theme.", error);
    }

    const syncTheme = (event: StorageEvent) => {
      if (event.key === "theme") {
        updateTheme(isTheme(event.newValue) ? event.newValue : "system");
      }
    };
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo(() => ({theme, resolvedTheme, setTheme}), [theme, resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <AppToaster/>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}
