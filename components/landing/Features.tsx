"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { gsap, useGSAP } from "@/lib/gsap";
import { useInView } from "@/hooks/use-in-view";
import { Bot, User, Zap } from "lucide-react";

export function LandingFeatures() {
  const features = [
    {
      title: "OpenAI compatible API",
      description:
        "Works seamlessly with any OpenAI SDK, LangChain, or desktop application. A true drop-in replacement for chat completions without vendor lock-in.",
      visual: <ApiRequestSkeleton />
    },
    {
      title: "Pay-per-request",
      description:
        "No monthly subscriptions. Pay precisely for the tokens you generate using seamless eCash and Bitcoin Lightning micropayments.",
      visual: <PaymentSkeleton />
    },
    {
      title: "Decentralized discovery",
      description:
        "Find and connect to providers through Nostr relays. Say goodbye to central registries and single points of failure.",
      visual: <NetworkSkeleton />
    },
    {
      title: "Simple deployment",
      description:
        "Monetize your own hardware by running the Routstr proxy in a single Docker container. Connect to a mint and start earning immediately.",
      visual: <DockerSkeleton />
    },
  ];

  return (
    <div className="w-full relative">
      <div className="px-[clamp(1rem,5vw,5rem)] py-20 max-w-[1800px] mx-auto">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-12">Key capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col group gap-6">
              <div>
                <h3 className="text-base font-bold text-[#e5e5e5] mb-3 flex items-center gap-2">
                  <span className="text-[#555555] font-normal text-xs">[{index + 1}]</span>
                  {feature.title}
                </h3>
                <p className="text-[#a1a1a1] text-sm leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
              <div className="w-full h-[240px] rounded-xl overflow-hidden relative">
                {feature.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2c2c2c] to-transparent" />
    </div>
  );
}

// Skeletons

const ApiRequestSkeleton = () => {
    const rootRef = useRef<HTMLDivElement>(null);
    const highlight1Ref = useRef<HTMLDivElement>(null);
    const line1Ref = useRef<HTMLDivElement>(null);
    const highlight2Ref = useRef<HTMLDivElement>(null);
    const line2Ref = useRef<HTMLDivElement>(null);

    useGSAP(
      () => {
        gsap.fromTo(
          highlight1Ref.current,
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.5, delay: 0.2, ease: "power2.out" }
        );
        gsap.fromTo(
          line1Ref.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, delay: 0.4 }
        );
        gsap.fromTo(
          highlight2Ref.current,
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.5, delay: 0.3, ease: "power2.out" }
        );
        gsap.fromTo(
          line2Ref.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, delay: 0.5 }
        );
      },
      { scope: rootRef }
    );

    return (
        <div ref={rootRef} className="p-0 sm:p-2 md:p-6 w-full h-full flex flex-col justify-center items-center font-mono">
            <div className="w-full h-full bg-[#171717] border-0 sm:border border-[#333] sm:rounded-xl overflow-hidden shadow-lg flex flex-col">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-[#333] bg-[#222] shrink-0">
                    <div className="flex gap-1.5">
                        <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#444]"></div>
                        <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#444]"></div>
                        <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#444]"></div>
                    </div>
                    <span className="text-[#888] text-[9px] md:text-[10px] ml-1 md:ml-2 font-mono">app.py</span>
                </div>

                {/* Code block */}
                <div className="py-4 md:py-5 px-3 md:px-6 text-[9px] sm:text-[10px] md:text-[11px] leading-[1.8] md:leading-[2] text-[#a1a1a1] overflow-hidden flex-1 flex flex-col justify-center">
                    <div className="whitespace-nowrap"><span className="text-[#e5e5e5]">client</span> = <span className="text-[#e5e5e5]">OpenAI</span>(</div>
                    <div className="relative">
                        <div
                            ref={highlight1Ref}
                            className="absolute -inset-x-3 md:-inset-x-4 inset-y-0 bg-emerald-500/[0.04] border-l-[3px] border-emerald-500/40"
                        />
                        <div
                            ref={line1Ref}
                            className="pl-3 md:pl-6 relative whitespace-nowrap overflow-hidden text-ellipsis"
                        >
                            <span className="text-[#888]">base_url</span>=<span className="text-emerald-500/80">&quot;https://api.routstr.com/v1&quot;</span>,
                        </div>
                    </div>
                    <div className="relative">
                        <div
                            ref={highlight2Ref}
                            className="absolute -inset-x-3 md:-inset-x-4 inset-y-0 bg-emerald-500/[0.04] border-l-[3px] border-emerald-500/40"
                        />
                        <div
                            ref={line2Ref}
                            className="pl-3 md:pl-6 relative whitespace-nowrap overflow-hidden text-ellipsis"
                        >
                            <span className="text-[#888]">api_key</span>=<span className="text-emerald-500/80">&quot;cashuA...&quot;</span>
                        </div>
                    </div>
                    <div>)</div>
                </div>
            </div>
        </div>
    )
}

