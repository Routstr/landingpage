"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { gsap, useGSAP } from "@/lib/gsap";
import { useInView } from "@/hooks/use-in-view";
import { BitcoinLogo } from "@/components/icons/BitcoinLogo";

// ---------------------------------------------------------------------------
// Shared geometric primitives
// ---------------------------------------------------------------------------

type Point = { x: number; y: number };

// Flat-shaded polygon glyph — the hero's icosahedron fragments, in SVG: a
// translucent body, crisp outline, and gem-style facet lines between an outer
// and an inner rotated polygon.
function GeometricGlyph({
  sides,
  className,
  fillOpacity = 0.12,
}: {
  sides: number;
  className?: string;
  fillOpacity?: number;
}) {
  const cx = 50;
  const cy = 50;
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    outer.push({ x: cx + Math.cos(a) * 44, y: cy + Math.sin(a) * 44 });
    const b = a + Math.PI / sides;
    inner.push({ x: cx + Math.cos(b) * 21, y: cy + Math.sin(b) * 21 });
  }
  const toPoints = (pts: Point[]) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <polygon
        points={toPoints(outer)}
        fill="currentColor"
        fillOpacity={fillOpacity}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <polygon
        points={toPoints(inner)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.4}
        strokeLinejoin="round"
      />
      {outer.map((p, i) => (
        <g key={i} opacity={0.3}>
          <line x1={p.x} y1={p.y} x2={inner[i].x} y2={inner[i].y} stroke="currentColor" strokeWidth={1} />
          <line
            x1={p.x}
            y1={p.y}
            x2={inner[(i + 1) % sides].x}
            y2={inner[(i + 1) % sides].y}
            stroke="currentColor"
            strokeWidth={1}
          />
        </g>
      ))}
    </svg>
  );
}

