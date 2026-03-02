"use client";

import React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

export interface GlobeTooltipProvider {
  id: string;
  name: string;
  description?: string;
  createdAt?: number;
  mints?: string[];
  city?: string;
  country?: string;
  type?: string;
  status?: string;
  endpoints?: {
    http: string[];
    tor: string[];
  };
  models?: string[];
  version?: string;
}

interface GlobeTooltipProps {
  provider: GlobeTooltipProvider | null;
  position: { x: number; y: number } | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function GlobeTooltip({ provider, position, onMouseEnter, onMouseLeave }: GlobeTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
    if (provider && position) {
      setIsVisible(true);
      return () => setIsVisible(false);
    }
  }, [provider, position]);

  if (!provider || !position || !mounted) return null;

  function truncateMiddle(value: string, max = 28) {
    if (!value) return "";
    if (value.length <= max) return value;
    const part = Math.floor((max - 3) / 2);
    return `${value.slice(0, part)}...${value.slice(-part)}`;
  }

  function formatDate(unix?: number) {
    if (!unix) return undefined;
    try {
      return new Date(unix * 1000).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit'
      });
    } catch {
      return undefined;
    }
  }

  const tooltipContent = (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: position.x + 15,
        top: position.y - 10,
        transform: 'translateY(-50%)',
      }}
    >
      <div className={`max-w-xs transition-all duration-200 ease-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div
          className="bg-background border border-border rounded-lg shadow-[0_20px_50px_rgba(0,0,0,1)] pointer-events-auto p-4 font-mono"
          data-globe-tooltip="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground font-bold text-xs tracking-tight truncate">{provider.name}</h3>
              <p className="text-muted-foreground text-[10px] leading-relaxed mt-1 line-clamp-2">
                {provider.description || "Decentralized AI inference provider node."}
              </p>
              {provider.city && provider.country && (
                <p className="text-muted-foreground text-[9px] mt-1">{provider.city}, {provider.country}</p>
              )}
            </div>
            {provider.id ? (
              <Link
                href={`/providers/${encodeURIComponent(provider.id)}`}
                className="shrink-0 inline-flex items-center gap-1 rounded bg-muted border border-border px-2 py-0.5 text-[9px] text-foreground hover:bg-muted transition-colors"
              >
                View
              </Link>
            ) : null}
          </div>

          <div className="space-y-1 text-[10px] mt-3 pt-3 border-t border-border">
            {provider.createdAt ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-muted-foreground">{formatDate(provider.createdAt)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="text-green-500 font-bold">Online</span>
            </div>
            {provider.mints && provider.mints.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mints</span>
                <span className="text-muted-foreground">{provider.mints.length} active</span>
              </div>
            )}
          </div>

          {provider.mints && provider.mints.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-muted-foreground mb-1.5 text-[9px]">Supporting Mints</div>
              <div className="flex flex-wrap gap-1">
                {provider.mints.slice(0, 2).map((mint: string, i: number) => (
                  <div key={i} className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] text-muted-foreground truncate max-w-[120px]">
                    {truncateMiddle(mint, 20)}
                  </div>
                ))}
                {provider.mints.length > 2 && (
                  <div className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] text-muted-foreground">
                    +{provider.mints.length - 2}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
