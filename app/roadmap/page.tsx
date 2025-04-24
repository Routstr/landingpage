import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RoadmapTimeline, { RoadmapItem } from "@/components/RoadmapTimeline";

export default function RoadmapPage() {
  const roadmapItems: RoadmapItem[] = [
    {
      id: "core-alpha",
      timeframe: "Core Alpha",
      description: "Foundation for decentralized LLM routing",
      detailed: true,
      milestones: [
        "Smart-Client SDK α (JS/TS)",
        "Proxy α with Cashu payments",
        "Relay seed list + CI",
        "NIP-01 Basic protocol flow",
        "NIP-11 Relay-info doc",
        "NIP-19 bech32 IDs",
        "NIP-42 Client ↔ relay auth"
      ]
    },
    {
      id: "proxy-payments",
      timeframe: "Proxy Payments",
      description: "Decentralized payment mechanisms",
      detailed: true,
      milestones: [
        "Cashu bearer-token auth",
        "BOLT-12 invoice flow via Wallet-Connect",
        "NIP-47 Wallet Connect",
        "NIP-98 HTTP Auth"
      ]
    },
    {
      id: "developer-experience",
      timeframe: "Developer Experience",
      description: "Tools to enhance developer productivity",
      detailed: true,
      milestones: [
        "VS Code helper",
        "routstr dev tunnel",
        "LangChain / LlamaIndex connectors",
        "NIP-50 Search (code examples indexed)"
      ]
    },
    {
      id: "privacy-layer",
      timeframe: "Privacy Layer",
      description: "Enhanced privacy features",
      detailed: true,
      milestones: [
        "One-flag Tor/SOCKS5 routing",
        "Exit-latency feed",
        "NIP-48 Proxy Tags (location / cost hints)"
      ]
    },
    {
      id: "operator-dashboard",
      timeframe: "Operator Dashboard GA",
      description: "Comprehensive monitoring and management",
      detailed: true,
      milestones: [
        "Settings / payments / real-time graphs",
        "Eval runner (Llama-Eval)",
        "NIP-45 Counting results (metrics envelopes)"
      ]
    },
    {
      id: "marketplace-beta",
      timeframe: "Marketplace β",
      description: "Public model marketplace",
      detailed: true,
      milestones: [
        "Public offer site market.routstr.org",
        "Listings gossiped on-chain",
        "NIP-15 Marketplace",
        "NIP-99 Classified listings"
      ]
    },
    {
      id: "discovery-search",
      timeframe: "Discovery & Search",
      description: "Finding the best models and providers",
      detailed: true,
      milestones: [
        "Price/latency leaderboard",
        "Full-text search endpoint",
        "NIP-50 Search capability"
      ]
    },
    {
      id: "security-abuse",
      timeframe: "Security & Abuse v1",
      description: "Platform security and abuse prevention",
      detailed: true,
      milestones: [
        "Threat model + first audit",
        "WAF heuristics",
        "Abuse reports",
        "NIP-56 Reporting",
        "NIP-32 Labeling (flag types)"
      ]
    },
    {
      id: "payments-v2",
      timeframe: "Payments v2 & Liquidity",
      description: "Advanced payment features",
      detailed: true,
      milestones: [
        "Multi-mint Cashu wallet",
        "Cashu ↔ BOLT-12 swaps",
        "Zap-tip button for open relays",
        "NIP-57 Lightning Zaps",
        "NIP-65 Relay-list metadata"
      ]
    },
    {
      id: "enterprise-ha",
      timeframe: "Enterprise HA",
      description: "Enterprise-grade high availability",
      detailed: true,
      milestones: [
        "Multi-PoP proxy pools (AWS + GCP)",
        "VPC peering, 99.9% SLA",
        "SOC-2 prep",
        "NIP-11 extended fields (SLA)"
      ]
    },
    {
      id: "governance-draft",
      timeframe: "Governance Draft",
      description: "Community governance framework",
      detailed: true,
      milestones: [
        "Open-governance charter pushed to chain",
        "Steering-committee list",
        "NIP-78 App-specific data",
        "NIP-23 Long-form content"
      ]
    },
    {
      id: "dao-ready",
      timeframe: "DAO-Ready & Voting",
      description: "Decentralized autonomous organization",
      detailed: true,
      milestones: [
        "Token-weighted proposal votes (Cashu proofs)",
        "Ballots stored as long-form events",
        "NIP-23 Long-form content"
      ]
    }
  ];

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-black border-b border-white/5">
        <div className="px-4 max-w-4xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Routstr Roadmap</h1>
            <p className="text-xl text-gray-300 mb-8">
              Our progressive journey to building a decentralized AI ecosystem
            </p>
            <div className="flex justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 text-white hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Full Roadmap Timeline */}
      <section className="py-16 bg-black">
        <div className="px-4 max-w-5xl mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-white mb-8 pb-4 border-b border-white/10">Milestone Roadmap</h2>
              
              <RoadmapTimeline 
                items={roadmapItems} 
                alternating={false}
                showTheme={false}
              />
            </div>

            <div className="text-center mt-16 pt-8 border-t border-white/10">
              <p className="text-gray-400 mb-4">This roadmap is subject to change as we adapt to community feedback and industry developments.</p>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-white text-black px-8 py-3 text-sm font-medium transition-colors hover:bg-gray-200"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
} 