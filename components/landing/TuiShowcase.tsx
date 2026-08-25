"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/contexts/ThemeContext";

// ---------------------------------------------------------------------------
// Animated replica of the `routstrd` usage-monitor TUI.
//
// Rebuilt from the upstream source (routstrd/src/tui/usage): same layout,
// box-drawing, dim/bold label styles, cyan provider titles, magenta/cyan model
// rows and rust/gold block bars. Three tabs (Providers, Models, Onboarding)
// crossfade + scroll-morph every 2 seconds; bar widths, numbers and the
// balance counter tick live between switches. Pauses off-screen and under
// prefers-reduced-motion.

const FRAME_MS = 4000;

type Span = { t: string; c?: "dim" | "bold" | "cyan" | "green" | "gold" | "rust" | "magenta" | "cream" };
type Line = Span[];

// Theme palettes: dark terminal as shipped by routstrd; light paper variant
// keeps the same hierarchy with ink text and deepened accents.
type TuiPalette = {
  bg: string;
  chrome: string;
  chromeBorder: string;
  dim: string;
  cream: string;
  gold: string;
  rust: string;
  magenta: string;
  cyan: string;
  green: string;
  dot: string;
};

const DARK: TuiPalette = {
  bg: "#0a0a0a",
  chrome: "#161616",
  chromeBorder: "#262626",
  dim: "#8a8478",
  cream: "#f2ebdd",
  gold: "#ecc466",
  rust: "#8f4230",
  magenta: "#b06cd4",
  cyan: "#4fc1d6",
  green: "#4fae6d",
  dot: "#3f3f3f",
};

const LIGHT: TuiPalette = {
  bg: "#fafafa",
  chrome: "#f5f5f5",
  chromeBorder: "#e5e5e5",
  dim: "#8a8478",
  cream: "#26221a",
  gold: "#a16207",
  rust: "#b4502e",
  magenta: "#8b3fc7",
  cyan: "#0e7490",
  green: "#2f7d4f",
  dot: "#d4d4d4",
};

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

function BorderRow({ top, title, palette }: { top?: boolean; title?: string; palette: TuiPalette }) {
  return (
    <div className="whitespace-pre" style={{ color: palette.dim }}>{boxBorder(top ?? false, title)}</div>
  );
}

function Row({ line, index, palette }: { line: Line; index: number; palette: TuiPalette }) {
  return (
    <div className="whitespace-pre flex">
      {line.map((span, i) => (
        <span
          key={i}
          data-tui-line={index}
          style={{
            color:
              span.c === "dim" ? palette.dim :
              span.c === "cyan" ? palette.cyan :
              span.c === "green" ? palette.green :
              span.c === "gold" ? palette.gold :
              span.c === "rust" ? palette.rust :
              span.c === "magenta" ? palette.magenta :
              palette.cream,
            fontWeight: span.c === "bold" ? 700 : undefined,
          }}
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
  const { theme } = useTheme();
  const palette = theme === "light" ? LIGHT : DARK;

  // The frame always holds the tallest tab's height so switching never jumps.
  const maxLines = useMemo(
    () => Math.max(...TABS.map((t) => t.lines().length)),
    []
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  useEffect(() => {
    const first = contentRef.current?.querySelector("[data-tui-line]");
    if (first) setLineHeight((first as HTMLElement).getBoundingClientRect().height);
  }, [palette]);
  const contentMinHeight = lineHeight ? maxLines * lineHeight : undefined;

  // Morph: crossfade rows near the switch boundary, plus a scroll hint.
  const switchBlend = tab === TABS.length - 1 && progress > 0.85 ? 1 : 0;

  const scrollTo = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.scrollTo({ top: 0 });
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden border border-border rounded-xl", className)}
      style={{ backgroundColor: palette.bg }}
    >
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: palette.chromeBorder, backgroundColor: palette.chrome }}>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} />
        </div>
        <span className="text-[9px] ml-1 font-mono" style={{ color: palette.dim }}>routstrd — usage monitor</span>
        <span className="ml-auto text-[9px] font-mono" style={{ color: palette.gold }}>
          auto-refresh (on)
        </span>
      </div>

      <div ref={scrollTo} className="relative font-mono text-[10px] sm:text-[11px] leading-[1.55] p-3 overflow-hidden">
        {/* Header */}
        <div className="whitespace-pre flex">
          <span className="font-bold" style={{ color: palette.cream }}>ROUTSTRD USAGE MONITOR</span>
          <span className="ml-2" style={{ color: palette.gold }}>[vim]</span>
          <span className="ml-auto" style={{ color: palette.dim }}>[Q] Quit [↑↓] Scroll [←→] Tabs [1-7] Tabs [R] Refresh</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mt-1 mb-2 whitespace-pre">
          {TABS.map((t, i) => (
            <span key={t.key} style={{ color: i === tab ? palette.cream : palette.dim }}>
              [{t.key}] {t.name}
            </span>
          ))}
        </div>

        {/* Frame */}
        <BorderRow top title={active.title} palette={palette} />
        <div className="relative" style={{ minHeight: contentMinHeight }}>
          <div
            key={active.key}
            className="transition-transform duration-500 ease-out"
            style={{ transform: `translateY(${switchBlend ? -8 : 0}px)`, opacity: 1 - switchBlend * 0.3 }}
          >
            <div ref={contentRef}>
              {lines.map((line, i) => (
                <Row key={i} line={line} index={i} palette={palette} />
              ))}
            </div>
          </div>
        </div>
        <BorderRow palette={palette} />

        {/* Footer */}
        <div className="mt-2 whitespace-pre hidden sm:block" style={{ color: palette.dim }}>
          Press [Q] to quit, [R] to refresh, [A] to toggle auto-refresh (on) scroll:0 vim: hjkl/arrows, / search, g top, gg bottom
        </div>
        <div className="mt-2 whitespace-pre sm:hidden" style={{ color: palette.dim }}>
          [Q] quit · [R] refresh · [A] auto (on)
        </div>
      </div>

      {/* Tab indicator — outside the terminal, styled like the other sections */}
      <div className="flex gap-2 px-3 pt-3 pb-3">
        {TABS.map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-8 rounded-full transition-colors"
            style={{ backgroundColor: i === tab ? "var(--foreground)" : "var(--border)" }}
          />
        ))}
      </div>
    </div>
  );
}