// A positioned glyph node: outer div (position + step pulses), inner div
// (slow rotation breathing), label centered on top of the glyph.
function GlyphNode({
  sides,
  position,
  label,
  glyphClassName,
  labelClassName,
  scaleRef,
  rotRef,
  glyphSize,
}: {
  sides: number;
  position: Point;
  label: string;
  glyphClassName?: string;
  labelClassName?: string;
  scaleRef?: (el: HTMLDivElement | null) => void;
  rotRef?: (el: HTMLDivElement | null) => void;
  glyphSize: string;
}) {
  return (
    <div
      ref={scaleRef}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div className="relative">
        <div ref={rotRef}>
          <GeometricGlyph sides={sides} className={cn(glyphSize, glyphClassName)} />
        </div>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-mono text-[9px] select-none",
            labelClassName
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// Narrow-viewport detection so diagrams can reflow into a vertical layout.
function useNarrow(ref: RefObject<HTMLDivElement | null>, breakpoint = 560) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < breakpoint);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, breakpoint]);
  return narrow;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function LandingFeatures() {
  const features = [
    {
      title: "OpenAI compatible API",
      description:
        "Works seamlessly with any OpenAI SDK, LangChain, or desktop application. A true drop-in replacement for chat completions without vendor lock-in.",
      visual: <ApiRequestSkeleton />,
    },
    {
      title: "Pay-per-request",
      description:
        "No monthly subscriptions. Pay precisely for the tokens you generate using seamless eCash and Bitcoin Lightning micropayments.",
      visual: <PaymentSkeleton />,
    },
    {
      title: "Decentralized discovery",
      description:
        "Find and connect to providers through Nostr relays. Say goodbye to central registries and single points of failure.",
      visual: <NetworkSkeleton />,
    },
    {
      title: "Simple deployment",
      description:
        "Monetize your own hardware by running the Routstr proxy in a single Docker container. Connect to a mint and start earning immediately.",
      visual: <DockerSkeleton />,
    },
  ];

  return (
    <div className="w-full relative">
      <div className="px-[clamp(1rem,5vw,5rem)] py-16 md:py-24 max-w-[1800px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 md:mb-20">
          <div>
            <h2 className="text-2xl md:text-3xl font-medium text-foreground mb-4 tracking-tight">
              Key capabilities
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl font-light leading-relaxed">
              Everything needed to route AI requests over Bitcoin and Nostr — no accounts, no lock-in.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-y-16 md:gap-y-24">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col group gap-6 md:gap-8">
              <div>
                <span className="block text-xs text-muted-foreground font-mono mb-3">
                  0{index + 1}
                </span>
                <h3 className="text-base font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-light max-w-2xl">
                  {feature.description}
                </p>
              </div>
              <div className="w-full h-[300px] sm:h-[340px] md:h-[420px] rounded-xl overflow-hidden relative">
                {feature.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. OpenAI compatible API (terminal)
// ---------------------------------------------------------------------------

const ApiRequestSkeleton = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const highlight1Ref = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const highlight2Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        highlight1Ref.current,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.5, delay: 0.2, ease: "power2.out" }
      );
      gsap.fromTo(
        line1Ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 0.4 }
      );
      gsap.fromTo(
        highlight2Ref.current,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.5, delay: 0.3, ease: "power2.out" }
      );
      gsap.fromTo(
        line2Ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 0.5 }
      );
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="p-0 sm:p-2 md:p-6 w-full h-full flex flex-col justify-center items-center font-mono">
      <div className="w-full h-full bg-card border-0 sm:border border-border sm:rounded-xl overflow-hidden shadow-lg flex flex-col">
        <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-border bg-muted shrink-0">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-muted-foreground/30"></div>
            <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-muted-foreground/30"></div>
            <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-muted-foreground/30"></div>
          </div>
          <span className="text-muted-foreground text-[9px] md:text-[10px] ml-1 md:ml-2 font-mono">app.py</span>
        </div>

        <div className="py-4 md:py-5 px-3 md:px-6 text-[9px] sm:text-[10px] md:text-[11px] leading-[1.8] md:leading-[2] text-muted-foreground overflow-hidden flex-1 flex flex-col justify-center">
          <div className="whitespace-nowrap"><span className="text-foreground">client</span> = <span className="text-foreground">OpenAI</span>(</div>
          <div className="relative">
            <div
              ref={highlight1Ref}
              className="absolute -inset-x-3 md:-inset-x-4 inset-y-0 bg-emerald-500/[0.04] border-l-[3px] border-emerald-500/40"
            />
            <div
              ref={line1Ref}
              className="pl-3 md:pl-6 relative whitespace-nowrap overflow-hidden text-ellipsis"
            >
              <span className="text-muted-foreground">base_url</span>=<span className="text-emerald-500/80">&quot;https://api.routstr.com/v1&quot;</span>,
            </div>
          </div>
          <div className="relative">
            <div
              ref={highlight2Ref}
              className="absolute -inset-x-3 md:-inset-x-4 inset-y-0 bg-emerald-500/[0.04] border-l-[3px] border-emerald-500/40"
            />
            <div
              ref={line2Ref}
              className="pl-3 md:pl-6 relative whitespace-nowrap overflow-hidden text-ellipsis"
            >
              <span className="text-muted-foreground">api_key</span>=<span className="text-emerald-500/80">&quot;cashuA...&quot;</span>
            </div>
          </div>
          <div>)</div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Pay-per-request — geometric token flow
// ---------------------------------------------------------------------------

