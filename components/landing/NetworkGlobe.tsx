"use client";
import React, { useRef } from "react";
import { Globe } from "@/components/ui/globe";

export function LandingNetworkGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full relative">
      <div className="px-[clamp(1rem,5vw,5rem)] py-20 max-w-[1800px] mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-12">Live network</h2>

        <div
          ref={containerRef}
          className="relative flex h-[290px] w-full justify-center overflow-hidden sm:h-[340px] md:h-[500px]"
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
