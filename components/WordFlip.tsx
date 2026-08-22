"use client";

import { useEffect, useRef } from "react";
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
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = true;
  }, []);

  useGSAP(
    () => {
      if (!activeRef.current) return;

      if (isFirstRender.current) {
        isFirstRender.current = false;
        gsap.fromTo(
          activeRef.current,
          { yPercent: 75, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.14, ease: "power2.out" }
        );
        return;
      }

      gsap.fromTo(
        activeRef.current,
        { yPercent: 75, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.14, ease: "power2.out" }
      );
    },
    { scope: containerRef, dependencies: [word] }
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-block overflow-hidden tracking-tight [word-spacing:-0.2em]",
        className
      )}
    >
      <span
        key={word}
        ref={activeRef}
        className="absolute inset-0 flex items-start justify-start whitespace-nowrap text-left"
      >
        {word}
      </span>
      {/* Invisible text to maintain exact container dimensions */}
      <span className="invisible whitespace-nowrap tracking-tight [word-spacing:-0.2em]">
        {words.reduce((a, b) => (a.length > b.length ? a : b))}
      </span>
    </div>
  );
}