const PaymentSkeleton = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const isInView = useInView(rootRef, 0.3);
  const narrow = useNarrow(rootRef);
  const reduced = useReducedMotion();

  const userScaleRef = useRef<HTMLDivElement | null>(null);
  const userRotRef = useRef<HTMLDivElement | null>(null);
  const nodeScaleRef = useRef<HTMLDivElement | null>(null);
  const nodeRotRef = useRef<HTMLDivElement | null>(null);
  const aiScaleRef = useRef<HTMLDivElement | null>(null);
  const aiRotRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<HTMLDivElement | null>(null);
  const resRefs = useRef<(HTMLDivElement | null)[]>([]);
  const statusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isInView || reduced) return;
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, [isInView, reduced]);

  // Horizontal relay on desktop, vertical column on narrow viewports.
  const layout = narrow
    ? { user: { x: 50, y: 16 }, node: { x: 50, y: 50 }, ai: { x: 50, y: 84 } }
    : { user: { x: 13, y: 50 }, node: { x: 50, y: 50 }, ai: { x: 87, y: 50 } };
  const { user, node, ai } = layout;

  // Slow, opposing rotation drift — the hero fragments' idle breathing.
  useGSAP(
    () => {
      if (reduced) return;
      const drifts: { el: HTMLDivElement | null; deg: number; dur: number }[] = [
        { el: userRotRef.current, deg: -7, dur: 3.4 },
        { el: nodeRotRef.current, deg: 6, dur: 4.1 },
        { el: aiRotRef.current, deg: -5, dur: 3.8 },
      ];
      for (const { el, deg, dur } of drifts) {
        if (!el) continue;
        gsap.to(el, {
          rotate: deg,
          duration: dur,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      }
    },
    { scope: rootRef, dependencies: [reduced] }
  );

  useGSAP(
    () => {
      gsap.to(userScaleRef.current, {
        scale: step >= 1 ? 1.06 : 1,
        duration: 0.5,
        ease: "power2.out",
      });
      gsap.to(nodeScaleRef.current, {
        scale: step >= 2 ? 1.06 : 1,
        duration: 0.5,
        ease: "power2.out",
      });
      gsap.to(aiScaleRef.current, {
        scale: step >= 3 ? 1.06 : 1,
        duration: 0.5,
        ease: "power2.out",
      });

      // 1 — the eCash token flies from the user to the node.
      if (step === 1 && tokenRef.current) {
        gsap.fromTo(
          tokenRef.current,
          {
            left: `${user.x}%`,
            top: `${user.y}%`,
            opacity: 0,
            scale: 0.5,
            rotate: -30,
          },
          {
            left: `${node.x}%`,
            top: `${node.y}%`,
            opacity: 1,
            scale: 1,
            rotate: 120,
            duration: 0.95,
            delay: 0.1,
            ease: "power2.inOut",
          }
        );
        gsap.to(tokenRef.current, {
          opacity: 0,
          scale: 0.6,
          duration: 0.25,
          delay: 1.15,
          ease: "power1.in",
        });
      }

      // 2 — the request is forwarded to the model.
      if (step === 2 && requestRef.current) {
        gsap.fromTo(
          requestRef.current,
          {
            left: `${node.x}%`,
            top: `${node.y}%`,
            opacity: 0,
            scale: 0.5,
          },
          {
            left: `${ai.x}%`,
            top: `${ai.y}%`,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            delay: 0.1,
            ease: "power2.inOut",
          }
        );
        gsap.to(requestRef.current, {
          opacity: 0,
          scale: 0.6,
          duration: 0.2,
          delay: 0.85,
          ease: "power1.in",
        });
      }

      // 3 — the response streams back through the node to the user.
      if (step === 3) {
        resRefs.current.forEach((el, i) => {
          if (!el) return;
          const tl = gsap.timeline({ delay: i * 0.18 });
          tl.set(el, {
            left: `${ai.x}%`,
            top: `${ai.y}%`,
            opacity: 0,
            scale: 0.7,
            rotate: 45,
          });
          tl.to(el, { opacity: 1, duration: 0.15 });
          tl.to(
            el,
            { left: `${node.x}%`, top: `${node.y}%`, duration: 0.5, ease: "power2.inOut" },
            0.12
          );
          tl.to(
            el,
            { left: `${user.x}%`, top: `${user.y}%`, duration: 0.5, ease: "power2.inOut" },
            0.58
          );
          tl.to(el, { opacity: 0, duration: 0.2 }, 0.98);
        });
      }

      gsap.to(statusRef.current, {
        opacity: step >= 1 ? 1 : 0,
        y: step >= 1 ? 0 : 5,
        duration: 0.4,
      });
    },
    { dependencies: [step, narrow], scope: rootRef }
  );

  return (
    <div ref={rootRef} className="w-full h-full relative overflow-hidden">
      {/* Connection mesh */}
      <svg className="absolute inset-0 w-full h-full text-border" style={{ opacity: 0.7 }}>
        <line
          x1={`${user.x}%`}
          y1={`${user.y}%`}
          x2={`${node.x}%`}
          y2={`${node.y}%`}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <line
          x1={`${node.x}%`}
          y1={`${node.y}%`}
          x2={`${ai.x}%`}
          y2={`${ai.y}%`}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      </svg>

      <GlyphNode
        sides={6}
        position={user}
        label="you"
        glyphSize="w-12 h-12 md:w-14 md:h-14"
        glyphClassName={cn(
          "transition-colors",
          step >= 1 ? "text-foreground" : "text-muted-foreground/60"
        )}
        labelClassName={step >= 1 ? "text-foreground" : "text-muted-foreground/60"}
        scaleRef={(el) => { userScaleRef.current = el; }}
        rotRef={(el) => { userRotRef.current = el; }}
      />
      <GlyphNode
        sides={7}
        position={node}
        label="node"
        glyphSize="w-12 h-12 md:w-14 md:h-14"
        glyphClassName={cn(
          "transition-colors",
          step >= 2 ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground/60"
        )}
        labelClassName={step >= 2 ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground/60"}
        scaleRef={(el) => { nodeScaleRef.current = el; }}
        rotRef={(el) => { nodeRotRef.current = el; }}
      />
      <GlyphNode
        sides={5}
        position={ai}
        label="AI"
        glyphSize="w-12 h-12 md:w-14 md:h-14"
        glyphClassName={cn(
          "transition-colors",
          step >= 3 ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground/60"
        )}
        labelClassName={step >= 3 ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground/60"}
        scaleRef={(el) => { aiScaleRef.current = el; }}
        rotRef={(el) => { aiRotRef.current = el; }}
      />

      {/* Traveling glyphs */}
      <div
        ref={tokenRef}
        className="absolute z-20 w-7 h-7 md:w-8 md:h-8 opacity-0"
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <div className="relative w-full h-full text-foreground">
          <GeometricGlyph sides={6} className="w-full h-full" fillOpacity={0.2} />
          <BitcoinLogo className="absolute inset-0 m-auto w-[46%] h-[46%]" />
        </div>
      </div>
      <div
        ref={requestRef}
        className="absolute z-20 w-4 h-4 md:w-5 md:h-5 opacity-0"
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <GeometricGlyph sides={4} className="w-full h-full text-foreground/80" fillOpacity={0.25} />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => { resRefs.current[i] = el; }}
          className="absolute z-20 w-3 h-3 md:w-3.5 md:h-3.5 opacity-0"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <GeometricGlyph
            sides={4}
            className="w-full h-full text-emerald-500 dark:text-emerald-400"
            fillOpacity={0.25}
          />
        </div>
      ))}

      {/* Status text */}
      <div
        ref={statusRef}
        className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center"
        style={{ opacity: 0, transform: "translateY(5px)" }}
      >
        <span
          className={cn(
            "text-[9px] md:text-[11px] font-mono",
            step === 1 && "text-amber-500/70",
            step === 2 && "text-emerald-500/70",
            step >= 3 && "text-green-400/70"
          )}
        >
          {step === 1 && "Validating payment..."}
          {step === 2 && "Forwarding request..."}
          {step >= 3 && "Streaming response"}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Decentralized discovery — geometric relay map
// ---------------------------------------------------------------------------

const NetworkSkeleton = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const isInView = useInView(rootRef, 0.3);
  const narrow = useNarrow(rootRef);
  const reduced = useReducedMotion();

  const userScaleRef = useRef<HTMLDivElement | null>(null);
  const userRotRef = useRef<HTMLDivElement | null>(null);
  const relayScaleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const relayRotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const providerScaleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const providerRotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const packetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const statusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isInView || reduced) return;
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 1600);
    return () => clearInterval(interval);
  }, [isInView, reduced]);

  // Horizontal constellation on desktop; vertical relay stack on mobile.
  const layout = narrow
    ? {
        user: { x: 50, y: 14 },
        relays: [
          { x: 28, y: 52 },
          { x: 72, y: 52 },
        ],
        providers: [
          { x: 14, y: 86 },
          { x: 38, y: 86 },
          { x: 62, y: 86 },
          { x: 86, y: 86 },
        ],
      }
    : {
        user: { x: 11, y: 50 },
        relays: [
          { x: 50, y: 24 },
          { x: 50, y: 76 },
        ],
        providers: [
          { x: 89, y: 14 },
          { x: 89, y: 38 },
          { x: 89, y: 62 },
          { x: 89, y: 86 },
        ],
      };
  const { user, relays, providers } = layout;

  // Slow opposing rotation drift on every glyph.
  useGSAP(
    () => {
      if (reduced) return;
      const entries: [(HTMLDivElement | null)[], number][] = [
        [[userRotRef.current], -6],
        [relayRotRefs.current, 8],
        [providerRotRefs.current, -8],
      ];
      entries.forEach(([els, deg], groupIndex) => {
        els.forEach((el, i) => {
          if (!el) return;
          gsap.to(el, {
            rotate: (i % 2 ? -deg : deg) as number,
            duration: 3.2 + groupIndex * 0.6 + i * 0.35,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        });
      });
    },
    { scope: rootRef, dependencies: [reduced, narrow] }
  );

  useGSAP(
    () => {
      gsap.to(userScaleRef.current, {
        scale: step === 1 || step === 3 ? 1.07 : 1,
        duration: 0.3,
      });
      relayScaleRefs.current.forEach((el) => {
        gsap.to(el, {
          scale: step === 1 || step === 2 ? 1.07 : 1,
          duration: 0.3,
        });
      });
      providerScaleRefs.current.forEach((el, i) => {
        gsap.to(el, {
          scale: step === 0 || (step === 3 && i === 1) ? 1.07 : 1,
          duration: 0.3,
        });
      });

      const packets = packetRefs.current;

      // 0 — providers announce themselves to the relays.
      if (step === 0) {
        packets.slice(0, 4).forEach((el, i) => {
          if (!el) return;
          const from = providers[i];
          const to = relays[i % 2];
          const tl = gsap.timeline({ delay: i * 0.16 });
          tl.set(el, {
            left: `${from.x}%`,
            top: `${from.y}%`,
            opacity: 0,
            rotate: 45,
          });
          tl.to(el, { opacity: 1, duration: 0.15 });
          tl.to(
            el,
            { left: `${to.x}%`, top: `${to.y}%`, duration: 0.8, ease: "power2.inOut" },
            0.12
          );
          tl.to(el, { opacity: 0, duration: 0.25 }, 0.75);
        });
      }

      // 1 — the client searches the relays.
      if (step === 1) {
        packets.slice(4, 6).forEach((el, i) => {
          if (!el) return;
          const to = relays[i];
          const tl = gsap.timeline({ delay: i * 0.12 });
          tl.set(el, {
            left: `${user.x}%`,
            top: `${user.y}%`,
            opacity: 0,
            rotate: 45,
          });
          tl.to(el, { opacity: 1, duration: 0.15 });
          tl.to(
            el,
            { left: `${to.x}%`, top: `${to.y}%`, duration: 0.8, ease: "power2.inOut" },
            0.12
          );
          tl.to(el, { opacity: 0, duration: 0.25 }, 0.75);
        });
      }

      // 2 — the relays return provider info to the client.
      if (step === 2) {
        packets.slice(4, 6).forEach((el, i) => {
          if (!el) return;
          const from = relays[i];
          const tl = gsap.timeline({ delay: i * 0.12 });
          tl.set(el, {
            left: `${from.x}%`,
            top: `${from.y}%`,
            opacity: 0,
            rotate: 45,
          });
          tl.to(el, { opacity: 1, duration: 0.15 });
          tl.to(
            el,
            { left: `${user.x}%`, top: `${user.y}%`, duration: 0.8, ease: "power2.inOut" },
            0.12
          );
          tl.to(el, { opacity: 0, duration: 0.25 }, 0.75);
        });
      }

      // 3 — the client connects directly to a provider.
      if (step === 3) {
        const el = packets[0];
        if (el) {
          const to = providers[1];
          const tl = gsap.timeline();
          tl.set(el, {
            left: `${user.x}%`,
            top: `${user.y}%`,
            opacity: 0,
            rotate: 45,
          });
          tl.to(el, { opacity: 1, duration: 0.15 }, 0.25);
          tl.to(
            el,
            { left: `${to.x}%`, top: `${to.y}%`, duration: 1.0, ease: "power2.inOut" },
            0.3
          );
          tl.to(el, { opacity: 0, duration: 0.3 }, 1.1);
        }
      }

      gsap.to(statusRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
      });
    },
    { dependencies: [step, narrow], scope: rootRef }
  );

  const lineTransition = { transition: "stroke-dashoffset 0.8s ease" };

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden">
      {/* Connection mesh */}
      <svg className="absolute inset-0 w-full h-full text-border" style={{ opacity: 0.7 }}>
        {relays.map((r) =>
          providers.map((p) => (
            <line
              key={`${r.x}-${r.y}-${p.x}-${p.y}`}
              x1={`${r.x}%`}
              y1={`${r.y}%`}
              x2={`${p.x}%`}
              y2={`${p.y}%`}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          ))
        )}
        {relays.map((r) => (
          <line
            key={`u-${r.x}-${r.y}`}
            x1={`${user.x}%`}
            y1={`${user.y}%`}
            x2={`${r.x}%`}
            y2={`${r.y}%`}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}
        {/* Direct connection drawn on the connect step */}
        <line
          x1={`${user.x}%`}
          y1={`${user.y}%`}
          x2={`${providers[1].x}%`}
          y2={`${providers[1].y}%`}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={step === 3 ? 0 : 1}
          className={cn(
            "transition-colors",
            step === 3 ? "text-emerald-500 dark:text-emerald-400" : "text-transparent"
          )}
          strokeWidth="1.5"
          style={lineTransition}
        />
      </svg>

      {/* Glyph nodes */}
      <GlyphNode
        sides={6}
        position={user}
        label="you"
        glyphSize="w-11 h-11 md:w-13 md:h-13"
        glyphClassName={cn(
          "transition-colors",
          step === 1 || step === 3 ? "text-foreground" : "text-muted-foreground/60"
        )}
        labelClassName={step === 1 || step === 3 ? "text-foreground" : "text-muted-foreground/60"}
        scaleRef={(el) => { userScaleRef.current = el; }}
        rotRef={(el) => { userRotRef.current = el; }}
      />
      {relays.map((r, i) => (
        <GlyphNode
          key={`relay-${i}`}
          sides={4}
          position={r}
          label={`R${i + 1}`}
          glyphSize="w-10 h-10 md:w-11 md:h-11"
          glyphClassName={cn(
            "transition-colors",
            step === 1 || step === 2
              ? "text-purple-600 dark:text-purple-300"
              : "text-muted-foreground/60"
          )}
          labelClassName={
            step === 1 || step === 2
              ? "text-purple-600 dark:text-purple-300"
              : "text-muted-foreground/60"
          }
          scaleRef={(el) => { relayScaleRefs.current[i] = el; }}
          rotRef={(el) => { relayRotRefs.current[i] = el; }}
        />
      ))}
      {providers.map((p, i) => (
        <GlyphNode
          key={`provider-${i}`}
          sides={5 + (i % 3)}
          position={p}
          label={`P${i + 1}`}
          glyphSize="w-10 h-10 md:w-11 md:h-11"
          glyphClassName={cn(
            "transition-colors",
            step === 0 || (step === 3 && i === 1)
              ? "text-amber-500 dark:text-amber-400"
              : "text-muted-foreground/60"
          )}
          labelClassName={
            step === 0 || (step === 3 && i === 1)
              ? "text-amber-600 dark:text-amber-300"
              : "text-muted-foreground/60"
          }
          scaleRef={(el) => { providerScaleRefs.current[i] = el; }}
          rotRef={(el) => { providerRotRefs.current[i] = el; }}
        />
      ))}

      {/* Traveling packets */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          ref={(el) => { packetRefs.current[i] = el; }}
          className="absolute z-20 w-2.5 h-2.5 md:w-3 md:h-3 opacity-0"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div
            className={cn(
              "w-full h-full rotate-45",
              step === 0 && "bg-amber-500/80 dark:bg-amber-400/80",
              (step === 1 || step === 2) && "bg-foreground/70",
              step === 3 && "bg-emerald-500/80 dark:bg-emerald-400/80"
            )}
          />
        </div>
      ))}

      {/* Status text */}
      <div
        ref={statusRef}
        className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center"
        style={{ opacity: 0 }}
      >
        <span
          className={cn(
            "text-[9px] md:text-[11px] font-mono",
            step === 0 && "text-amber-500/60",
            (step === 1 || step === 2) && "text-foreground/80",
            step === 3 && "text-emerald-500/60"
          )}
        >
          {step === 0 && "Providers announce to relays"}
          {step === 1 && "Client searches relays"}
          {step === 2 && "Relays return provider info"}
          {step === 3 && "Client connects directly"}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. Simple deployment (terminal)
// ---------------------------------------------------------------------------

const DockerSkeleton = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [logIndex, setLogIndex] = useState(0);
  const isInView = useInView(rootRef, 0.3);
  const statusDotRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const logRefs = useRef<(HTMLDivElement | null)[]>([]);

  const logs = [
    { type: "info", text: "Starting Routstr Proxy v0.1.0..." },
    { type: "success", text: "Connected to relay: wss://relay.damus.io" },
    { type: "success", text: "Listening on :8080" },
    { type: "request", text: "POST /v1/chat/completions" },
    { type: "payment", text: "Cashu token validated: 150 sats" },
    { type: "success", text: "Response sent (200 OK) • 847 tokens" },
  ];

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setLogIndex((i) => (i + 1) % logs.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isInView, logs.length]);

  const visibleLogs = logs.slice(0, Math.min(logIndex + 1, logs.length));

  useGSAP(
    () => {
      if (!statusDotRef.current) return;
      if (isInView) {
        gsap.fromTo(
          statusDotRef.current,
          { opacity: 0.3 },
          { opacity: 0.8, duration: 0.75, repeat: -1, yoyo: true, ease: "sine.inOut" }
        );
      } else {
        gsap.to(statusDotRef.current, { opacity: 0.3, duration: 0.3 });
      }
    },
    { dependencies: [isInView], scope: rootRef }
  );

  useGSAP(
    () => {
      if (!cursorRef.current) return;
      if (isInView) {
        gsap.fromTo(
          cursorRef.current,
          { opacity: 1 },
          { opacity: 0, duration: 0.5, repeat: -1, yoyo: true, ease: "none" }
        );
      } else {
        gsap.to(cursorRef.current, { opacity: 1, duration: 0.2 });
      }
    },
    { dependencies: [isInView], scope: rootRef }
  );

  useGSAP(
    () => {
      const el = logRefs.current[visibleLogs.length - 1];
      if (!el) return;
      gsap.fromTo(
        el,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
    },
    { dependencies: [visibleLogs.length], scope: rootRef }
  );

  return (
    <div ref={rootRef} className="w-full h-full p-0 sm:p-2 md:p-6 font-mono text-[9px] sm:text-[10px] md:text-[11px] overflow-hidden flex flex-col justify-center items-center">
      <div className="w-full h-full bg-card border-0 sm:border border-border sm:rounded-xl overflow-hidden shadow-lg flex flex-col">
        <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-border bg-muted shrink-0">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-muted-foreground/30"></div>
            <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-muted-foreground/30"></div>
            <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-muted-foreground/30"></div>
          </div>
          <span className="text-muted-foreground text-[9px] md:text-[10px] ml-1 md:ml-2 font-mono">routstr-proxy</span>
          <div className="ml-auto flex items-center gap-1.5">
            <div
              ref={statusDotRef}
              className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-foreground/40"
              style={{ opacity: 0.3 }}
            />
          </div>
        </div>

        <div className="py-3 md:py-5 px-3 md:px-6 flex-1 flex flex-col overflow-hidden leading-[1.6] md:leading-[2]">
          <div className="text-foreground mb-2 md:mb-3 whitespace-nowrap overflow-hidden text-ellipsis shrink-0 text-[8px] sm:text-[10px] md:text-[11px]">
            <span className="text-muted-foreground mr-1 md:mr-2">root@routstr:~#</span>docker run -p 8080:8080 routstr/proxy
          </div>

          <div className="flex-1 flex flex-col justify-start min-h-0 overflow-hidden text-[8px] sm:text-[10px] md:text-[11px]">
            <div className="space-y-1 md:space-y-1.5 w-full flex flex-col">
              {visibleLogs.map((log, i) => (
                <div
                  key={i}
                  ref={(el) => { logRefs.current[i] = el; }}
                  className="flex items-start gap-1.5 md:gap-2 w-full"
                >
                  <span className="text-muted-foreground/70 shrink-0 hidden sm:inline">12:00:{String(i).padStart(2, '0')}</span>
                  <span className={cn(
                    "shrink-0 font-bold w-[32px] sm:w-auto",
                    log.type === "info" && "text-blue-400/70",
                    log.type === "success" && "text-green-400/70",
                    log.type === "request" && "text-foreground",
                    log.type === "payment" && "text-orange-400/70",
                  )}>
                    {log.type === "info" && "[INFO]"}
                    {log.type === "success" && "[OK]  "}
                    {log.type === "request" && "[REQ] "}
                    {log.type === "payment" && "[PAY] "}
                  </span>
                  <span className="text-muted-foreground truncate whitespace-nowrap">{log.text}</span>
                </div>
              ))}

              <div
                ref={cursorRef}
                className="text-muted-foreground/70 mt-1 shrink-0"
              >
                ▋
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
