"use client";

import React, { useEffect, useRef } from "react";
import FullScreenGlobe from "./FullScreenGlobe";

interface FullScreenGlobeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FullScreenGlobeDialog({ open, onOpenChange }: FullScreenGlobeDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global providers activity map"
      className="fixed inset-0 z-[100]"
    >
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={contentRef}
        className="absolute inset-0 bg-black flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close"
          className="absolute top-4 right-4 z-[110] rounded-full bg-white/10 border border-white/20 text-white/90 hover:text-white hover:bg-white/15 px-3 py-2 text-sm sm:text-base shadow-lg"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
        <FullScreenGlobe />
      </div>
    </div>
  );
}


