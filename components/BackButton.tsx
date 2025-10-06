"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface BackButtonProps {
  fallbackHref?: string;
  className?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}

export default function BackButton({
  fallbackHref = "/",
  className,
  children,
  ariaLabel = "Go back",
}: BackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    try {
      // Heuristic: if there's any history length, prefer back. In SPA, length may be 1 on first page.
      // We'll attempt back, but also maintain a canGoBack hint for semantics.
      setCanGoBack(typeof window !== "undefined" && window.history.length > 1);
    } catch {
      setCanGoBack(false);
    }
  }, []);

  const onBack = useCallback(() => {
    try {
      // Try to go back; if it lands on the same page or throws, fall back to href
      router.back();
    } catch {
      router.push(fallbackHref);
    }
  }, [router, fallbackHref]);

  return (
    <button
      type="button"
      onClick={onBack}
      className={className}
      aria-label={ariaLabel}
    >
      {children ?? (
        <span className="inline-flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 mr-1"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </span>
      )}
      {/* Provide an SSR-safe fallback link for middle-click/open-in-new-tab via long-press if desired */}
      {/* Hidden link for crawlers or if JS disabled */}
      <noscript>
        <Link href={fallbackHref}>Back</Link>
      </noscript>
    </button>
  );
}


