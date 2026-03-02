import BackButton from "@/components/BackButton";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import RoadmapTimeline, { RoadmapItem } from "@/components/RoadmapTimeline";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Roadmap - Routstr",
  description: "Follow our journey to building a decentralized AI ecosystem. See upcoming features and milestones for Routstr.",
};

export default function RoadmapPage() {
  const roadmapItems: RoadmapItem[] = [
    {
      id: "rip-01",
      timeframe: "rip-01: api proxy & payments",
      description: "openai-api proxy with cashu payments",
      detailed: true,
      milestones: [
        "http proxy forwarding openai-compatible api requests",
        "per-request micropayments with cashu tokens",
        "token-based pricing by input/output tokens",
        "authorization via api keys or cashu tokens",
        "cost reporting in streaming and non-streaming responses",
      ],
    },
    {
      id: "rip-02",
      timeframe: "rip-02: node listing",
      description: "nostr event spec for announcing inference nodes",
      detailed: true,
      milestones: [
        "nostr kind 40500 event for node announcements",
        "node capabilities including models, pricing, region",
        "operator pubkey association",
        "endpoint url and latency metrics",
        "client subscription to node listings",
      ],
    },
    {
      id: "rip-03",
      timeframe: "rip-03: frontend discovery",
      description: "web interface for browsing available nodes",
      detailed: true,
      milestones: [
        "list active nodes from nostr kind 40500",
        "filter by models, region, price, social proximity",
        "node cards with descriptions and metrics",
        "search and filtering capabilities",
        "real-time updates on new node events",
      ],
    },
    {
      id: "rip-04",
      timeframe: "rip-04: evaluations & quality",
      description: "anonymous quality control for providers",
      detailed: true,
      milestones: [
        "client-side randomized evaluation submissions",
        "anonymized metrics on quality, latency, and cost",
        "provider ratings with ephemeral nostr keys",
        "kind 31555 events with standardized tags",
        "aggregation of multiple evaluations",
      ],
    },
    {
      id: "rip-05",
      timeframe: "rip-05: smart clients",
      description: "client-side token and privacy management",
      detailed: true,
      milestones: [
        "local cashu wallet and token management",
        "auto-redemption and token splitting",
        "proxy/tor routing for privacy",
        "provider optimization based on metrics",
        "dynamic scoring for provider selection",
      ],
    },
  ];

  return (
    <SiteShell className="font-mono">
      <section className="py-12 md:py-20 relative">
        <PageContainer className="w-full text-left">
          <BackButton fallbackHref="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-12">
            <ArrowLeft className="w-3 h-3" /> Back
          </BackButton>
          
          <div className="text-left">
            <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-6 tracking-tight">Roadmap</h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl font-light leading-relaxed">
              Our progressive journey to building a decentralized AI ecosystem.
            </p>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <section className="py-20 relative">
        <PageContainer>
          <div className="mb-16">
            <RoadmapTimeline
              items={roadmapItems}
              alternating={false}
              showTheme={false}
            />
          </div>

          <div className="text-left mt-20 pt-12 border-t border-border/30">
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              This roadmap is subject to change as we adapt to community feedback and the rapid developments in the open source ai and bitcoin ecosystems.
            </p>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>
    </SiteShell>
  );
}
