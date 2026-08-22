"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { WordFlip } from "@/components/WordFlip";
import { ConceptObject } from "@/components/landing/ConceptObject";
import { Button } from "@/components/ui/button";

const HERO_WORDS = ["Permissionless.", "Decentralized.", "Private."];
const HERO_WORD_DURATION = 3000;

export function LandingHero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % HERO_WORDS.length);
    }, HERO_WORD_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full relative overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-[1800px] flex-col justify-center gap-8 px-[clamp(1rem,5vw,5rem)] pb-10 pt-8 sm:min-h-[78svh] sm:py-16 md:min-h-[85vh] md:flex-row md:items-center md:gap-10 md:py-20">
        <div className="flex w-full flex-col items-start text-left md:max-w-xl lg:max-w-2xl">
          <Link
            href="/routstrd"
            className="group mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:mb-10 sm:px-4 sm:py-1.5 sm:text-xs"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Announcing Routstrd
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>

          <h1 className="mb-6 flex w-full flex-col items-start text-left text-[2.2rem] font-medium leading-[1.08] text-foreground sm:text-[2.6rem] md:text-4xl lg:text-5xl">
            <span>Access to AI is Now</span>
            <span className="mt-1.5 text-muted-foreground sm:mt-2 md:mt-3">
              <WordFlip words={HERO_WORDS} word={HERO_WORDS[wordIndex]} className="font-mono text-left" />
            </span>
          </h1>

          <p className="mb-6 max-w-xl text-left text-base leading-relaxed text-muted-foreground sm:mb-7 md:text-lg">
            Pay-per-request AI APIs with Bitcoin micropayments. OpenAI-compatible,
            privacy-preserving, no account required.
          </p>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:flex sm:gap-4">
            <Button asChild className="h-10 w-full px-5 sm:w-auto">
              <Link href="/routstrd">Run Routstrd Locally</Link>
            </Button>
            <Button asChild variant="outline" className="h-10 w-full px-5 sm:w-auto">
              <Link href="https://chat.routstr.com" target="_blank" rel="noreferrer">
                Start Chatting
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex w-full flex-1 items-center justify-center">
          <ConceptObject
            stateIndex={wordIndex}
            className="h-[220px] w-[220px] sm:h-[280px] sm:w-[280px] md:h-[360px] md:w-[360px] lg:h-[440px] lg:w-[440px]"
          />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
