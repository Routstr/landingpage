"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface WordFlipProps {
  words: string[];
  className?: string;
  duration?: number;
}

export function WordFlip({ words, className, duration = 3000 }: WordFlipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement | null>(null);
  const indexRef = useRef(0);
  const [displayWord, setDisplayWord] = useState(words[0]);

  useGSAP(
    () => {
      const interval = setInterval(() => {
        const nextIndex = (indexRef.current + 1) % words.length;
        if (!activeRef.current) return;

        gsap.to(activeRef.current, {
          yPercent: -75,
          opacity: 0,
          duration: 0.14,
          ease: "power2.out",
          onComplete: () => {
            indexRef.current = nextIndex;
            setDisplayWord(words[nextIndex]);
          },
        });
      }, duration);

      return () => clearInterval(interval);
    },
    { scope: containerRef, dependencies: [words, duration] }
  );

  useGSAP(
    () => {
      if (!activeRef.current) return;
      gsap.fromTo(
        activeRef.current,
        { yPercent: 75, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.14, ease: "power2.out" }
      );
    },
    { scope: containerRef, dependencies: [displayWord] }
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
        key={displayWord}
        ref={activeRef}
        className="absolute inset-0 flex items-start justify-start whitespace-nowrap text-left"
      >
        {displayWord}
      </span>
      {/* Invisible text to maintain exact container dimensions */}
      <span className="invisible whitespace-nowrap tracking-tight [word-spacing:-0.2em]">
        {words.reduce((a, b) => (a.length > b.length ? a : b))}
      </span>
    </div>
  );
}
