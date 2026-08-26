"use client";

import * as React from "react";

const MOBILE_BREAKPOINT = 768;
type LegacyMediaQueryList = MediaQueryList & {
  addListener(listener: (event: MediaQueryListEvent) => void): void;
  removeListener(listener: (event: MediaQueryListEvent) => void): void;
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    if ("addEventListener" in mql) {
      mql.addEventListener("change", onChange);
    } else {
      (mql as LegacyMediaQueryList).addListener(onChange);
    }
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => {
      if ("removeEventListener" in mql) {
        mql.removeEventListener("change", onChange);
      } else {
        (mql as LegacyMediaQueryList).removeListener(onChange);
      }
    };
  }, []);

  return !!isMobile;
}
