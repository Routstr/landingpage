"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useInView } from "framer-motion";
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
        "Find and connect to hardware providers through Nostr relays. Say goodbye to central registries and single points of failure.",
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
      <div className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
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
    return (
        <div className="p-0 sm:p-2 md:p-6 w-full h-full flex flex-col justify-center items-center font-mono">
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
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="absolute -inset-x-3 md:-inset-x-4 inset-y-0 bg-emerald-500/[0.04] border-l-[3px] border-emerald-500/40"
                        />
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="pl-3 md:pl-6 relative whitespace-nowrap overflow-hidden text-ellipsis"
                        >
                            <span className="text-[#888]">base_url</span>=<span className="text-emerald-500/80">&quot;https://api.routstr.com/v1&quot;</span>,
                        </motion.div>
                    </div>
                    <div className="relative">
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="absolute -inset-x-3 md:-inset-x-4 inset-y-0 bg-emerald-500/[0.04] border-l-[3px] border-emerald-500/40"
                        />
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="pl-3 md:pl-6 relative whitespace-nowrap overflow-hidden text-ellipsis"
                        >
                            <span className="text-[#888]">api_key</span>=<span className="text-emerald-500/80">&quot;cashuA...&quot;</span>
                        </motion.div>
                    </div>
                    <div>)</div>
                </div>
            </div>
        </div>
    )
}

