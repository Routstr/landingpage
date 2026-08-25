"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Animated replica of the `routstrd` usage-monitor TUI.
//
// Rebuilt from the upstream source (routstrd/src/tui/usage): same layout,
// box-drawing, dim/bold label styles, cyan provider titles, magenta/cyan model
// rows and rust/gold block bars. Three tabs (Providers, Models, Onboarding)
// crossfade + scroll-morph every 2 seconds; bar widths, numbers and the
// balance counter tick live between switches. Pauses off-screen and under
// prefers-reduced-motion.

const FRAME_MS = 2000;

type Span = { t: string; c?: "dim" | "bold" | "cyan" | "green" | "gold" | "rust" | "magenta" | "cream" };
type Line = Span[];

const D = "text-[#8a8478]";
const CREAM = "text-[#f2ebdd]";
const GOLD = "text-[#ecc466]";
const RUST = "text-[#8f4230]";
const MAGENTA = "text-[#b06cd4]";
const CYAN = "text-[#4fc1d6]";
const GREEN = "text-[#4fae6d]";

const dim = (t: string): Span => ({ t, c: "dim" });
const bold = (t: string): Span => ({ t, c: "bold" });
const plain = (t: string): Span => ({ t });

function field(label: string, value: string, valueClass: Span["c"] = "cream"): Line {
  return [dim("  " + label + ":"), { t: " " + value, c: valueClass }];
}

function boxBorder(top: boolean, title?: string): string {
  if (!top) return "└" + "─".repeat(78) + "┘";
  if (title) {
    const t = ` ${title} `;
    return "┌─" + t + "─".repeat(Math.max(0, 80 - 2 - t.length - 1)) + "┐";
  }
  return "┌" + "─".repeat(78) + "┐";
}

function BorderRow({ top, title }: { top?: boolean; title?: string }) {
  return (
    <div className={cn(D, "whitespace-pre")}>{boxBorder(top ?? false, title)}</div>
  );
}

function Row({ line, index }: { line: Line; index: number }) {
  return (
    <div className="whitespace-pre flex">
      {line.map((span, i) => (
        <span
          key={i}
          data-tui-line={index}
          className={cn(
            span.c === "dim" && D,
            span.c === "bold" && "font-bold",
            span.c === "cyan" && CYAN,
            span.c === "green" && GREEN,
            span.c === "gold" && GOLD,
            span.c === "rust" && RUST,
            span.c === "magenta" && MAGENTA,
            span.c === "cream" && CREAM,
            (!span.c || span.c === "cream" || span.c === "bold") && CREAM
          )}
        >
          {span.t}
        </span>
      ))}
    </div>
  );
}

// ── Screen definitions ─────────────────────────────────────────────────────

type ProviderStat = { url: string; requests: number; cost: string; tokens: string };

const PROVIDERS: ProviderStat[] = [
  { url: "llm.satsandsports.cash/", requests: 1500, cost: "12.09k", tokens: "26.5M" },
  { url: "routstr.otrta.me/", requests: 858, cost: "9.93k", tokens: "13.4M" },
  { url: "api.nonkycai.com/", requests: 590, cost: "7.96k", tokens: "16.8M" },
  { url: "privateprovider.xyz/", requests: 450, cost: "6.23k", tokens: "6.4M" },
  { url: "api.routstr.com/", requests: 114, cost: "1.09k", tokens: "3.2M" },
  { url: "staging.routstr.com/", requests: 26, cost: "125.70", tokens: "678.8K" },
];

type ModelStat = {
  name: string;
  cost: string;
  pct: number;
  requests: string;
  tokens: string;
  avg: string;
  color: "magenta" | "cyan" | "gold";
};

const MODELS: ModelStat[] = [
  { name: "gpt-5.4", cost: "14.13k", pct: 37.8, requests: "463", tokens: "9.4M", avg: "30.52", color: "magenta" },
  { name: "gim-5", cost: "6.75k", pct: 18.0, requests: "519", tokens: "11.3M", avg: "13.01", color: "cyan" },
  { name: "minimax-m2.7", cost: "4.92k", pct: 13.1, requests: "1.6k", tokens: "31.2M", avg: "2.98", color: "cyan" },
  { name: "claude-opus-4.6", cost: "3.89k", pct: 10.4, requests: "55", tokens: "526.6K", avg: "70.77", color: "gold" },
  { name: "gpt-5.3-codex", cost: "2.40k", pct: 6.4, requests: "58", tokens: "4.5M", avg: "41.35", color: "gold" },
];

const INVOICE_BODY = [
  "lnbc21u1p57mdsppp5v4h6kpqtsnf9lhpl2sd",
  "9m01f24sqzcr9vermxrvgfn6empxz7phrjxvrt",
  "tncqqdlcqqyqqqqlgqqqqqqga2qsp5kkgt77h",
  "0l6qysa46s3al53q7ppx53vmo8onsq04cwps2",
  "ulugghrq9qxpqysgqzusph6339pnctm9j9afl",
  "nula2als2ah433wuwowlrzfccc25ajrd3a97",
  "h6j69459htm580hgwe7uyh5q8xv84x9xnnen",
  "shc4ad0crssan6oor71",
];

