"use client";

import React from "react";
import { ExternalLink, ArrowRight, Paperclip } from "lucide-react";
import Link from "next/link";

const PREVIEW_CONTROL_CLASS =
  "w-full max-w-[300px] sm:max-w-[340px] h-10 sm:h-12 rounded-full border border-border bg-[#111113]";
const PREVIEW_PANEL_CLASS =
  "mb-5 sm:mb-6 rounded-xl overflow-hidden border border-border aspect-[16/9] sm:aspect-[16/10] relative flex items-center justify-center shadow-lg";
const CHAT_PREVIEW_PANEL_STYLE = {
  backgroundImage: "url('/assets/products-preview-chat-bg.svg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const DAEMON_PREVIEW_PANEL_STYLE = {
  backgroundImage: "url('/assets/products-preview-platform-bg.svg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const HOSTED_PREVIEW_PANEL_STYLE = {
  backgroundImage: "url('/assets/products-preview-hosted-bg.svg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const TERMINAL_MOCKUP_CLASS =
  "w-full max-w-[300px] sm:max-w-[340px] rounded-lg border border-border bg-[#111113] overflow-hidden";
const CTA_LINK_CLASS =
  "inline-flex items-center text-sm font-medium text-foreground transition-colors w-fit";
const CTA_ICON_CLASS = "ml-2 h-3.5 w-3.5 opacity-70";

function TerminalMockup({ commands }: { commands: string[] }) {
  return (
    <div className={TERMINAL_MOCKUP_CLASS}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <span className="h-2 w-2 rounded-full bg-red-500/60" />
        <span className="h-2 w-2 rounded-full bg-yellow-500/60" />
        <span className="h-2 w-2 rounded-full bg-green-500/60" />
      </div>
      <div className="px-3 sm:px-4 py-3 font-mono text-[11px] sm:text-xs text-muted-foreground space-y-1">
        {commands.map((command) => (
          <div key={command} className="flex gap-2 whitespace-nowrap">
            <span className="text-green-500">$</span>
            <span>{command}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingProducts() {
  return (
    <div className="w-full relative">
      <div className="px-4 sm:px-6 md:px-12 py-16 sm:py-20 max-w-5xl mx-auto">
        <div className="mb-8 sm:mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <h2 className="text-xl font-bold text-foreground">Routstr Products</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Daemon */}
          <div className="group flex flex-col relative pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
              <span className="text-muted-foreground font-normal">01</span>
              <span>Developer</span>
            </span>
            <div className={PREVIEW_PANEL_CLASS} style={DAEMON_PREVIEW_PANEL_STYLE}>
              <TerminalMockup
                commands={["bun install -g routstrd", "routstrd onboard"]}
              />
            </div>

            <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              Routstr Daemon
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm mb-6 flex-grow">
              A local daemon for uncensorable access to AI. Discovers nodes on Nostr, auto-routes to the cheapest provider for your model, and pays per request over Lightning.
            </p>
            <Link href="/routstrd" className={CTA_LINK_CLASS}>
              Explore Routstrd <ArrowRight className={CTA_ICON_CLASS} aria-hidden="true" />
            </Link>
          </div>

          {/* Hosted Daemon */}
          <div className="group flex flex-col relative pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
              <span className="text-muted-foreground font-normal">02</span>
              <span>Teams &amp; Individuals</span>
            </span>
            <div className={PREVIEW_PANEL_CLASS} style={HOSTED_PREVIEW_PANEL_STYLE}>
              <TerminalMockup
                commands={["routstrd remote <instance>", "routstrd npubs register"]}
              />
            </div>

            <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              Hosted Routstr Daemon
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm mb-6 flex-grow">
              Serve routstrd to your whole team — or just yourself — from a hosted instance. Bearer-token auth proxy, per-member Nostr keys, and usage tracking included.
            </p>
            <Link
              href="https://github.com/routstr/routstrd-auth"
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_LINK_CLASS}
            >
              View on GitHub <ExternalLink className={CTA_ICON_CLASS} aria-hidden="true" />
            </Link>
          </div>

          {/* Chat App */}
          <div className="group flex flex-col relative pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
              <span className="text-muted-foreground font-normal">03</span>
              <span>Consumer</span>
            </span>
            <div className={`${PREVIEW_PANEL_CLASS} p-4 sm:p-6`} style={CHAT_PREVIEW_PANEL_STYLE}>
              <div className={`${PREVIEW_CONTROL_CLASS} flex items-center justify-between px-3 sm:px-4 text-foreground`}>
                <div className="min-w-0 flex items-center gap-2 sm:gap-2.5">
                  <Paperclip className="h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0" />
                  <span className="truncate text-sm sm:text-base leading-none text-muted-foreground">
                    Ask anything...
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0" />
              </div>
            </div>

            <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              Routstr Chat
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm mb-6 flex-grow">
              A beautifully designed chat interface for interacting with any AI model on the network. Seamlessly pay per request with Bitcoin Lightning.
            </p>
            <Link
              href="https://chat.routstr.com"
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_LINK_CLASS}
            >
              Try Routstr Chat <ExternalLink className={CTA_ICON_CLASS} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
