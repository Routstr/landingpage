"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WordFlip } from "@/components/WordFlip";
import { ConceptObject } from "@/components/landing/ConceptObject";
import { Button } from "@/components/ui/button";
import { gsap, useGSAP } from "@/lib/gsap";

const HERO_WORDS = ["Permissionless.", "Decentralized.", "Private."];
const WORD_REVEAL_HOLD_MS = 1000;

export function LandingHero() {
  // Page load opens on Decentralized — the seed-burst intro plays there.
  const [phaseIndex, setPhaseIndex] = useState(1);
  const [wordIndex, setWordIndex] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const transitionCleanupRef = useRef<(() => void) | null>(null);

  const handlePhaseComplete = useCallback((completedPhase: number) => {
    transitionCleanupRef.current?.();
    setWordIndex(completedPhase);

    let remaining = WORD_REVEAL_HOLD_MS;
    let startedAt = performance.now();
    let timer: number | undefined;

    const cleanup = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      transitionCleanupRef.current = null;
    };
    const finish = () => {
      cleanup();
      const nextPhase = (completedPhase + 1) % HERO_WORDS.length;
      setWordIndex(nextPhase);
      setPhaseIndex(nextPhase);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        remaining = Math.max(0, remaining - (performance.now() - startedAt));
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
      } else {
        startedAt = performance.now();
        timer = window.setTimeout(finish, remaining);
      }
    };

    transitionCleanupRef.current = cleanup;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    timer = window.setTimeout(finish, remaining);
    if (document.hidden && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  }, []);

  useEffect(() => {
    return () => transitionCleanupRef.current?.();
  }, []);

  // Reveal each part of the message in reading order without layout-affecting tweens.
  useGSAP(
    () => {
      const intro = gsap.timeline({ delay: 0.3 });
      intro.fromTo(
        "[data-hero-title-character]",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.13, ease: "power3.out" }
      );
      intro.fromTo(
        "[data-hero-word]",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" },
        "-=0.28"
      );
      intro.fromTo(
        "[data-hero-description]",
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
        "-=0.22"
      );
      intro.fromTo(
        "[data-hero-button]",
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, stagger: 0.22, ease: "power3.out" },
        "-=0.18"
      );
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="w-full relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 content-center gap-6 px-[clamp(1rem,5vw,5rem)] pb-10 pt-8 mt-[72px] min-h-[calc(100svh-72px)] sm:mt-[80px] sm:min-h-[calc(100svh-80px)] sm:py-16 md:grid-cols-2 md:gap-x-10 md:gap-y-6 md:py-20">
        <h1
          data-hero-title
          className="order-1 flex w-full flex-col items-start text-left text-[2.75rem] font-medium leading-[1.08] text-foreground sm:text-[3.25rem] md:order-none md:col-start-1 md:row-start-2 md:text-[2.8125rem] lg:text-[3.75rem]"
        >
          <span data-hero-title-line className="inline-flex will-change-transform" aria-label="AI is Now">
            {"AI is Now".split("").map((character, index) => (
              <span key={`${character}-${index}`} data-hero-title-character className="inline-block whitespace-pre">
                {character}
              </span>
            ))}
          </span>
          <span data-hero-word className="mt-1.5 will-change-transform text-muted-foreground sm:mt-2 md:mt-3">
            <WordFlip words={HERO_WORDS} word={HERO_WORDS[wordIndex]} className="font-mono text-left" />
          </span>
        </h1>

        {/* Mobile: object sits inline in flow. Desktop: full-bleed canvas behind
            the text, pointer-events-none so the CTAs stay clickable. */}
        <div
          className="pointer-events-none order-2 relative min-h-[38svh] w-full md:absolute md:inset-0 md:min-h-0"
          aria-hidden="true"
        >
          <ConceptObject
            stateIndex={phaseIndex}
            className="absolute inset-0 h-full w-full"
            onPhaseComplete={handlePhaseComplete}
          />
        </div>

        <p
          data-hero-description
          className="order-3 z-10 max-w-xl will-change-transform text-left text-base leading-relaxed text-muted-foreground md:order-none md:col-start-1 md:row-start-3 md:text-lg"
        >
          Pay-per-request AI APIs with Bitcoin micropayments. OpenAI-compatible,
          privacy-preserving, no account required.
        </p>

        <div
          className="order-4 z-10 grid w-full grid-cols-2 gap-3 sm:w-auto sm:flex sm:gap-4 md:order-none md:col-start-1 md:row-start-4"
        >
          <Button data-hero-button asChild className="h-10 w-full will-change-transform px-5 sm:w-auto">
            <Link href="/routstrd">Use Routstr</Link>
          </Button>
          <Button data-hero-button asChild variant="outline" className="h-10 w-full will-change-transform px-5 sm:w-auto">
            <Link href="https://chat.routstr.com" target="_blank" rel="noreferrer">
              Chat with Routstr
            </Link>
          </Button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