const PaymentSkeleton = () => {
  const [paymentStep, setPaymentStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  
  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setPaymentStep((s) => (s + 1) % 4);
    }, 1200);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <div ref={ref} className="w-full h-full relative overflow-hidden flex items-center justify-center scale-75 md:scale-100">
        {/* Payment flow visualization */}
        <div className="relative flex items-center gap-4 md:gap-6 px-4">
            {/* User */}
            <motion.div 
                animate={{ 
                    scale: paymentStep >= 1 ? 1.05 : 1,
                    borderColor: paymentStep >= 1 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.05)"
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl border bg-[#0a0a0a] flex items-center justify-center z-10"
            >
                <User size={18} className={paymentStep >= 1 ? "text-[#e5e5e5]" : "text-[#555]"} />
            </motion.div>
            
            {/* Arrow & Token (Cashu/Lightning) */}
            <div className="flex flex-col items-center justify-center relative w-12 md:w-16">
                <div className="h-px w-full bg-white/5 absolute top-1/2 -translate-y-1/2" />
                <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ 
                        x: paymentStep >= 1 ? (paymentStep >= 2 ? 20 : 0) : -20,
                        opacity: paymentStep >= 1 ? (paymentStep >= 2 ? 0 : 1) : 0,
                        scale: paymentStep === 1 ? [1, 1.1, 1] : 1
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute z-20"
                >
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                        <span className="text-amber-500/80 font-bold text-[8px] md:text-[10px]">₿</span>
                    </div>
                </motion.div>
            </div>
            
            {/* Routstr Node */}
            <motion.div 
                animate={{ 
                    scale: paymentStep >= 2 ? 1.05 : 1,
                    borderColor: paymentStep >= 2 ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.05)",
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl border bg-[#0a0a0a] flex items-center justify-center z-10"
            >
                <Zap size={18} className={paymentStep >= 2 ? "text-amber-500/90" : "text-[#555]"} />
            </motion.div>

            {/* AI Request flow */}
            <div className="flex flex-col items-center justify-center relative w-12 md:w-16">
                <div className="h-px w-full bg-white/5 absolute top-1/2 -translate-y-1/2" />
                <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ 
                        x: paymentStep >= 2 ? (paymentStep >= 3 ? 20 : 0) : -20,
                        opacity: paymentStep >= 2 ? (paymentStep >= 3 ? 0 : 1) : 0
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="absolute z-20"
                >
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400/80" />
                </motion.div>
            </div>

            {/* AI Response indicator */}
            <motion.div
                animate={{
                    scale: paymentStep >= 3 ? [0.95, 1.1, 1] : 1,
                    borderColor: paymentStep >= 3 ? "rgba(52, 211, 153, 0.3)" : "rgba(255, 255, 255, 0.05)",
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl border bg-[#0a0a0a] flex items-center justify-center z-10"
            >
                {paymentStep >= 3 ? (
                    <Bot size={18} className="text-emerald-400" />
                ) : (
                    <Bot size={18} className="text-[#555]" />
                )}
            </motion.div>
        </div>
        
        {/* Status text */}
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ 
                opacity: paymentStep >= 1 ? 1 : 0,
                y: paymentStep >= 1 ? 0 : 5
            }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center"
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
        </motion.div>
    </div>
  );
};

const NetworkSkeleton = () => {
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });

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

  return (
    <div ref={ref} className="relative w-full h-full overflow-hidden flex items-center justify-center scale-90 md:scale-100">
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

            {/* Step 0: Providers announce to Relays */}
            {step === 0 && providers.map((p, i) => (
                <motion.circle key={`pub-${i}`} r="2.5" fill="#f59e0b"
                    initial={{ cx: `${p.x}%`, cy: `${p.y}%`, opacity: 0 }}
                    animate={{ cx: `${relays[i % 2].x}%`, cy: `${relays[i % 2].y}%`, opacity: [0, 0.5, 0] }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />
            ))}

            {/* Step 1: User searches Relays */}
            {step === 1 && relays.map((r, i) => (
                <motion.circle key={`search-${i}`} r="2.5" fill="#e5e5e5"
                    initial={{ cx: `${userNode.x}%`, cy: `${userNode.y}%`, opacity: 0 }}
                    animate={{ cx: `${r.x}%`, cy: `${r.y}%`, opacity: [0, 0.5, 0] }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />
            ))}

            {/* Step 2: Relays reply to User */}
            {step === 2 && relays.map((r, i) => (
                <motion.circle key={`reply-${i}`} r="2.5" fill="#e5e5e5"
                    initial={{ cx: `${r.x}%`, cy: `${r.y}%`, opacity: 0 }}
                    animate={{ cx: `${userNode.x}%`, cy: `${userNode.y}%`, opacity: [0, 0.5, 0] }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />
            ))}

            {/* Step 3: User connects to Provider */}
            {step === 3 && (
                <motion.circle r="2.5" fill="#10b981"
                    initial={{ cx: `${userNode.x}%`, cy: `${userNode.y}%`, opacity: 0 }}
                    animate={{ cx: `${providers[1].x}%`, cy: `${providers[1].y}%`, opacity: [0, 0.5, 0] }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />
            )}
        </svg>

        {/* Nodes */}
        {/* User */}
        <motion.div 
            animate={{ 
                scale: step === 1 || step === 3 ? 1.05 : 1,
                borderColor: step === 1 || step === 3 ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.05)"
            }}
            className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-[#0a0a0a] border rounded-full text-[#e5e5e5]"
            style={{ left: `${userNode.x}%`, top: `${userNode.y}%` }}
        >
            <User size={14} />
        </motion.div>

        {/* Relays */}
        {relays.map((r, i) => (
            <motion.div 
                key={r.id}
                animate={{ 
                    scale: step === 1 || step === 2 ? 1.05 : 1,
                    borderColor: step === 1 || step === 2 ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.05)"
                }}
                className="absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-[#0a0a0a] border rounded-full text-[9px] text-[#888] font-mono backdrop-blur-sm"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
            >
                R{i+1}
            </motion.div>
        ))}

        {/* Providers */}
        {providers.map((p, i) => (
            <motion.div 
                key={p.id}
                animate={{ 
                    scale: (step === 0) || (step === 3 && i === 1) ? 1.05 : 1,
                    borderColor: (step === 0) || (step === 3 && i === 1) ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.05)"
                }}
                className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-[#0a0a0a] border rounded-md text-[9px] text-amber-500/70 font-mono"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
                P{i+1}
            </motion.div>
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
  const [logIndex, setLogIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  
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

  return (
    <div ref={ref} className="w-full h-full p-0 sm:p-2 md:p-6 font-mono text-[9px] sm:text-[10px] md:text-[11px] overflow-hidden flex flex-col justify-center items-center">
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
                    <motion.div 
                        animate={isInView ? { opacity: [0.3, 0.8, 0.3] } : { opacity: 0.3 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white/40"
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
                        <AnimatePresence mode="popLayout">
                            {visibleLogs.map((log, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
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
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        <motion.div
                            animate={isInView ? { opacity: [1, 0, 1] } : { opacity: 1 }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-[#666] mt-1 shrink-0"
                        >
                            ▋
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
