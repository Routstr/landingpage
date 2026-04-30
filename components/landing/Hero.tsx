"use client";
import React, { useRef } from "react";
import Link from "next/link";
import { Globe } from "@/components/ui/globe";
import { WordFlip } from "@/components/WordFlip";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={parentRef} className="w-full relative overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-5xl flex-col items-start justify-center px-4 pb-10 pt-8 sm:min-h-[78svh] sm:px-6 sm:py-16 md:min-h-[85vh] md:px-12 md:py-20">
        <div className="relative z-50 mb-5 w-full text-left sm:mb-6">
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

          <h1 className="mb-0 flex w-full max-w-3xl flex-col items-start text-left text-[2.2rem] font-medium leading-[1.08] text-foreground sm:text-[2.6rem] md:text-4xl lg:text-5xl">
            <span>Access to AI is Now</span>
            <span className="mt-1.5 text-muted-foreground sm:mt-2 md:mt-3">
              <WordFlip
                words={["Permissionless.", "Decentralized.", "Private."]}
                className="font-mono text-left"
              />
            </span>
          </h1>
        </div>
        <p className="relative z-50 mt-0 mb-6 max-w-xl text-left text-base leading-relaxed text-muted-foreground sm:mb-7 md:text-lg">
          Pay-per-request AI APIs with Bitcoin micropayments. OpenAI-compatible,
          privacy-preserving, no account required.
        </p>
        <div className="relative z-50 grid w-full grid-cols-2 gap-3 sm:w-auto sm:flex sm:gap-4">
          <Button asChild className="h-10 w-full px-5 sm:w-auto">
            <Link
              href="https://chat.routstr.com"
              target="_blank"
              rel="noreferrer"
            >
              Start Chatting
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 w-full px-5 sm:w-auto">
            <Link
              href="https://chat.routstr.com/?tab=apikeys"
              target="_blank"
              rel="noreferrer"
            >
              Get API Key
            </Link>
          </Button>
        </div>

        <div
          ref={containerRef}
          className="relative mt-5 flex h-[290px] w-full justify-center overflow-hidden sm:mt-4 sm:h-[260px] md:mt-2 md:h-[500px]"
        >
          {/* Masked Content Wrapper */}
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_0%,black_68%,transparent_100%)] sm:[mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]">
            {/* Shifted Globe Wrapper - taller than container to avoid edge lines */}
            <div className="absolute top-[8px] flex h-[760px] w-full items-start justify-center sm:top-[-90px] sm:h-[900px] md:top-[-200px] md:h-[1000px]">
              <Globe className="scale-[1.75] sm:scale-100" />
            </div>
            {/* Bottom fade overlay - anchored to container bottom for smooth transition */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background via-transparent to-transparent z-10" />
          </div>

          <div className="absolute bottom-2 left-0 right-0 z-20 text-center sm:bottom-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm sm:text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live node activity
            </p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
