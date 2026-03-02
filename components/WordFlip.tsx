"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WordFlipProps {
  words: string[];
  className?: string;
  duration?: number;
}

export function WordFlip({ words, className, duration = 3000 }: WordFlipProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <div
      className={cn(
        "relative inline-block overflow-hidden tracking-tight [word-spacing:-0.2em]",
        className
      )}
    >
      <AnimatePresence mode="sync">
        <motion.span
          key={index}
          initial={{ y: "75%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-75%", opacity: 0 }}
          transition={{
            duration: 0.14,
            ease: "easeOut",
            opacity: { duration: 0.1 },
          }}
          className="absolute inset-0 flex items-start justify-start whitespace-nowrap text-left"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
      {/* Invisible text to maintain exact container dimensions */}
      <span className="invisible whitespace-nowrap tracking-tight [word-spacing:-0.2em]">
        {words.reduce((a, b) => (a.length > b.length ? a : b))}
      </span>
    </div>
  );
}