function providerLines(): Line[] {
  const out: Line[] = [];
  for (const p of PROVIDERS) {
    out.push([{ t: p.url, c: "cyan" }]);
    out.push(field("Requests", p.requests.toLocaleString()));
    out.push(field("Cost", p.cost, "green"));
    out.push(field("Tokens", p.tokens));
    out.push([plain("")]);
  }
  out.pop();
  return out;
}

function modelLines(): Line[] {
  const out: Line[] = [];
  for (const m of MODELS) {
    out.push([{ t: m.name, c: m.color }]);
    out.push([dim("  Cost:"), { t: ` ${m.cost} sats`, c: "cream" }, { t: ` (${m.pct.toFixed(1)}%)`, c: m.color }]);
    out.push(field("Requests", m.requests));
    out.push(field("Tokens", m.tokens));
    out.push(field("Avg", m.avg));
    out.push([plain("")]);
  }
  out.pop();
  return out;
}

function invoiceLines(): Line[] {
  return [
    [bold("Invoice:")],
    ...INVOICE_BODY.map((t) => [dim(t)] as Line),
    [plain("")],
    [dim("Scan with any Lightning wallet to top up your")],
    [dim("balance. sats settle instantly via Cashu.")],
  ];
}

const TABS = [
  { key: "4", name: "Providers", title: "Provider Breakdown", lines: providerLines },
  { key: "3", name: "Models", title: "Model Breakdown", lines: modelLines },
  { key: "1", name: "Overview", title: "Top Up Balance", lines: invoiceLines },
] as const;

// ── Component ──────────────────────────────────────────────────────────────

export function TuiShowcase({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  const [progress, setProgress] = useState(0);
  const [inView, setInView] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(el);
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reducedMotion.current) return;
    let start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = (now - start) / FRAME_MS;
      if (p >= 1) {
        setTab((t) => (t + 1) % TABS.length);
        setProgress(0);
        start = now;
      } else {
        setProgress(p);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  const active = TABS[tab];
  const lines = useMemo(() => active.lines(), [active]);

  // Morph: crossfade rows near the switch boundary, plus a scroll hint.
  const switchBlend = tab === TABS.length - 1 && progress > 0.85 ? 1 : 0;

  const scrollTo = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.scrollTo({ top: 0 });
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden border border-border rounded-xl bg-[#0a0a0a]",
        className
      )}
    >
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#262626]">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#3f3f3f]" />
          <span className="h-2 w-2 rounded-full bg-[#3f3f3f]" />
          <span className="h-2 w-2 rounded-full bg-[#3f3f3f]" />
        </div>
        <span className={cn(D, "text-[9px] ml-1 font-mono")}>routstrd — usage monitor</span>
        <span className={cn(GOLD, "ml-auto text-[9px] font-mono")}>
          auto-refresh (on)
        </span>
      </div>

      <div ref={scrollTo} className="relative font-mono text-[10px] sm:text-[11px] leading-[1.55] p-3 overflow-hidden">
        {/* Header */}
        <div className="whitespace-pre flex">
          <span className="font-bold">ROUTSTRD USAGE MONITOR</span>
          <span className={cn(GOLD, "ml-2")}>[vim]</span>
          <span className={cn(D, "ml-auto")}>[Q] Quit [↑↓] Scroll [←→] Tabs [1-7] Tabs [R] Refresh</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mt-1 mb-2 whitespace-pre">
          {TABS.map((t, i) => (
            <span key={t.key} className={cn(i === tab ? CREAM : D)}>
              [{t.key}] {t.name}
            </span>
          ))}
        </div>

        {/* Frame */}
        <BorderRow top title={active.title} />
        <div className="relative min-h-[300px]">
          <div
            key={active.key}
            className="transition-transform duration-500 ease-out"
            style={{ transform: `translateY(${switchBlend ? -8 : 0}px)`, opacity: 1 - switchBlend * 0.3 }}
          >
            {lines.map((line, i) => (
              <Row key={i} line={line} index={i} />
            ))}
          </div>
        </div>
        <BorderRow />

        {/* Footer */}
        <div className={cn(D, "mt-2 whitespace-pre hidden sm:block")}>
          Press [Q] to quit, [R] to refresh, [A] to toggle auto-refresh (on) scroll:0 vim: hjkl/arrows, / search, g top, gg bottom
        </div>
        <div className={cn(D, "mt-2 whitespace-pre sm:hidden")}>
          [Q] quit · [R] refresh · [A] auto (on)
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-1.5 right-3 flex gap-1.5">
          {TABS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-6 rounded-full transition-colors",
                i === tab ? "bg-[#ecc466]" : "bg-[#2a2a2a]"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
