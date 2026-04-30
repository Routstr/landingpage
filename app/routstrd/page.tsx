"use client";

import { useState } from "react";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import { Copy, Check, Search, Zap, Shield, ArrowRight, Terminal, Cpu, Network, ChevronDown } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const tuiImages = [
  "https://image.nostr.build/61c5c89a6026bd273a480306d8f8993597bae961d39073f7a1a8397fba6740d6.png",
  "https://image.nostr.build/ee03a2ca42ca0b8093916fac5f2471ef3e76e8c7ec835e63970cb4d107fd978b.png",
  "https://image.nostr.build/e226f7569feee98e756621788065243ce84aa8876dec7b188908066fcc9edba6.png",
];

export default function RoutstrdPage() {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);
  const [activeTuiImage, setActiveTuiImage] = useState(0);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlock(index);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedBlock(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const steps = [
    {
      step: "01",
      title: "Install",
      command: "bun install -g routstrd",
      description: "Get the daemon on your machine with a single command.",
    },
    {
      step: "02",
      title: "Onboard",
      command: "routstrd onboard",
      description: "Choose your favorite agent — Claude Code, OpenClaw, OpenCode, or Pi Agent. Quick installations included, integrate with any app.",
    },
    {
      step: "03",
      title: "Top Up & Go",
      command: "routstrd receive 2100",
      description: "Scan a Lightning invoice and start your agent. It's that simple.",
    },
  ];

  const features = [
    {
      title: "Node Discovery",
      desc: "Constantly searches Nostr for Routstr/AI nodes in the background. Always knows where the good nodes are.",
      icon: Search,
    },
    {
      title: "Auto-Routing",
      desc: "Finds the cheapest available provider for the model you want. Falls back to the next best based on availability.",
      icon: ChevronDown,
    },
    {
      title: "Open Competition",
      desc: "Routstr nodes compete on price, latency, and uptime. You always get the best deal without thinking about it.",
      icon: Cpu,
    },
    {
      title: "Zero Permissions",
      desc: "No KYC, no credit cards, no sign-ups. Bitcoiners get the best price and the best experience.",
      icon: Shield,
    },
  ];

  return (
    <SiteShell className="font-mono">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20">
        <PageContainer>
          <div className="text-left mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground mb-7 sm:px-4 sm:py-1.5 sm:text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Announcing Routstrd
            </div>
            <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-6 tracking-tight leading-tight">
              The Only Tool you Need for Uncensorable Access to AI
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl font-light leading-relaxed mb-10">
              Routstrd is unlike any other inference provider — because it's <em>not</em> an inference provider. It's a tool, powered by Nostr and Bitcoin, that works for you.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><Network className="w-3 h-3 text-purple-500" /> Nostr Network</span>
              <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-500" /> Lightning Payments</span>
              <span className="flex items-center gap-2"><Shield className="w-3 h-3 text-green-500" /> No KYC</span>
              <span className="flex items-center gap-2"><Terminal className="w-3 h-3 text-blue-500" /> TUI Included</span>
            </div>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* How It Works - 3 Steps */}
      <section className="relative py-16 md:py-20">
        <PageContainer>
          <h2 className="text-xl font-bold text-white mb-12">Get Started in 3 Commands</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col border border-border bg-card p-5 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs text-muted-foreground font-bold">{step.step}</span>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">{step.description}</p>
                <div className="bg-black/40 border border-border overflow-hidden mb-8 mt-auto">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-white/5">
                    <span className="text-[10px] text-muted-foreground">bash</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => copyToClipboard(step.command, idx)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedBlock === idx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                  <div className="p-4 font-mono text-[11px] text-muted-foreground">
                    <div className="flex gap-2 break-all">
                      <span className="text-green-500">$</span>
                      <span>{step.command}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* TUI Showcase */}
      <section className="relative py-16 md:py-20">
        <PageContainer>
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">Beautiful TUI. Real-time visibility.</h2>
              <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                <p><strong className="text-white font-bold">Routstrd</strong> comes with a beautiful Terminal User Interface that keeps you up to date on everything happening — which provider you're connected to, what models are available, and how your balance is doing.</p>
                <p>I've been using Routstrd for a month. It was easier to battle-test as its primary user. The competition between nodes is already heating up, which means you're getting the best price for your sats.</p>
              </div>
              <div className="flex gap-2 mt-8">
                {tuiImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTuiImage(idx)}
                    className={`h-1.5 w-8 rounded-full transition-all ${
                      activeTuiImage === idx ? "bg-amber-500" : "bg-border hover:bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden border border-border bg-card rounded-xl">
              <div className="aspect-[16/10] relative bg-[#0a0a0a]">
                <Image
                  src={tuiImages[activeTuiImage]}
                  alt="Routstrd TUI screenshot"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* Features */}
      <section className="relative py-16 md:py-20">
        <PageContainer>
          <h2 className="text-xl font-bold text-white mb-12">How it works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            {features.map((feature, i) => (
              <div key={i} className="flex flex-col border border-border bg-card p-5 sm:p-8">
                <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center mb-6">
                  <feature.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-base font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-light">{feature.desc}</p>
              </div>
            ))}
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* Testimonial/Personal Note */}
      <section className="relative py-16 md:py-20 bg-card/30">
        <PageContainer>
          <div className="max-w-3xl">
            <div className="border-l-2 border-amber-500/50 pl-6 md:pl-8">
              <p className="text-lg md:text-xl text-foreground font-light leading-relaxed italic mb-6">
                &ldquo;Bitcoiners get the best price! And with Routstrd, Bitcoiners also get the best experience. The competition between Routstr nodes is getting heated right now and thus you're getting the best price for your sats.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <span className="text-amber-500 font-bold text-xs">₿</span>
                </div>
                <span className="text-xs text-muted-foreground">Battle-tested for a month. Built by Bitcoiners, for Bitcoiners.</span>
              </div>
            </div>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* CTA + Resources */}
      <section className="relative py-16 md:py-20">
        <PageContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-xl font-bold text-white mb-6">Try it out</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Please give Routstrd a spin. If you face any issues, let us know and we'll fix it fast.
              </p>
              <div className="bg-black/40 border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-white/5">
                  <span className="text-[10px] text-muted-foreground">bash</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => copyToClipboard("bun install -g routstrd\nroutstrd onboard\nroutstrd receive 2100", 99)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {copiedBlock === 99 ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="space-y-1 p-4 font-mono text-[11px] text-muted-foreground">
                  <div className="flex gap-2 break-all"><span className="text-green-500">$</span><span>bun install -g routstrd</span></div>
                  <div className="flex gap-2 break-all"><span className="text-green-500">$</span><span>routstrd onboard</span></div>
                  <div className="flex gap-2 break-all"><span className="text-green-500">$</span><span>routstrd receive 2100</span></div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-6">Resources</h2>
              <div className="space-y-4">
                {[
                  { title: "Nostr Profile", url: "https://njump.app/npub1ftt05tgku25m2akgvw6v7aqy5ux5mseqcrzy05g26ml43xf74nyqsredsh" },
                  { title: "GitHub", url: "https://github.com/routstr/routstrd" },
                  { title: "Docs", url: "https://docs.routstr.com" },
                  { title: "Platform", url: "https://beta.platform.routstr.com" },
                ].map((item) => (
                  <a key={item.title} href={item.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between border border-border p-4 hover:bg-muted transition-colors">
                    <span className="text-sm font-bold text-foreground group-hover:underline underline-offset-4">{item.title}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-white" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <Toaster richColors position="bottom-right" theme="dark" />
    </SiteShell>
  );
}
