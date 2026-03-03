"use client";

import { useState } from "react";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import { Copy, Check, Server, Laptop, Zap, Shield, ArrowRight } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";

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
      description: "Get a Linux VPS from LNVPS (pay with lightning), then run the setup script. Full stack deployment with Routstr pre-configured.",
      icon: Server,
      borderColor: "border-border",
      commands: [
        "curl -L https://routstr.com/lnvps-routstr-openclaw.sh -o routstr-setup.sh",
        "chmod +x routstr-setup.sh",
        "./routstr-setup.sh",
      ],
      features: [
        "pay for vps with lightning",
        "installs node.js + openclaw",
        "configures routstr as provider",
        "runs onboarding wizard",
      ],
    },
    {
      title: "Your own machine",
      subtitle: "Linux only",
      description: "Already have a machine? Run the setup script to install OpenClaw and configure Routstr as your AI provider.",
      icon: Laptop,
      borderColor: "border-border",
      commands: [
        "curl -L https://routstr.com/routstr-openclaw.sh -o routstr-setup.sh",
        "chmod +x ... setup.sh",
        "./routstr-setup.sh",
      ],
      features: [
        "requires node.js 22+",
        "configures routstr as provider",
        "runs onboarding wizard",
      ],
    },
  ];

  return (
    <SiteShell className="font-mono">
      <section className="relative py-12 md:py-20">
        <PageContainer>
          <div className="text-left mb-16">
            <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-6 tracking-tight leading-tight">
              OpenClaw in &lt; 5 mins with ₿
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl font-light leading-relaxed mb-10">
              Setup <a href="https://openclaw.ai" target="_blank" rel="noopener noreferrer" className="text-white hover:underline underline-offset-4">OpenClaw</a> with a single lightning payment to deploy a VPS with Routstr balance.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-500" /> Lightning Network</span>
              <span className="flex items-center gap-2"><Shield className="w-3 h-3 text-green-500" /> No KYC</span>
              <span className="flex items-center gap-2"><Server className="w-3 h-3 text-blue-500" /> Self-hosted</span>
            </div>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <section className="relative py-16 md:py-20">
        <PageContainer>
          <h2 className="text-xl font-bold text-white mb-12">Installation</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {setupOptions.map((option, idx) => (
              <div key={idx} className="flex flex-col border border-border bg-card p-5 sm:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{option.title}</h3>
                    <p className="text-xs text-muted-foreground">{option.subtitle}</p>
                  </div>
                  <option.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">{option.description}</p>
                <div className="bg-black/40 border border-border overflow-hidden mb-8">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-white/5">
                    <span className="text-[10px] text-muted-foreground">bash</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => copyToClipboard(option.commands.join("\n"), idx)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedIndex === idx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                  <div className="space-y-1 p-4 font-mono text-[11px] text-muted-foreground">
                    {option.commands.map((c, i) => (
                      <div key={i} className="flex gap-2 break-all"><span className="text-muted-foreground">$</span><span>{c}</span></div>
                    ))}
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-1 gap-2">
                  {option.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Check className="w-2.5 h-2.5" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <section className="relative py-16 md:py-20">
        <PageContainer>
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">Your personal AI, running on your hardware.</h2>
              <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                <p><strong className="text-white font-bold">OpenClaw</strong> connects to your life—WhatsApp, Telegram, Slack, Discord, and iMessage. It&apos;s an agent that lives in your terminal and talks to your services.</p>
                <p>By connecting it to <strong className="text-white font-bold">Routstr</strong>, you bypass subscriptions. Just top up with sats and pay only for what you use.</p>
              </div>
            </div>
            <div className="relative overflow-hidden border border-border bg-card p-5 font-mono text-[11px] sm:p-6">
              <div className="flex gap-2 text-muted-foreground mb-4">
                <span className="text-green-500">➜</span> <span className="text-blue-500">~</span> <span>openclaw agent --message &quot;check my prs&quot;</span>
              </div>
              <div className="text-muted-foreground mb-2">Thinking...</div>
              <div className="pl-4 border-l border-border text-muted-foreground">
                <span className="text-orange-500">@GitHub</span> PR #124 from dependabot needs review. Analyzing changes...
              </div>
              <div className="flex gap-2 mt-4"><span className="text-green-500">➜</span> <span className="text-blue-500">~</span> <span className="animate-pulse">_</span></div>
            </div>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <section className="relative py-16 md:py-20">
        <PageContainer>
          <h2 className="text-xl font-bold text-white mb-12">Skills included</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
            {[
              { title: "Balance manager", desc: "Monitor spending and request top-ups automatically.", icon: Zap },
              { title: "Cashu wallet", desc: "Private, instant ecash payments without on-chain fees.", icon: Shield },
              { title: "VPS manager", desc: "Manage your deployment via LNVPS with Bitcoin.", icon: Server },
            ].map((skill, i) => (
              <div key={i} className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <skill.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-base font-bold text-white">{skill.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed font-light">{skill.desc}</p>
              </div>
            ))}
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <section className="relative bg-card/30 py-16 md:py-20">
        <PageContainer>
          <h2 className="mb-8 text-[10px] font-bold tracking-widest text-muted-foreground">Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "GitHub", url: "https://github.com/openclaw/openclaw" },
              { title: "Docs", url: "https://docs.openclaw.ai" },
              { title: "LNVPS", url: "https://lnvps.net" },
              { title: "Platform", url: "https://beta.platform.routstr.com" },
            ].map((item) => (
              <a key={item.title} href={item.url} target={item.local ? undefined : "_blank"} rel={item.local ? undefined : "noopener noreferrer"} className="group border border-border p-6 hover:bg-muted transition-colors flex items-center justify-between">
                <span className="text-sm font-bold text-foreground group-hover:underline underline-offset-4">{item.title}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-white" />
              </a>
            ))}
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>
      <Toaster richColors position="bottom-right" theme="dark" />
    </SiteShell>
  );
}
