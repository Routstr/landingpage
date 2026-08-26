"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const STORAGE_KEY = "routstr-theme";
type LegacyMediaQueryList = MediaQueryList & {
  addListener(listener: (event: MediaQueryListEvent) => void): void;
  removeListener(listener: (event: MediaQueryListEvent) => void): void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getPreferredTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Some private browsing configurations deny persistent storage.
  }
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Match the server's initial markup, then sync the saved or system theme
  // after hydration without producing different server and client trees.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const applyTheme = (next: Theme) => {
      document.documentElement.classList.toggle("dark", next === "dark");
      setTheme(next);
    };
    const syncSystemTheme = () => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        // No stored choice means the system preference remains authoritative.
      }
      if (stored !== "dark" && stored !== "light") applyTheme(getPreferredTheme());
    };

    applyTheme(getPreferredTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    if ("addEventListener" in media) {
      media.addEventListener("change", syncSystemTheme);
    } else {
      (media as LegacyMediaQueryList).addListener(syncSystemTheme);
    }
    return () => {
      if ("removeEventListener" in media) {
        media.removeEventListener("change", syncSystemTheme);
      } else {
        (media as LegacyMediaQueryList).removeListener(syncSystemTheme);
      }
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Theme selection still applies for this session without storage.
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
