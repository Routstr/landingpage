import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RoadmapTimeline, { RoadmapItem } from "@/components/RoadmapTimeline";

export default function RoadmapPage() {
  const roadmapItems: RoadmapItem[] = [
    {
      id: "rip-01",
      timeframe: "RIP-01: API Proxy & Payments",
      description: "OpenAI-API Proxy with Cashu Payments",
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
        "Nostr Kind 40500 event for node announcements",
        "Node capabilities including models, pricing, region",
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
        "List active nodes from Nostr Kind 40500",
        "Filter by models, region, price, social proximity",
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
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-8 sm:pt-16 md:pt-24 pb-16 md:pb-24 bg-black border-b border-white/5">
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Routstr Roadmap
            </h1>
            <p className="text-base sm:text-xl text-gray-300 mb-8">
              Our progressive journey to building a decentralized AI ecosystem
            </p>
            <div className="flex justify-center">
              <BackButton
                fallbackHref="/"
                className="inline-flex items-center justify-center gap-2 text-white hover:text-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
                Back
              </BackButton>
            </div>
          </div>
        </div>
      </section>

      {/* Full Roadmap Timeline */}
      <section className="pt-8 sm:pt-16 pb-16 bg-black">
        <div className="px-4 md:px-6 max-w-5xl mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 pb-4 border-b border-white/10">
                Milestone Roadmap
              </h2>

              <RoadmapTimeline
                items={roadmapItems}
                alternating={false}
                showTheme={false}
              />
            </div>

            <div className="text-center mt-16 pt-8 border-t border-white/10">
              <p className="text-gray-400 mb-4">
                This roadmap is subject to change as we adapt to community
                feedback and industry developments.
              </p>
              <BackButton
                fallbackHref="/"
                className="inline-flex items-center justify-center rounded-md bg-white text-black px-8 py-3 text-sm font-medium transition-colors hover:bg-gray-200"
              >
                Back
              </BackButton>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