const PaymentSkeleton = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [paymentStep, setPaymentStep] = useState(0);
  const isInView = useInView(rootRef, 0.3);

  const userRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const requestDotRef = useRef<HTMLDivElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setPaymentStep((s) => (s + 1) % 4);
    }, 1200);
    return () => clearInterval(interval);
  }, [isInView]);

  useGSAP(
    () => {
      gsap.to(userRef.current, {
        scale: paymentStep >= 1 ? 1.05 : 1,
        borderColor: paymentStep >= 1 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
        duration: 0.5,
        ease: "power2.out",
      });

      gsap.to(tokenRef.current, {
        x: paymentStep >= 1 ? (paymentStep >= 2 ? 20 : 0) : -20,
        opacity: paymentStep >= 1 ? (paymentStep >= 2 ? 0 : 1) : 0,
        duration: 0.5,
        ease: "power1.inOut",
      });
      if (paymentStep === 1) {
        gsap.fromTo(
          tokenRef.current,
          { scale: 1 },
          { scale: 1.1, duration: 0.25, yoyo: true, repeat: 1, ease: "power1.inOut" }
        );
      }

      gsap.to(nodeRef.current, {
        scale: paymentStep >= 2 ? 1.05 : 1,
        borderColor: paymentStep >= 2 ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.05)",
        duration: 0.5,
        ease: "power2.out",
      });

      gsap.to(requestDotRef.current, {
        x: paymentStep >= 2 ? (paymentStep >= 3 ? 20 : 0) : -20,
        opacity: paymentStep >= 2 ? (paymentStep >= 3 ? 0 : 1) : 0,
        duration: 0.4,
        ease: "power1.inOut",
      });

      gsap.to(responseRef.current, {
        borderColor: paymentStep >= 3 ? "rgba(52, 211, 153, 0.3)" : "rgba(255, 255, 255, 0.05)",
        duration: 0.4,
        ease: "power2.out",
      });
      if (paymentStep >= 3) {
        gsap.fromTo(
          responseRef.current,
          { scale: 0.95 },
          { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }
        );
      } else {
        gsap.to(responseRef.current, { scale: 1, duration: 0.2 });
      }

      gsap.to(statusRef.current, {
        opacity: paymentStep >= 1 ? 1 : 0,
        y: paymentStep >= 1 ? 0 : 5,
        duration: 0.4,
      });
    },
    { dependencies: [paymentStep], scope: rootRef }
  );

  return (
    <div ref={rootRef} className="w-full h-full relative overflow-hidden flex items-center justify-center scale-75 md:scale-100">
        {/* Payment flow visualization */}
        <div className="relative flex items-center gap-4 md:gap-6 px-4">
            {/* User */}
            <div
                ref={userRef}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl border bg-[#0a0a0a] flex items-center justify-center z-10"
            >
                <User size={18} className={paymentStep >= 1 ? "text-[#e5e5e5]" : "text-[#555]"} />
            </div>

            {/* Arrow & Token (Cashu/Lightning) */}
            <div className="flex flex-col items-center justify-center relative w-12 md:w-16">
                <div className="h-px w-full bg-white/5 absolute top-1/2 -translate-y-1/2" />
                <div
                    ref={tokenRef}
                    className="absolute z-20"
                    style={{ transform: "translateX(-20px)", opacity: 0 }}
                >
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                        <span className="text-amber-500/80 font-bold text-[8px] md:text-[10px]">₿</span>
                    </div>
                </div>
            </div>

            {/* Routstr Node */}
            <div
                ref={nodeRef}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl border bg-[#0a0a0a] flex items-center justify-center z-10"
            >
                <Zap size={18} className={paymentStep >= 2 ? "text-amber-500/90" : "text-[#555]"} />
            </div>

            {/* AI Request flow */}
            <div className="flex flex-col items-center justify-center relative w-12 md:w-16">
                <div className="h-px w-full bg-white/5 absolute top-1/2 -translate-y-1/2" />
                <div
                    ref={requestDotRef}
                    className="absolute z-20"
                    style={{ transform: "translateX(-20px)", opacity: 0 }}
                >
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400/80" />
                </div>
            </div>

            {/* AI Response indicator */}
            <div
                ref={responseRef}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl border bg-[#0a0a0a] flex items-center justify-center z-10"
            >
                {paymentStep >= 3 ? (
                    <Bot size={18} className="text-emerald-400" />
                ) : (
                    <Bot size={18} className="text-[#555]" />
                )}
            </div>
        </div>

        {/* Status text */}
        <div
            ref={statusRef}
            className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center"
            style={{ opacity: 0, transform: "translateY(5px)" }}
        >
            <span className={cn(
                "text-[9px] md:text-[11px] font-mono",
                paymentStep === 1 && "text-amber-500/70",
                paymentStep === 2 && "text-emerald-500/70",
                paymentStep >= 3 && "text-green-400/70"
            )}>
                {paymentStep === 1 && "Validating payment..."}
                {paymentStep === 2 && "Forwarding request..."}
                {paymentStep >= 3 && "Streaming response"}
            </span>
        </div>
    </div>
  );
};

const NetworkSkeleton = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const isInView = useInView(rootRef, 0.3);

  const userNodeRef = useRef<HTMLDivElement>(null);
  const relayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const providerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const travelCircleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, [isInView]);

  // Layout coordinates (percentages)
  const userNode = { x: 15, y: 50 };
  const relays = [
    { id: 'r1', x: 50, y: 30 },
    { id: 'r2', x: 50, y: 70 },
  ];
  const providers = [
    { id: 'p1', x: 85, y: 20 },
    { id: 'p2', x: 85, y: 50 },
    { id: 'p3', x: 85, y: 80 },
  ];

  useGSAP(
    () => {
      gsap.to(userNodeRef.current, {
        scale: step === 1 || step === 3 ? 1.05 : 1,
        borderColor: step === 1 || step === 3 ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.05)",
        duration: 0.3,
      });
      relayRefs.current.forEach((el) => {
        gsap.to(el, {
          scale: step === 1 || step === 2 ? 1.05 : 1,
          borderColor: step === 1 || step === 2 ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.05)",
          duration: 0.3,
        });
      });
      providerRefs.current.forEach((el, i) => {
        gsap.to(el, {
          scale: step === 0 || (step === 3 && i === 1) ? 1.05 : 1,
          borderColor: step === 0 || (step === 3 && i === 1) ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.05)",
          duration: 0.3,
        });
      });
    },
    { dependencies: [step], scope: rootRef }
  );

  // Traveling dots per step, replicating the framer keyframe fade in/out while moving.
  useGSAP(
    () => {
      const el = travelCircleRef.current;
      if (!el) return;

      let from: { x: number; y: number };
      let to: { x: number; y: number };
      let color: string;

      if (step === 0) {
        // Providers announce to relays (only animate the first pair for simplicity of a single traveling dot)
        from = providers[0];
        to = relays[0];
        color = "#f59e0b";
      } else if (step === 1) {
        from = userNode;
        to = relays[0];
        color = "#e5e5e5";
      } else if (step === 2) {
        from = relays[0];
        to = userNode;
        color = "#e5e5e5";
      } else {
        from = userNode;
        to = providers[1];
        color = "#10b981";
      }

      gsap.set(el, {
        attr: { cx: `${from.x}%`, cy: `${from.y}%` },
        fill: color,
        opacity: 0,
      });

      const tl = gsap.timeline();
      tl.to(el, { attr: { cx: `${to.x}%`, cy: `${to.y}%` }, duration: 1.2, ease: "power2.out" }, 0);
      tl.to(el, { opacity: 0.5, duration: 0.6, ease: "none" }, 0);
      tl.to(el, { opacity: 0, duration: 0.6, ease: "none" }, 0.6);

      return () => {
        tl.kill();
      };
    },
    { dependencies: [step], scope: rootRef }
  );

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden flex items-center justify-center scale-90 md:scale-100">
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.6 }}>
            {/* Lines from Relays to Providers */}
            {relays.map(r => providers.map(p => (
                <line
                    key={`${r.id}-${p.id}`}
                    x1={`${r.x}%`} y1={`${r.y}%`}
                    x2={`${p.x}%`} y2={`${p.y}%`}
                    stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.1"
                />
            )))}
            {/* Lines from User to Relays */}
            {relays.map(r => (
                <line
                    key={`u-${r.id}`}
                    x1={`${userNode.x}%`} y1={`${userNode.y}%`}
                    x2={`${r.x}%`} y2={`${r.y}%`}
                    stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.1"
                />
            ))}
            {/* Direct line User to Provider 2 (for step 3) */}
            <line
                x1={`${userNode.x}%`} y1={`${userNode.y}%`}
                x2={`${providers[1].x}%`} y2={`${providers[1].y}%`}
                stroke={step === 3 ? "#22c55e" : "transparent"}
                strokeWidth="1"
                opacity="0.3"
            />

            {/* Traveling dot, re-targeted per step by the effect above */}
            <circle ref={travelCircleRef} r="2.5" opacity="0" />
        </svg>

        {/* Nodes */}
        {/* User */}
        <div
            ref={userNodeRef}
            className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-[#0a0a0a] border rounded-full text-[#e5e5e5]"
            style={{ left: `${userNode.x}%`, top: `${userNode.y}%` }}
        >
            <User size={14} />
        </div>

        {/* Relays */}
        {relays.map((r, i) => (
            <div
                key={r.id}
                ref={(el) => { relayRefs.current[i] = el; }}
                className="absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-[#0a0a0a] border rounded-full text-[9px] text-[#888] font-mono backdrop-blur-sm"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
            >
                R{i+1}
            </div>
        ))}

        {/* Providers */}
        {providers.map((p, i) => (
            <div
                key={p.id}
                ref={(el) => { providerRefs.current[i] = el; }}
                className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-[#0a0a0a] border rounded-md text-[9px] text-amber-500/70 font-mono"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
                P{i+1}
            </div>
        ))}

        {/* Status text */}
        <div className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center">
            <span className={cn(
                "text-[9px] md:text-[11px] font-mono",
                step === 0 && "text-amber-500/60",
                step === 1 && "text-[#e5e5e5]/80",
                step === 2 && "text-[#e5e5e5]/80",
                step === 3 && "text-emerald-500/60"
            )}>
                {step === 0 && "Providers announce to relays"}
                {step === 1 && "Client searches relays"}
                {step === 2 && "Relays return provider info"}
                {step === 3 && "Client connects directly"}
            </span>
        </div>
    </div>
  );
};

