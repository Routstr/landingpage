"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface WordFlipProps {
  words: string[];
  word: string;
  className?: string;
}

export function WordFlip({ words, word, className }: WordFlipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement | null>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const laserCoreRef = useRef<HTMLSpanElement>(null);
  const wipeRef = useRef<gsap.core.Timeline | null>(null);
  const shownWordRef = useRef(word);
  const [shownWord, setShownWord] = useState(word);

  useEffect(() => {
    if (!word || word === shownWordRef.current) return;
    const container = containerRef.current;
    const shine = shineRef.current;
    const laserCore = laserCoreRef.current;
    const active = activeRef.current;
    if (!container || !shine || !laserCore || !active) return;
    wipeRef.current?.kill();
    const width = Math.max(container.clientWidth, activeRef.current?.getBoundingClientRect().width ?? 0);
    const endX = width + 40;
    gsap.set([shine, laserCore], { x: endX, opacity: 0 });
    const wipe = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    // The outgoing label is erased right-to-left before the existing forward
    // scan writes the next label in, so neither word disappears abruptly.
    wipe.to(shine, { opacity: 0.34, duration: 0.1, ease: "power2.out" }, 0);
    wipe.to(laserCore, { opacity: 1, duration: 0.06, ease: "power2.out" }, 0);
    wipe.to(laserCore, { x: -40, duration: 0.28, ease: "power1.inOut" }, 0.04);
    wipe.to(shine, { x: -52, opacity: 0, duration: 0.32, ease: "power1.inOut" }, 0);
    wipe.to(active, { opacity: 0.7, duration: 0.12, ease: "power1.out" }, 0.14);
    wipe.call(() => {
      shownWordRef.current = word;
      setShownWord(word);
    }, [], 0.3);
    wipe.set(active, { opacity: 1, clipPath: "inset(0 100% 0 0)" }, 0.31);
    wipe.set([shine, laserCore], { x: -40, opacity: 0 }, 0.32);
    wipe.to(shine, { opacity: 0.42, duration: 0.16, ease: "power2.out" }, 0.32);
    wipe.to(laserCore, { opacity: 1, duration: 0.08, ease: "power2.out" }, 0.4);
    wipe.to(active, { clipPath: "inset(0 0% 0 0)", duration: 0.62, ease: "power1.inOut" }, 0.44);
    wipe.to(laserCore, { x: endX, duration: 0.62 }, 0.44);
    wipe.to(shine, { x: endX + 12, opacity: 0, duration: 0.72 }, 0.4);
    wipe.to(laserCore, { opacity: 0, duration: 0.14, ease: "power1.out" }, 1);
    wipeRef.current = wipe;
    return () => {
      wipe.kill();
    };
  }, [word]);

  useGSAP(
    () => {
      if (!shownWord) return;
      gsap.set(activeRef.current, { opacity: 1, yPercent: 0 });
    },
    { scope: containerRef, dependencies: [shownWord] }
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-grid h-[1.15em] min-h-[1.15em] overflow-hidden tracking-tight [word-spacing:-0.2em]",
        className
      )}
    >
      <span
        ref={activeRef}
        className="col-start-1 row-start-1 flex items-start justify-start whitespace-nowrap text-left"
      >
        {shownWord}
      </span>
      <span
        ref={shineRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-[-20%] left-0 z-10 w-8 -skew-x-12 bg-gradient-to-r from-transparent via-foreground to-transparent opacity-0 blur-[2px] dark:via-white"
      />
      <span
        ref={laserCoreRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-[-12%] left-0 z-20 w-px bg-foreground shadow-[0_0_8px_currentColor,0_0_20px_currentColor] dark:bg-white dark:shadow-[0_0_8px_#fff,0_0_20px_#fff]"
      />
      {/* Invisible copies of every word, stacked in the same grid cell, so the
          container's intrinsic size is the true rendered max of all of them —
          not a char-count guess that can undersize a word with wider glyphs. */}
      {words.map((w) => (
        <span
          key={w}
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 whitespace-nowrap tracking-tight [word-spacing:-0.2em]"
        >
          {w}
        </span>
      ))}
    </div>
  );
}
