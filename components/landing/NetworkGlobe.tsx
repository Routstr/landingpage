"use client";
import React, { useRef } from "react";
import { Globe } from "@/components/ui/globe";

export function LandingNetworkGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full relative">
      <div className="px-[clamp(1rem,5vw,5rem)] py-20 max-w-[1800px] mx-auto">
        <div className="mb-9 flex items-end justify-between gap-6 sm:mb-12">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Routstr network</p>
            <h2 className="text-xl font-bold text-foreground">Live nodes, relays, and request flow</h2>
          </div>
          <p className="hidden max-w-48 text-right text-xs leading-relaxed text-muted-foreground md:block">
            Scroll through the network to explore its global reach.
          </p>
        </div>

        <div
          ref={containerRef}
          className="relative flex h-[360px] w-full justify-center overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-b from-muted/20 via-background to-background sm:h-[420px] md:h-[500px]"
        >
          {/* Masked Content Wrapper */}
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_0%,black_68%,transparent_100%)] sm:[mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]">
            {/* Shifted Globe Wrapper - taller than container to avoid edge lines */}
            <div className="absolute top-[-58px] flex h-[680px] w-full items-start justify-center sm:top-[-90px] sm:h-[900px] md:top-[-200px] md:h-[1000px]">
              <Globe className="scale-[1.22] sm:scale-100" viewportTargetRef={containerRef} />
            </div>
            {/* Bottom fade overlay - anchored to container bottom for smooth transition */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background via-transparent to-transparent z-10" />
          </div>

          <div className="absolute bottom-2 left-0 right-0 z-20 flex flex-wrap items-center justify-center gap-2 px-4 sm:bottom-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              API nodes
              <span className="h-px w-4 bg-orange-400/80" />
              Request flow
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              Nostr relays
            </p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