const DockerSkeleton = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [logIndex, setLogIndex] = useState(0);
  const isInView = useInView(rootRef, 0.3);
  const statusDotRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const logRefs = useRef<(HTMLDivElement | null)[]>([]);

  const logs = [
    { type: "info", text: "Starting Routstr Proxy v0.1.0..." },
    { type: "success", text: "Connected to relay: wss://relay.damus.io" },
    { type: "success", text: "Listening on :8080" },
    { type: "request", text: "POST /v1/chat/completions" },
    { type: "payment", text: "Cashu token validated: 150 sats" },
    { type: "success", text: "Response sent (200 OK) • 847 tokens" },
  ];

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setLogIndex((i) => (i + 1) % logs.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isInView, logs.length]);

  const visibleLogs = logs.slice(0, Math.min(logIndex + 1, logs.length));

  useGSAP(
    () => {
      if (!statusDotRef.current) return;
      if (isInView) {
        gsap.fromTo(
          statusDotRef.current,
          { opacity: 0.3 },
          { opacity: 0.8, duration: 0.75, repeat: -1, yoyo: true, ease: "sine.inOut" }
        );
      } else {
        gsap.to(statusDotRef.current, { opacity: 0.3, duration: 0.3 });
      }
    },
    { dependencies: [isInView], scope: rootRef }
  );

  useGSAP(
    () => {
      if (!cursorRef.current) return;
      if (isInView) {
        gsap.fromTo(
          cursorRef.current,
          { opacity: 1 },
          { opacity: 0, duration: 0.5, repeat: -1, yoyo: true, ease: "none" }
        );
      } else {
        gsap.to(cursorRef.current, { opacity: 1, duration: 0.2 });
      }
    },
    { dependencies: [isInView], scope: rootRef }
  );

  useGSAP(
    () => {
      const el = logRefs.current[visibleLogs.length - 1];
      if (!el) return;
      gsap.fromTo(
        el,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
    },
    { dependencies: [visibleLogs.length], scope: rootRef }
  );

  return (
    <div ref={rootRef} className="w-full h-full p-0 sm:p-2 md:p-6 font-mono text-[9px] sm:text-[10px] md:text-[11px] overflow-hidden flex flex-col justify-center items-center">
        <div className="w-full h-full bg-[#171717] border-0 sm:border border-[#333] sm:rounded-xl overflow-hidden shadow-lg flex flex-col">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-[#333] bg-[#222] shrink-0">
                <div className="flex gap-1.5">
                    <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#444]"></div>
                    <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#444]"></div>
                    <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#444]"></div>
                </div>
                <span className="text-[#888] text-[9px] md:text-[10px] ml-1 md:ml-2 font-mono">routstr-proxy</span>
                <div className="ml-auto flex items-center gap-1.5">
                    <div
                        ref={statusDotRef}
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white/40"
                        style={{ opacity: 0.3 }}
                    />
                </div>
            </div>

            <div className="py-3 md:py-5 px-3 md:px-6 flex-1 flex flex-col overflow-hidden leading-[1.6] md:leading-[2]">
                {/* Command line */}
                <div className="text-[#e5e5e5] mb-2 md:mb-3 whitespace-nowrap overflow-hidden text-ellipsis shrink-0 text-[8px] sm:text-[10px] md:text-[11px]">
                    <span className="text-[#888] mr-1 md:mr-2">root@routstr:~#</span>docker run -p 8080:8080 routstr/proxy
                </div>

                {/* Logs */}
                <div className="flex-1 flex flex-col justify-start min-h-0 overflow-hidden text-[8px] sm:text-[10px] md:text-[11px]">
                    <div className="space-y-1 md:space-y-1.5 w-full flex flex-col">
                        {visibleLogs.map((log, i) => (
                            <div
                                key={i}
                                ref={(el) => { logRefs.current[i] = el; }}
                                className="flex items-start gap-1.5 md:gap-2 w-full"
                            >
                                <span className="text-[#666] shrink-0 hidden sm:inline">12:00:{String(i).padStart(2, '0')}</span>
                                <span className={cn(
                                    "shrink-0 font-bold w-[32px] sm:w-auto",
                                    log.type === "info" && "text-blue-400/70",
                                    log.type === "success" && "text-green-400/70",
                                    log.type === "request" && "text-[#e5e5e5]",
                                    log.type === "payment" && "text-orange-400/70",
                                )}>
                                    {log.type === "info" && "[INFO]"}
                                    {log.type === "success" && "[OK]  "}
                                    {log.type === "request" && "[REQ] "}
                                    {log.type === "payment" && "[PAY] "}
                                </span>
                                <span className="text-[#a1a1a1] truncate whitespace-nowrap">{log.text}</span>
                            </div>
                        ))}

                        <div
                            ref={cursorRef}
                            className="text-[#666] mt-1 shrink-0"
                        >
                            ▋
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
