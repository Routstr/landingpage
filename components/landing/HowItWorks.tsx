"use client";
import React, { useState } from "react";

export function LandingHowItWorks() {
  const [activeTab, setActiveTab] = useState<"users" | "providers">("users");

  const userSteps = [
    {
      title: "Get a Cashu token",
      description:
        "Bring your own Cashu eCash token. No accounts, emails, or sign-ups required. Complete privacy from the start.",
    },
    {
      title: "Use any OpenAI-compatible client",
      description:
        "Point your existing OpenAI SDK or application at any Routstr provider. Just use your Cashu token as the API key.",
    },
    {
      title: "Pay per request",
      description:
        "Cost is deducted in real-time based on actual token usage with live BTC/USD conversion routing.",
    },
  ];

  const providerSteps = [
    {
      title: "Deploy the payment proxy",
      description:
        "Run Routstr Core in front of any openai-compatible api backend (vllm, Ollama) using our simple Docker image.",
    },
    {
      title: "Accept bitcoin payments",
      description:
        "Connect to a Cashu mint to instantly receive eCash payments. No kyc required, no payment processing fees.",
    },
    {
      title: "Get discovered via Nostr",
      description:
        "Publish your node's details to Nostr relays. Users discover and connect to your services through decentralized listings.",
    },
  ];

  const activeSteps = activeTab === "users" ? userSteps : providerSteps;

  return (
    <div className="w-full relative">
      <div className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <h2 className="text-xl font-bold text-foreground">How It Works</h2>

          <div className="flex items-center gap-4 text-sm font-medium sm:gap-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`pb-1 border-b-2 leading-none transition-colors ${
                activeTab === "users"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              For users
            </button>
            <button
              onClick={() => setActiveTab("providers")}
              className={`pb-1 border-b-2 leading-none transition-colors ${
                activeTab === "providers"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              For providers
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {activeSteps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col relative pt-4 border-t border-border"
            >
              <span className="text-xs text-muted-foreground mb-3">
                0{index + 1}
              </span>
              <h3 className="text-base font-bold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
