"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

type LegacyMediaQueryList = MediaQueryList & {
  addListener(listener: (event: MediaQueryListEvent) => void): void;
};

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const applyReducedMotion = (matches: boolean) => {
    // Collapse every GSAP tween/timeline to effectively instant instead of
    // disabling animation entirely — state still lands correctly, it just
    // doesn't animate to get there.
    gsap.globalTimeline.timeScale(matches ? 1000 : 1);
  };
  applyReducedMotion(reducedMotion.matches);
  const handleReducedMotionChange = (event: MediaQueryListEvent) => applyReducedMotion(event.matches);
  if ("addEventListener" in reducedMotion) {
    reducedMotion.addEventListener("change", handleReducedMotionChange);
  } else {
    (reducedMotion as LegacyMediaQueryList).addListener(handleReducedMotionChange);
  }
}

export { gsap, ScrollTrigger, useGSAP };
