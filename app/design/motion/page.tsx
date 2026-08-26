"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DesignSection, DesignBlock } from "../DesignSection";

const easings = [
  { name: "power2.out", use: "Default for entrances — cards, highlights, menu open/close." },
  { name: "power1.inOut", use: "Position tweens that move back and forth (payment token travel)." },
  { name: "power2.in", use: "Exits — menu close, fade-outs." },
  { name: "sine.inOut", use: "Slow ambient loops (status dot breathing) — yoyo: true, repeat: -1." },
  { name: "none", use: "Linear opacity ramps inside a timeline (fade up then down evenly)." },
];

const durations = [
  { ms: "0.14s", use: "Word-flip snap (Hero headline cycling)." },
  { ms: "0.2 – 0.3s", use: "Micro-interactions — menu toggle, button/card state change." },
  { ms: "0.4 – 0.5s", use: "Entrances, bar/progress fills, skeleton step transitions." },
  { ms: "1.2 – 1.5s", use: "Ambient step cycles inside scroll-triggered demos (network/payment flow)." },
];

function EasingDemo({ ease }: { ease: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
    tl.fromTo(boxRef.current, { x: 0 }, { x: "calc(100% - 1.25rem)", duration: 0.9, ease });
    tl.to(boxRef.current, { x: 0, duration: 0.9, ease });
  }, { scope: trackRef });

  return (
    <div ref={trackRef} className="relative h-5 w-full rounded-full bg-muted">
      <div ref={boxRef} className="absolute left-0 top-0 h-5 w-5 rounded-full bg-brand" />
    </div>
  );
}

export default function DesignMotionPage() {
  return (
    <DesignSection
      eyebrow="Tokens"
      title="Motion"
      description="All animation runs through GSAP + @gsap/react (useGSAP) via a single lib/gsap.ts entry point — no framer-motion. Every tween animates transform/opacity only, never layout properties."
    >
      <DesignBlock title="Easing families">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
          {easings.map((e) => (
            <div key={e.name} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
              <span className="w-32 shrink-0 font-mono text-xs text-foreground">{e.name}</span>
              <div className="flex-1">
                <EasingDemo ease={e.name} />
              </div>
              <span className="text-xs text-muted-foreground sm:w-56 sm:shrink-0">{e.use}</span>
            </div>
          ))}
        </div>
      </DesignBlock>

      <DesignBlock title="Duration scale">
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {durations.map((d) => (
            <div key={d.ms} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-28 shrink-0 font-mono text-xs font-semibold text-foreground">{d.ms}</span>
              <span className="text-sm text-muted-foreground">{d.use}</span>
            </div>
          ))}
        </div>
      </DesignBlock>

      <DesignBlock title="Rules">
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-semibold text-foreground">Transform/opacity only.</span> No animating
            width/height/top/left directly except inside decorative SVG demos where layout cost is
            negligible (small fixed-size skeletons).
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-semibold text-foreground">Scroll-gated, not always-on.</span>{" "}
            Looping demos (payment flow, network discovery, docker logs) only run while their section
            is actually in view, via <code className="text-foreground">hooks/use-in-view.ts</code>, so
            off-screen sections aren&apos;t burning frames.
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-semibold text-foreground">prefers-reduced-motion is honored.</span>{" "}
            <code className="text-foreground">lib/gsap.ts</code> sets{" "}
            <code className="text-foreground">gsap.globalTimeline.timeScale(1000)</code> when the OS
            preference is set, collapsing every tween to effectively instant rather than disabling
            animation and leaving elements stuck mid-state. Raw CSS animations/transitions (e.g.{" "}
            <code className="text-foreground">animate-ping</code> status dots) are handled separately
            by a global <code className="text-foreground">@media (prefers-reduced-motion: reduce)</code>{" "}
            rule in <code className="text-foreground">globals.css</code>.
          </li>
        </ul>
      </DesignBlock>
    </DesignSection>
  );
}
