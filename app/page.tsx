"use client";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CtaSection from "@/components/CtaSection";
import AnalyticsSection from "@/components/AnalyticsSection";
import HeroSection from "../components/HeroSection";
import ApiExample from "../components/ApiExample";
import {
  getPopularModels,
  getProviderFromModelName,
  fetchModels,
} from "./data/models";
import RoadmapTimeline from "@/components/RoadmapTimeline";
import { useState, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Globe } from "@/components/ui/globe";
import FullScreenGlobeDialog from "@/components/client/FullScreenGlobeDialog";

// Custom theme based on atomDark but more minimal
const customTheme = {
  ...atomDark,
  'pre[class*="language-"]': {
    ...atomDark['pre[class*="language-"]'],
    background: "transparent",
    margin: 0,
    padding: 0,
    overflow: "visible",
  },
  'code[class*="language-"]': {
    ...atomDark['code[class*="language-"]'],
    background: "transparent",
    textShadow: "none",
    fontSize: "0.7rem", // Reduced from 0.75rem for mobile
  },
  // Remove underscores from identifiers
  ".token.class-name": {
    textDecoration: "none",
  },
  ".token.namespace": {
    textDecoration: "none",
    opacity: 1,
  },
  ".token.entity": {
    textDecoration: "none",
  },
  ".token.console": {
    textDecoration: "none",
  },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("users");
  const [globeOpen, setGlobeOpen] = useState(false);
  const [displayModels, setDisplayModels] = useState<
    Array<{
      id: string;
      name: string;
      provider: string;
      promptPrice: string;
      completionPrice: string;
      context: string;
      created: number;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      setIsLoading(true);
      try {
        await fetchModels();
        const models = getPopularModels(5).map((model) => {
          const provider = getProviderFromModelName(model.name);
          const modelName =
            model.name.split("/").length > 1
              ? model.name.split("/")[1]
              : model.name;

          // Convert to tokens per sat for display
          const promptPrice = model.sats_pricing.prompt > 0 ? 1 / model.sats_pricing.prompt : 0;
          const completionPrice = model.sats_pricing.completion > 0 ? 1 / model.sats_pricing.completion : 0;

          // Format numbers to a simpler format
          const formatTokensPerSat = (num: number) => {
            if (num < 0.0001) {
              // Use scientific notation with fewer digits for very small numbers
              return num.toExponential(2);
            }
            // Use fewer decimal places for better readability
            return num.toFixed(
              Math.min(4, Math.max(1, 6 - Math.floor(Math.log10(num) + 1)))
            );
          };

          const promptFormatted = formatTokensPerSat(promptPrice);
          const completionFormatted = formatTokensPerSat(completionPrice);

          return {
            id: model.id,
            name: modelName,
            provider: provider,
            promptPrice: promptFormatted,
            completionPrice: completionFormatted,
            context: "128K tokens",
            created: model.created,
          };
        });
        setDisplayModels(models);
      } catch (error) {
        console.error("Error loading models:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadModels();
  }, []);

  const features = [
    {
      title: "Smart Client SDK",
      description:
        "One smart client that automatically finds the cheapest, fastest model for every prompt",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
          />
        </svg>
      ),
      iconBgColor: "bg-white/5",
      iconColor: "text-white",
    },
    {
      title: "Self-Hosted Proxy",
      description:
        "Turn any OpenAI-compatible endpoint into a pay-as-you-go business—no Stripe, no KYC",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
          />
        </svg>
      ),
      iconBgColor: "bg-white/5",
      iconColor: "text-white",
    },
    {
      title: "Privacy Routing",
      description:
        "SOCKS5 / Tor support baked in for enhanced privacy and censorship resistance",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
          />
        </svg>
      ),
      iconBgColor: "bg-white/5",
      iconColor: "text-white",
    },
    {
      title: "Decentralized Payments",
      description:
        "Cashu ecash tokens and BOLT12 Lightning invoices for prepaid, private transactions",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
      iconBgColor: "bg-white/5",
      iconColor: "text-white",
    },
  ];

  // Roadmap items for the landing page
  const roadmapItems = [
    {
      timeframe: "RIP-01: API Proxy & Payments",
      description:
        "OpenAI-API Proxy with Cashu micropayments for LLM inference",
    },
    {
      timeframe: "RIP-02: Node Listing",
      description:
        "Nostr event announcements for inference nodes and capabilities",
    },
    {
      timeframe: "RIP-03: Frontend Discovery",
      description: "Web interface for browsing and filtering available nodes",
    },
    {
      timeframe: "RIP-04 & RIP-05: Quality & Privacy",
      description:
        "Anonymous evaluations and smart clients with Tor/proxy routing",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      {/* Hero Section */}
      <HeroSection
        title="A Decentralised LLM Routing Marketplace"
        description="Permissionless, censorship‑resistant AI routing powered by Nostr and Cashu"
      />

      {/* Globe Visualization */}
      <section className="pb-8 sm:pb-12 bg-black">
        <div className="container mx-auto px-4 relative group">
          <div className="relative max-w-[600px] mx-auto">
            <button
              type="button"
              aria-label="Open globe"
              className="absolute inset-0 z-10 cursor-pointer w-full h-full"
              onClick={() => setGlobeOpen(true)}
            />
            <div className="pointer-events-none absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full bg-black/70 border border-white/20 px-4 py-2 text-sm sm:text-base text-white shadow-xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 19.5 19.5 4.5M9 4.5h10.5V15"
                  />
                </svg>
                <span>Click to explore</span>
              </div>
            </div>
            <Globe />
          </div>
        </div>
        <FullScreenGlobeDialog open={globeOpen} onOpenChange={setGlobeOpen} />
      </section>

      {/* Testimonials Section removed temporarily */}

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-black">
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl">
          <h2 className="text-xl sm:text-3xl font-bold text-center text-white mb-6 sm:mb-12">
            How It Works
          </h2>

          {/* Toggle Switch */}
          <div className="max-w-xs mx-auto mb-6 sm:mb-12 bg-white/5 rounded-full p-0.5 flex gap-1">
            <button
              className={`flex-1 py-1.5 px-3 rounded-full text-center text-xs font-medium transition-all ${
                activeTab === "users"
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => setActiveTab("users")}
            >
              For Users
            </button>
            <button
              className={`flex-1 py-1.5 px-3 rounded-full text-center text-xs font-medium transition-all ${
                activeTab === "providers"
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => setActiveTab("providers")}
            >
              For Providers
            </button>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* For Users Content */}
            {activeTab === "users" && (
              <div className="space-y-8 sm:space-y-10">
                {/* Step 1 */}
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 mb-4 sm:mb-0 sm:mr-6 flex-shrink-0 flex items-center justify-center relative mx-auto sm:mx-0">
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      1
                    </span>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-white/10 hidden sm:block"></div>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-2 text-white text-center sm:text-left">
                      Use Cashu tokens
                    </h4>
                    <p className="text-sm sm:text-base text-gray-400 mb-3 text-center sm:text-left">
                      Bring your own Cashu token or purchase via Lightning. No
                      account or sign-up required.
                    </p>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10">
                        <div className="flex items-center">
                          <svg
                            className="h-5 w-5 mr-2 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            ></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          <span className="text-white">
                            Paste existing token
                          </span>
                        </div>
                        <span className="text-white font-mono truncate max-w-[120px]">
                          cashuA1DkpMbgQ9VkL6U...
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <svg
                            className="h-5 w-5 mr-2 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
                          </svg>
                          <span className="text-white">Lightning purchase</span>
                        </div>
                        <span className="text-white font-mono">
                          10,000 sats
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 mb-4 sm:mb-0 sm:mr-6 flex-shrink-0 flex items-center justify-center relative mx-auto sm:mx-0">
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      2
                    </span>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-white/10 hidden sm:block"></div>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-2 text-white text-center sm:text-left">
                      Receive token instantly
                    </h4>
                    <p className="text-sm sm:text-base text-gray-400 mb-3 text-center sm:text-left">
                      If you paid via Lightning, you&apos;ll receive a token
                      instantly. If you already have one, use it as your API
                      authorization key.
                    </p>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="flex flex-col">
                        <div className="flex justify-between mb-3">
                          <span className="text-gray-400 font-mono text-sm">
                            ROUTSTR_TOKEN
                          </span>
                          <svg
                            className="h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            ></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </div>
                        <div className="font-mono text-white text-sm break-all mb-3">
                          cashuA1DkpMbgQ9VkL6U...
                        </div>
                        <div className="text-xs text-gray-400">
                          Use this token in the Authorization header
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 mb-4 sm:mb-0 sm:mr-6 flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      3
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-2 text-white text-center sm:text-left">
                      Make API calls directly
                    </h4>
                    <p className="text-sm sm:text-base text-gray-400 mb-3 text-center sm:text-left">
                      Use the token in your API calls with our OpenAI-compatible
                      endpoints. No account needed.
                    </p>

                    <div className="bg-black/70 rounded-lg p-2 sm:p-4 border border-white/10 overflow-x-auto">
                      <div className="text-xs sm:text-sm">
                        <SyntaxHighlighter
                          language="bash"
                          style={customTheme}
                          customStyle={{
                            background: "transparent",
                            lineHeight: "1.5",
                            margin: 0,
                          }}
                          showLineNumbers={false}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {`curl -X POST https://api.routstr.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer cashuA1DkpMbgQ9VkL6U..." \\
  -d '{
    "model": "gpt-5",
    "messages": [
      {
        "role": "user", 
        "content": "Hello, how are you?"
      }
    ]
  }'`}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* For Providers Content */}
            {activeTab === "providers" && (
              <div className="space-y-8 sm:space-y-10">
                {/* Step 1 */}
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 mb-4 sm:mb-0 sm:mr-6 flex-shrink-0 flex items-center justify-center relative mx-auto sm:mx-0">
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      1
                    </span>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-white/10 hidden sm:block"></div>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-2 text-white text-center sm:text-left">
                      Set up your proxy
                    </h4>
                    <p className="text-sm sm:text-base text-gray-400 mb-3 text-center sm:text-left">
                      Deploy our self-hosted proxy in front of any
                      OpenAI-compatible endpoint with a simple Docker command.
                    </p>

                    <div className="bg-black/70 rounded-lg p-2 sm:p-4 border border-white/10 overflow-x-auto">
                      <div className="text-xs sm:text-sm">
                        <SyntaxHighlighter
                          language="bash"
                          style={customTheme}
                          customStyle={{
                            background: "transparent",
                            lineHeight: "1.5",
                            margin: 0,
                          }}
                          showLineNumbers={false}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {`docker run -p 8080:8080 ghcr.io/routstr/proxy`}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 mb-4 sm:mb-0 sm:mr-6 flex-shrink-0 flex items-center justify-center relative mx-auto sm:mx-0">
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      2
                    </span>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-white/10 hidden sm:block"></div>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-2 text-white text-center sm:text-left">
                      Connect payments
                    </h4>
                    <p className="text-sm sm:text-base text-gray-400 mb-3 text-center sm:text-left">
                      Configure your Cashu mint or Lightning node to accept
                      pre-paid tokens. No need for Stripe or KYC.
                    </p>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white">Payment Gateways</span>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center">
                          <svg
                            className="h-4 w-4 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M13 3L4 14H12L11 21L20 10H12L13 3Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center">
                          <svg
                            className="h-4 w-4 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 mb-4 sm:mb-0 sm:mr-6 flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      3
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-2 text-white text-center sm:text-left">
                      Monitor and scale
                    </h4>
                    <p className="text-sm sm:text-base text-gray-400 mb-3 text-center sm:text-left">
                      Track usage, set custom pricing, and join the relay
                      network to get discovered by users automatically.
                    </p>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded bg-black/20 p-2">
                          <div className="text-xs text-gray-400 mb-1">
                            Requests
                          </div>
                          <div className="text-white font-semibold">1,240</div>
                        </div>
                        <div className="rounded bg-black/20 p-2">
                          <div className="text-xs text-gray-400 mb-1">
                            Revenue
                          </div>
                          <div className="text-white font-semibold">
                            42,300 sats
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-black/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2
              className="text-xl sm:text-3xl font-bold text-white mb-4"
              id="features"
            >
              Key Features
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              A complete platform for permissionless, privacy-first AI access
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="border border-white/10 rounded-lg p-5 bg-white/5 transition-colors"
              >
                <div
                  className={`h-10 w-10 flex items-center justify-center rounded-md mb-4 ${feature.iconBgColor}`}
                >
                  <div className={feature.iconColor}>{feature.icon}</div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Example Section */}
      <section className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Simple Integration
            </h2>
            <p className="text-sm sm:text-base text-gray-400">
              Integrate with Routstr using our OpenAI-compatible API endpoints
              with just a few lines of code
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <ApiExample />
          </div>
        </div>
      </section>

      {/* Providers Browse Section */}
      <section className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Browse Available Models
            </h2>
            <p className="text-sm sm:text-base text-gray-400">
              Access a wide range of AI models through independent providers
              with transparent pricing and performance metrics
            </p>
          </div>

          <div className="relative">
            <div className="flex flex-col space-y-4 max-w-4xl mx-auto">
              {isLoading ? (
                // Skeleton loading UI
                Array(3)
                  .fill(0)
                  .map((_, index) => (
                    <div
                      key={index}
                      className="bg-black border border-white/10 rounded-lg p-6 animate-pulse"
                    >
                      <div className="flex justify-between items-center">
                        <div className="w-full">
                          <div className="h-6 bg-white/5 rounded w-1/3 mb-3"></div>
                          <div className="h-4 bg-white/5 rounded w-1/4 mb-4"></div>
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="h-4 bg-white/5 rounded w-2/3"></div>
                            <div className="h-4 bg-white/5 rounded w-2/3"></div>
                          </div>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-white/5 flex-shrink-0"></div>
                      </div>
                    </div>
                  ))
              ) : displayModels.length > 0 ? (
                displayModels.map((model) => (
                  <Link
                    key={model.id}
                    href={`/models/${model.id}`}
                    className="block bg-black border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          {model.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm text-gray-500">
                            {model.provider}
                          </p>
                          <span className="text-xs text-gray-500">•</span>
                          <p className="text-xs text-gray-500">
                            {new Date(model.created * 1000).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-400 font-medium">
                              Input:
                            </span>{" "}
                            <span className="font-mono text-white">
                              {model.promptPrice}
                            </span>{" "}
                            <span className="text-gray-500">tokens/sat</span>
                          </div>
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-400 font-medium">
                              Output:
                            </span>{" "}
                            <span className="font-mono text-white">
                              {model.completionPrice}
                            </span>{" "}
                            <span className="text-gray-500">tokens/sat</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
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
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-400">
                    No models available at the moment. Please check back later.
                  </p>
                </div>
              )}
            </div>

            {/* Fade effect */}
            {displayModels.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/models"
              className="inline-flex items-center justify-center gap-2 text-white hover:text-gray-300 font-medium"
            >
              View all models
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <AnalyticsSection
        title="Simple Architecture, Powerful Results"
        description="One smart client SDK that automatically routes to the best providers"
      />

      {/* Roadmap Section */}
      <div className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Roadmap
            </h2>
            <p className="text-sm sm:text-base text-gray-400">
              Our progressive journey to building a decentralized AI ecosystem
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <RoadmapTimeline items={roadmapItems} alternating={false} />
          </div>

          <div className="mt-16 text-center">
            <Link
              href="https://github.com/routstr/protocol"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white/5 border border-white/10 px-6 py-3 text-sm text-white font-medium hover:bg-white/10 transition-colors"
            >
              View full roadmap
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <CtaSection
        title="Get started with Routstr"
        description="Open source, permissionless access to AI is available now"
        buttonText="Explore models"
        buttonLink="/models"
      />

      <Footer />
    </main>
  );
}
