"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Copy, Check, Server, Laptop, Zap, Shield } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function OpenClawPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const setupOptions = [
    {
      title: "Fresh VPS with LNVPS",
      subtitle: "Pay for hosting with Bitcoin",
      description:
        "Get a Linux VPS from LNVPS (pay with Lightning), then run the setup script. Full stack deployment with Routstr pre-configured.",
      icon: Server,
      gradient: "from-orange-500/20 to-amber-500/20",
      borderColor: "border-orange-500/30",
      iconColor: "text-orange-400",
      commands: [
        "curl -fsSL https://routstr.com/openclaw-lnvps.sh | bash",
      ],
      features: [
        "Pay for VPS with Lightning",
        "Installs Node.js + OpenClaw",
        "Configures Routstr as provider",
        "Runs onboarding wizard",
      ],
    },
    {
      title: "Your Own Machine",
      subtitle: "Only Linux (macOS coming soon)",
      description:
        "Already have a machine? Run the setup script to install OpenClaw and configure Routstr as your AI provider.",
      icon: Laptop,
      gradient: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-400",
      commands: [
        "curl -fsSL https://routstr.com/openclaw.sh | bash",
      ],
      features: [
        "Linux (macOS coming soon)",
        "Requires Node.js 22+",
        "Configures Routstr as provider",
        "Runs onboarding wizard",
      ],
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-black text-white touch-manipulation selection:bg-orange-500/30 selection:text-orange-200">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-8 md:pt-32 md:pb-12 border-b border-white/10">
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-8 tracking-tight text-balance">
              {/* Routstr <span className="text-gray-600 mx-2">↔</span> OpenClaw */}
              OpenClaw in {"<"} 5 mins with{" "}
              <span className="text-orange-400">₿</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed text-pretty">
              Setup{" "}
              <a
                href="https://openclaw.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-orange-400 underline decoration-gray-700 underline-offset-4 transition-colors"
              >
                OpenClaw
              </a>{" "}
              with a{" "}
              <span className="text-orange-400 font-semibold">
                single lightning payment
              </span>{" "}
              to deploy a VPS with Routstr balance and arm it with skills to pay
              for itself.
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-sm font-mono text-gray-500">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                Lightning Network
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" aria-hidden="true" />
                No KYC
              </span>
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" aria-hidden="true" />
                Self-hosted
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Options Section - Terminal Card Style */}
      <section className="py-20 bg-zinc-950">
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Installation</h2>
            <p className="text-gray-400">
              Choose your preferred deployment method.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {setupOptions.map((option, optionIndex) => (
              <div
                key={option.title}
                className="group relative bg-black border border-white/10 hover:border-white/20 transition-all duration-300 rounded-xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        {option.title}
                        {optionIndex === 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Recommended
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-400 font-mono">
                        {option.subtitle}
                      </p>
                    </div>
                    <option.icon className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" />
                  </div>

                  <p className="text-gray-400 mb-8 leading-relaxed h-12">
                    {option.description}
                  </p>

                  <div className="space-y-4">
                    <div className="bg-zinc-900 border border-white/5 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                        <span className="text-xs text-gray-500 font-mono">
                          bash
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              option.commands.join("\n"),
                              optionIndex * 100,
                            )
                          }
                          className="text-gray-500 hover:text-white transition-colors"
                          aria-label="Copy all commands"
                        >
                          {copiedIndex === optionIndex * 100 ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="p-4 space-y-1 font-mono text-sm">
                        {option.commands.map((command, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-gray-600 select-none">$</span>
                            <span className="text-gray-300 break-all">
                              {command}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <ul className="grid grid-cols-2 gap-2 mt-6">
                      {option.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-xs text-gray-500 font-mono"
                        >
                          <Check className="w-3 h-3 text-gray-700" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is OpenClaw Section - Redesigned to be cleaner */}
      <section className="py-20 border-b border-white/10">
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                Your Personal AI, <br />
                Running on Your Hardware.
              </h2>
              <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                <p>
                  <strong className="text-white">OpenClaw</strong> connects to
                  your life—WhatsApp, Telegram, Slack, Discord, and iMessage.
                  It&apos;s not just a chatbot; it&apos;s an agent that lives in
                  your terminal and talks to your services.
                </p>
                <p>
                  By connecting it to{" "}
                  <strong className="text-white">Routstr</strong>, you bypass
                  the need for OpenAI or Anthropic subscriptions. Just top up
                  with sats and pay only for what you use.
                </p>
              </div>

              <div className="mt-8 flex gap-8">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    127k+
                  </div>
                  <div className="text-sm text-gray-500 font-mono">
                    GitHub Stars
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">10+</div>
                  <div className="text-sm text-gray-500 font-mono">
                    Channels
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-white/10 rounded-lg p-6 font-mono text-sm relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
              </div>
              <div className="mt-8 space-y-2 text-gray-300">
                <div className="flex gap-2">
                  <span className="text-green-400">➜</span>
                  <span className="text-blue-400">~</span>
                  <span>openclaw agent --message &quot;Check my PRs&quot;</span>
                </div>
                <div className="text-gray-500">Thinking...</div>
                <div className="pl-4 border-l-2 border-white/10">
                  <span className="text-orange-400">@GitHub</span> PR #124 from
                  dependabot needs review.
                  <br />
                  Analyzing changes...
                </div>
                <div className="flex gap-2 pt-2">
                  <span className="text-green-400">➜</span>
                  <span className="text-blue-400">~</span>
                  <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills That Come With the Setup */}
      <section className="py-20 border-b border-white/10">
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 tracking-tight">
            Skills That Come With the Setup
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Routstr Balance Manager
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your agent can check your Routstr balance, request top-ups, and
                monitor your spending on LLM requests automatically.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Cashu Wallet</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Built-in Cashu e-cash wallet for private, instant payments. Send
                and receive sats without on-chain transactions.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Server className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">LNVPS Manager</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your agent can manage its own VPS through LNVPS—restart
                services, check status, and handle deployments via Bitcoin
                payments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Steps */}
      <section className="py-20 border-t border-white/10">
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="text-4xl font-bold text-gray-500 font-mono">
                01
              </div>
              <h3 className="text-lg font-bold text-white">Install & Config</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                The setup script installs Node.js, OpenClaw, and configures the
                `routstr` provider in `~/.openclaw/openclaw.json` automatically.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-bold text-gray-500 font-mono">
                02
              </div>
              <h3 className="text-lg font-bold text-white">LLM Top Up</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ask your LLM to help you topup, and it'll send you a lightning
                invoice.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-bold text-gray-500 font-mono">
                03
              </div>
              <h3 className="text-lg font-bold text-white">Connect</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Use `openclaw onboard` to link your preferred chat apps like
                WhatsApp or Telegram.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Links - Minimal List */}
      <section className="py-20 border-t border-white/10 bg-zinc-950">
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-8 font-mono uppercase tracking-wider">
            Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10">
            {[
              {
                title: "OpenClaw GitHub",
                desc: "Source code",
                url: "https://github.com/openclaw/openclaw",
              },
              {
                title: "Documentation",
                desc: "Configuration guides",
                url: "https://docs.openclaw.ai",
              },
              {
                title: "LNVPS",
                desc: "Bitcoin VPS hosting",
                url: "https://lnvps.net",
              },
              {
                title: "Top Up",
                desc: "Add funds",
                url: "/topup",
                local: true,
              },
            ].map((item) => (
              <a
                key={item.title}
                href={item.url}
                target={item.local ? undefined : "_blank"}
                rel={item.local ? undefined : "noopener noreferrer"}
                className="bg-black p-6 hover:bg-zinc-900 transition-colors group block"
              >
                <div className="font-bold text-white mb-1 group-hover:text-orange-400 transition-colors flex items-center justify-between">
                  {item.title}
                  <span className="text-white/20 group-hover:text-orange-400/50">
                    ↗
                  </span>
                </div>
                <div className="text-sm text-gray-500 font-mono">
                  {item.desc}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <Toaster richColors position="bottom-right" theme="dark" />
    </main>
  );
}
