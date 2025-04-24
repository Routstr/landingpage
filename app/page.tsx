"use client";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CtaSection from "@/components/CtaSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FeaturesSection from "@/components/FeaturesSection";
import AnalyticsSection from "@/components/AnalyticsSection";
import HeroSection from "../components/HeroSection";
import ApiExample from "../components/ApiExample";
import { getPopularModels, getProviderFromModelName, formatPrice, Model } from "../app/data/models";
import RoadmapTimeline from "@/components/RoadmapTimeline";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("users");

  const features = [
    {
      title: "Smart Client SDK",
      description: "One smart client that automatically finds the cheapest, fastest model for every prompt",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      ),
      iconBgColor: "bg-white/5",
      iconColor: "text-white"
    },
    {
      title: "Self-Hosted Proxy",
      description: "Turn any OpenAI-compatible endpoint into a pay-as-you-go business—no Stripe, no KYC",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
        </svg>
      ),
      iconBgColor: "bg-white/5",
      iconColor: "text-white"
    },
    {
      title: "Privacy Routing",
      description: "SOCKS5 / Tor support baked in for enhanced privacy and censorship resistance",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      ),
      iconBgColor: "bg-white/5",
      iconColor: "text-white"
    },
    {
      title: "Decentralized Payments",
      description: "Cashu ecash tokens and BOLT12 Lightning invoices for prepaid, private transactions",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      iconBgColor: "bg-white/5",
      iconColor: "text-white"
    }
  ];

  const testimonials = [
    {
      name: "AI Developer",
      handle: "aibuilder",
      quote: "Routstr gives me the flexibility to use any LLM provider without worrying about API key management or centralized censorship."
    },
    {
      name: "Privacy Advocate",
      handle: "privacyfirst",
      quote: "The Tor support and Cashu payments make this the first truly privacy-preserving solution for LLM access I've found."
    }
  ];

  // Get models from models.json data
  const displayModels = getPopularModels(6).map(model => {
    const provider = getProviderFromModelName(model.name);
    const modelName = model.name.split('/').length > 1 ? model.name.split('/')[1] : model.name;

    return {
      id: model.name.replace(/\//g, '-'),
      name: modelName,
      provider: provider,
      latency: provider === 'groq' ? "~30ms" : "~150ms",
      priceRange: formatPrice(model),
      context: "128K tokens"
    };
  });

  // Roadmap items for the landing page
  const roadmapItems = [
    {
      timeframe: "Core Alpha",
      description: "Smart-Client SDK α (JS/TS), Proxy α with Cashu payments, Relay seed list + CI"
    },
    {
      timeframe: "Proxy Payments",
      description: "Cashu bearer-token auth, BOLT-12 invoice flow via Wallet-Connect"
    },
    {
      timeframe: "Developer Experience",
      description: "VS Code helper, routstr dev tunnel, LangChain / LlamaIndex connectors"
    },
    {
      timeframe: "Privacy Layer",
      description: "One-flag Tor/SOCKS5 routing, Exit-latency feed"
    }
  ];

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      {/* Hero Section */}
      <HeroSection
        title="A Decentralised LLM Routing Marketplace"
        description="Routstr brings the convenience of the OpenRouter experience to the permissionless, censorship‑resistant world of Nostr and Bitcoin"
      />

      {/* How It Works Section */}
      <section className="py-20 bg-black">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-white mb-12">How It Works</h2>

          {/* Toggle Switch */}
          <div className="max-w-xs mx-auto mb-12 bg-white/5 rounded-full p-0.5 flex gap-1">
            <button
              className={`flex-1 py-1.5 px-3 rounded-full text-center text-xs font-medium transition-all ${activeTab === "users" ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
              onClick={() => setActiveTab("users")}
            >
              For Users
            </button>
            <button
              className={`flex-1 py-1.5 px-3 rounded-full text-center text-xs font-medium transition-all ${activeTab === "providers" ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
              onClick={() => setActiveTab("providers")}
            >
              For Providers
            </button>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* For Users Content */}
            {activeTab === "users" && (
              <div className="space-y-10">
                {/* Step 1 */}
                <div className="flex">
                  <div className="w-14 h-14 rounded-full bg-white/5 mr-6 flex-shrink-0 flex items-center justify-center relative">
                    <span className="text-2xl font-bold text-white">1</span>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-white/10 hidden md:block"></div>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Buy Cashu tokens</h4>
                    <p className="text-gray-400 mb-3">Purchase AI credits directly with Lightning or on-chain Bitcoin. No account or sign-up required.</p>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
                          </svg>
                          <span className="text-white">Lightning Payment</span>
                        </div>
                        <span className="text-white font-mono">10,000 sats</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex">
                  <div className="w-14 h-14 rounded-full bg-white/5 mr-6 flex-shrink-0 flex items-center justify-center relative">
                    <span className="text-2xl font-bold text-white">2</span>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-white/10 hidden md:block"></div>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Receive token instantly</h4>
                    <p className="text-gray-400 mb-3">Get your Cashu token immediately after payment. Use this as your API authorization key.</p>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="flex flex-col">
                        <div className="flex justify-between mb-3">
                          <span className="text-gray-400 font-mono text-sm">ROUTSTR_TOKEN</span>
                          <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </div>
                        <div className="font-mono text-white text-sm break-all mb-3">cashuA1DkpMbgQ9VkL6U...</div>
                        <div className="text-xs text-gray-400">Use this token in the Authorization header</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex">
                  <div className="w-14 h-14 rounded-full bg-white/5 mr-6 flex-shrink-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Make API calls directly</h4>
                    <p className="text-gray-400 mb-3">Use the token in your API calls with our OpenAI-compatible endpoints. No account needed.</p>

                    <div className="bg-black/30 rounded-lg border border-white/10 p-4">
                      <code className="text-sm font-mono text-white">
                        curl https://api.routstr.org/v1/chat/completions \<br />
                        &nbsp;&nbsp;-H "Authorization: Bearer cashuA1DkpMbgQ9VkL6U..." \<br />
                        &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                        &nbsp;&nbsp;-d {"'{\"model\": \"gpt-4\", \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]}'"}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* For Providers Content */}
            {activeTab === "providers" && (
              <div className="space-y-10">
                {/* Step 1 */}
                <div className="flex">
                  <div className="w-14 h-14 rounded-full bg-white/5 mr-6 flex-shrink-0 flex items-center justify-center relative">
                    <span className="text-2xl font-bold text-white">1</span>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-white/10 hidden md:block"></div>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Set up your proxy</h4>
                    <p className="text-gray-400 mb-3">Deploy our self-hosted proxy in front of any OpenAI-compatible endpoint with a simple Docker command.</p>

                    <div className="bg-black/30 rounded-lg border border-white/10 p-4">
                      <code className="text-sm font-mono text-white">docker run -p 8080:8080 ghcr.io/routstr/proxy</code>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex">
                  <div className="w-14 h-14 rounded-full bg-white/5 mr-6 flex-shrink-0 flex items-center justify-center relative">
                    <span className="text-2xl font-bold text-white">2</span>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-white/10 hidden md:block"></div>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Connect payments</h4>
                    <p className="text-gray-400 mb-3">Configure your Cashu mint or Lightning node to accept pre-paid tokens. No need for Stripe or KYC.</p>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white">Payment Gateways</span>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center">
                          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center">
                          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex">
                  <div className="w-14 h-14 rounded-full bg-white/5 mr-6 flex-shrink-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Publish your listing</h4>
                    <p className="text-gray-400 mb-3">Advertise your available models and pricing on the Nostr network. Join the decentralized AI marketplace.</p>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-white">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                            </svg>
                            <span className="text-white">Model Analytics</span>
                          </div>
                        </div>
                        <div className="text-sm text-white">Monitor usage, revenue, and performance in real-time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-white text-black px-8 py-3 text-sm font-medium transition-colors hover:bg-gray-200"
            >
              Get started now
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection
        title="Powerful features for decentralized AI access"
        features={features}
      />

      {/* API Example Section */}
      <section className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Simple Integration
            </h2>
            <p className="text-gray-400">
              Integrate with Routstr using our OpenAI-compatible API endpoints with just a few lines of code
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
            <h2 className="text-3xl font-bold text-white mb-4">
              Browse Available Models
            </h2>
            <p className="text-gray-400">
              Access a wide range of AI models through independent providers with transparent pricing and performance metrics
            </p>
          </div>

          <div className="relative">
            <div className="flex flex-col space-y-4 max-w-4xl mx-auto">
              {displayModels.map((model) => (
                <Link
                  key={model.id}
                  href={`/models/${model.id}`}
                  className="block bg-black border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">{model.name}</h3>
                      <p className="text-sm text-gray-500">{model.provider}</p>
                      <div className="flex gap-4 mt-2">
                        <div>
                          <span className="text-gray-400 font-medium">Price:</span> {model.priceRange}
                        </div>
                        <div>
                          <span className="text-gray-400 font-medium">Latency:</span> {model.latency}
                        </div>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Fade effect */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
          </div>
          
          <div className="mt-8 text-center">
            <Link
              href="/models"
              className="inline-flex items-center justify-center gap-2 text-white hover:text-gray-300 font-medium"
            >
              View all models
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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

      {/* Testimonials Section */}
      {/* <TestimonialsSection
        title="Built by and for the community"
        testimonials={testimonials}
      /> */}

      {/* Roadmap Section */}
      <div className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Roadmap</h2>
            <p className="text-gray-400">Our progressive journey to building a decentralized AI ecosystem</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <RoadmapTimeline items={roadmapItems} />
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/roadmap"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white/5 border border-white/10 px-6 py-3 text-sm text-white font-medium hover:bg-white/10 transition-colors"
            >
              View full roadmap
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <CtaSection
        title="Get started with Routstr"
        description="Open source, permissionless access to AI is available now"
        buttonText="Start using now"
        buttonLink="/dashboard"
      />

      <Footer />
    </main>
  );
}
