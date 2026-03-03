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
      timeframe: "RIP-01: API Proxy & Payments",
      description: "OpenAI-compatible API proxy with Cashu payments",
      detailed: true,
      milestones: [
        "HTTP proxy forwarding OpenAI-compatible API requests",
        "Per-request micropayments with Cashu tokens",
        "Token-based pricing by input/output tokens",
        "Authorization via API keys or Cashu tokens",
        "Cost reporting in streaming and non-streaming responses",
      ],
    },
    {
      id: "rip-02",
      timeframe: "RIP-02: Node Listing",
      description: "Nostr event spec for announcing inference nodes",
      detailed: true,
      milestones: [
        "Nostr kind 40500 event for node announcements",
        "Node capabilities including models, pricing, and region",
        "Operator pubkey association",
        "Endpoint URL and latency metrics",
        "Client subscription to node listings",
      ],
    },
    {
      id: "rip-03",
      timeframe: "RIP-03: Frontend Discovery",
      description: "Web interface for browsing available nodes",
      detailed: true,
      milestones: [
        "List active nodes from Nostr kind 40500",
        "Filter by models, region, price, and social proximity",
        "Node cards with descriptions and metrics",
        "Search and filtering capabilities",
        "Real-time updates on new node events",
      ],
    },
    {
      id: "rip-04",
      timeframe: "RIP-04: Evaluations & Quality",
      description: "Anonymous quality control for providers",
      detailed: true,
      milestones: [
        "Client-side randomized evaluation submissions",
        "Anonymized metrics on quality, latency, and cost",
        "Provider ratings with ephemeral Nostr keys",
        "Kind 31555 events with standardized tags",
        "Aggregation of multiple evaluations",
      ],
    },
    {
      id: "rip-05",
      timeframe: "RIP-05: Smart Clients",
      description: "Client-side token and privacy management",
      detailed: true,
      milestones: [
        "Local Cashu wallet and token management",
        "Auto-redemption and token splitting",
        "Proxy/Tor routing for privacy",
        "Provider optimization based on metrics",
        "Dynamic scoring for provider selection",
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
              This roadmap is subject to change as we adapt to community feedback and the rapid developments in the open source AI and Bitcoin ecosystems.
            </p>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>
    </SiteShell>
  );
}
