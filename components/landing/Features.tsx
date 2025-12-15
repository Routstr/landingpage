"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Code, Zap, Share2, Server, Bot, User, ArrowRight, Check } from "lucide-react";

export function LandingFeatures() {
  return (
    <div className="w-full max-w-7xl mx-auto py-20 md:py-32 px-4 md:px-8 bg-black">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight">
            The Infrastructure for the{" "}
            <span className="text-white">
              AI Economy
            </span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-neutral-400 max-w-2xl mx-auto">
            Everything you need to build, deploy, and scale AI applications with Bitcoin
          </p>
        </motion.div>
      </div>
      
      <div className="grid grid-flow-col grid-cols-1 grid-rows-6 gap-4 md:grid-cols-2 md:grid-rows-3 xl:grid-cols-3 xl:grid-rows-2">
        <Card className="row-span-2">
          <CardContent>
            <div className="h-10 w-10 bg-white/5 rounded-lg flex items-center justify-center mb-4 border border-white/10">
                <Code className="text-neutral-200" size={20} />
            </div>
            <CardTitle>OpenAI Compatible API</CardTitle>
            <CardDescription>
              Works with any OpenAI SDK, LangChain, or application. Drop-in replacement for chat completions.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody>
             <ApiRequestSkeleton />
          </CardSkeletonBody>
        </Card>
        
        <Card className="overflow-hidden">
          <CardContent>
             <div className="h-10 w-10 bg-white/5 rounded-lg flex items-center justify-center mb-4 border border-white/10">
                <Zap className="text-neutral-200" size={20} />
            </div>
            <CardTitle>Pay-per-request</CardTitle>
            <CardDescription>
              No subscriptions. Pay only for the tokens you use with Bitcoin micropayments.
            </CardDescription>
          </CardContent>
           <CardSkeletonBody>
            <PaymentSkeleton />
          </CardSkeletonBody>
        </Card>
        
        <Card>
          <CardContent>
             <div className="h-10 w-10 bg-white/5 rounded-lg flex items-center justify-center mb-4 border border-white/10">
                <Share2 className="text-neutral-200" size={20} />
            </div>
            <CardTitle>Decentralized Discovery</CardTitle>
            <CardDescription>
              Find providers through Nostr relays. No central registry.
            </CardDescription>
          </CardContent>
           <CardSkeletonBody className="overflow-hidden">
            <NetworkSkeleton />
          </CardSkeletonBody>
        </Card>
        
        <Card className="row-span-2">
          <CardContent>
             <div className="h-10 w-10 bg-white/5 rounded-lg flex items-center justify-center mb-4 border border-white/10">
                <Server className="text-neutral-200" size={20} />
            </div>
            <CardTitle>Simple Deployment</CardTitle>
            <CardDescription>
              Run the Routstr proxy in a single Docker container to monetize your hardware.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody className="h-full max-h-full overflow-hidden">
            <DockerSkeleton />
          </CardSkeletonBody>
        </Card>
      </div>
    </div>
  );
}

// Skeletons

const ApiRequestSkeleton = () => {
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

    return (
        <div ref={ref} className="p-4 w-full h-full flex flex-col gap-2 bg-gradient-to-b from-neutral-900/50 to-neutral-950 font-mono text-[10px]">
            {/* Terminal header */}
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-neutral-700/50"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-neutral-700/50"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-neutral-700/50"></div>
                </div>
                <span className="text-neutral-500 text-[9px]">chat.py</span>
            </div>
            
            {/* Code block */}
            <div className="space-y-1 text-[9px] leading-relaxed text-neutral-400">
                <div><span className="text-purple-400">from</span> openai <span className="text-purple-400">import</span> OpenAI</div>
                <div className="h-2"></div>
                <div>client = OpenAI(</div>
                <div className="pl-3">base_url=<span className="text-neutral-300">&quot;https://api.routstr.com/v1&quot;</span></div>
                <div>)</div>
            </div>
            
            {/* Chat messages */}
            <div className="flex-1 flex flex-col gap-2 mt-2">
                <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: step >= 1 ? 1 : 0.3, x: 0 }}
                    className="flex items-start gap-2"
                >
                    <div className="h-5 w-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                        <User size={10} className="text-neutral-400" />
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg px-2 py-1.5 text-neutral-300">
                        Explain quantum computing
                    </div>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: step >= 2 ? 1 : 0.3, x: 0 }}
                    className="flex items-start gap-2 self-end"
                >
                    <div className="bg-neutral-800/80 border border-neutral-700/50 rounded-lg px-2 py-1.5 text-neutral-300 max-w-[85%]">
                        {step >= 3 ? (
                            <span>Quantum computing uses qubits...</span>
                        ) : (
                            <motion.span 
                                animate={isInView ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.4 }} 
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-purple-400"
                            >
                                ▋
                            </motion.span>
                        )}
                    </div>
                    <div className="h-5 w-5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Bot size={10} className="text-purple-400" />
                    </div>
                </motion.div>
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
    <div ref={ref} className="w-full h-full relative overflow-hidden flex items-center justify-center bg-neutral-900/20">
        {/* Subtle background glow - only animate when in view */}
        <div className="absolute inset-0">
            <motion.div 
                animate={isInView ? { 
                    opacity: [0.1, 0.3, 0.1],
                    scale: [1, 1.1, 1]
                } : { opacity: 0.1, scale: 1 }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"
            />
        </div>
        
        {/* Payment flow visualization */}
        <div className="relative flex items-center gap-3 px-4">
            {/* Cashu Token */}
            <motion.div 
                animate={{ 
                    x: paymentStep >= 1 ? 0 : -10,
                    opacity: paymentStep >= 1 ? 1 : 0.4
                }}
                className="relative"
            >
                <div className="w-10 h-10 rounded-full bg-neutral-800 border border-orange-500/30 flex items-center justify-center">
                    <span className="text-orange-400 font-bold text-xs">₿</span>
                </div>
            </motion.div>
            
            {/* Arrow with lightning */}
            <motion.div 
                animate={{ 
                    opacity: paymentStep >= 2 ? 1 : 0.3,
                }}
                className="flex items-center gap-1"
            >
                <motion.div
                    animate={{ x: paymentStep === 2 ? [0, 5, 0] : 0 }}
                    transition={{ duration: 0.3, repeat: paymentStep === 2 ? 3 : 0 }}
                >
                    <Zap size={14} className="text-orange-400/80" />
                </motion.div>
                <ArrowRight size={14} className="text-neutral-600" />
            </motion.div>
            
            {/* AI Response indicator */}
            <motion.div
                animate={{
                    scale: paymentStep >= 3 ? [1, 1.05, 1] : 1,
                    opacity: paymentStep >= 3 ? 1 : 0.4
                }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center"
            >
                {paymentStep >= 3 ? (
                    <Check size={16} className="text-green-400" />
                ) : (
                    <Bot size={16} className="text-neutral-500" />
                )}
            </motion.div>
        </div>
        
        {/* Sats counter */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: paymentStep >= 1 ? 1 : 0 }}
            className="absolute bottom-4 left-0 right-0 text-center"
        >
            <span className="text-[10px] font-mono text-orange-400/60">
                {paymentStep >= 3 ? "150 sats sent" : paymentStep >= 2 ? "sending..." : "150 sats"}
            </span>
        </motion.div>
    </div>
  );
};

const NetworkSkeleton = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });

  // Simulation of Nostr discovery: Providers publish to relays, User queries relays
  // Reduced from 4 providers to 2 for better performance
  const relays = [
    { id: 'r1', x: 50, y: 40 },
    { id: 'r2', x: 30, y: 65 },
  ];

  const providers = [
    { id: 'p1', x: 25, y: 25, targetRelay: 'r1' },
    { id: 'p2', x: 75, y: 25, targetRelay: 'r1' },
  ];

  const user = { x: 50, y: 80 };

  return (
    <div ref={ref} className="relative w-full h-full overflow-hidden bg-neutral-900/20">
        <svg className="absolute inset-0 w-full h-full">
            {/* Provider -> Relay connections (Publication) - static lines */}
            {providers.map((p, i) => {
                const relay = relays.find(r => r.id === p.targetRelay)!;
                return (
                    <line
                        key={`p-${i}`}
                        x1={`${p.x}%`}
                        y1={`${p.y}%`}
                        x2={`${relay.x}%`}
                        y2={`${relay.y}%`}
                        stroke="#404040"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        opacity="0.5"
                    />
                );
            })}

            {/* User -> Relay connections (Subscription) - static lines */}
            {relays.map((r, i) => (
                <line
                    key={`u-${i}`}
                    x1={`${user.x}%`}
                    y1={`${user.y}%`}
                    x2={`${r.x}%`}
                    y2={`${r.y}%`}
                    stroke="#525252"
                    strokeWidth="1"
                    opacity="0.6"
                />
            ))}

            {/* Events flowing - only animate when in view */}
            {isInView && providers.map((p, i) => {
                const relay = relays.find(r => r.id === p.targetRelay)!;
                return (
                    <motion.circle
                        key={`evt-p-${i}`}
                        r="2"
                        fill="#a3a3a3"
                        animate={{ 
                            cx: [`${p.x}%`, `${relay.x}%`],
                            cy: [`${p.y}%`, `${relay.y}%`],
                            opacity: [0, 1, 0]
                        }}
                        transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            delay: i * 0.8,
                            ease: "linear" 
                        }}
                    />
                );
            })}

            {/* Events flowing from Relays to User - only animate when in view */}
            {isInView && relays.map((r, i) => (
                <motion.circle
                    key={`evt-r-${i}`}
                    r="2"
                    fill="#fff"
                    animate={{ 
                        cx: [`${r.x}%`, `${user.x}%`],
                        cy: [`${r.y}%`, `${user.y}%`],
                        opacity: [0, 1, 0]
                    }}
                    transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        delay: 2 + (i * 0.5),
                        ease: "linear" 
                    }}
                />
            ))}
        </svg>

        {/* Providers */}
        {providers.map((p, i) => (
            <div 
                key={p.id}
                className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-neutral-800 border border-neutral-700 rounded-md text-[8px] text-neutral-400 font-mono"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
                P{i+1}
            </div>
        ))}

        {/* Relays */}
        {relays.map((r, i) => (
            <div 
                key={r.id}
                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-neutral-800 border border-purple-500/30 rounded-full text-[8px] text-purple-200/70 font-mono shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
            >
                R{i+1}
            </div>
        ))}

        {/* User */}
        <div 
            className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-white text-black rounded-full text-[10px] font-bold shadow-lg"
            style={{ left: `${user.x}%`, top: `${user.y}%` }}
        >
            <User size={14} />
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
    <div ref={ref} className="w-full h-full bg-neutral-950 p-4 font-mono text-[9px] overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-neutral-800">
            <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-neutral-800"></div>
                <div className="h-2 w-2 rounded-full bg-neutral-800"></div>
                <div className="h-2 w-2 rounded-full bg-neutral-800"></div>
            </div>
            <span className="text-neutral-500 text-[8px]">routstr-proxy</span>
            <div className="ml-auto flex items-center gap-1">
                <motion.div 
                    animate={isInView ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-green-500/50"
                />
                <span className="text-neutral-500 text-[8px]">running</span>
            </div>
        </div>
        
        {/* Command line */}
        <div className="text-neutral-400 mb-3">
            <span className="text-neutral-500">$</span> docker run -p 8080:8080 routstr/proxy
        </div>
        
        {/* Logs */}
        <div className="space-y-1 overflow-hidden">
            <AnimatePresence mode="popLayout">
                {visibleLogs.map((log, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-2"
                    >
                        <span className="text-neutral-700 shrink-0">12:00:{String(i).padStart(2, '0')}</span>
                        <span className={cn(
                            "shrink-0",
                            log.type === "info" && "text-blue-400/70",
                            log.type === "success" && "text-green-400/70",
                            log.type === "request" && "text-neutral-400",
                            log.type === "payment" && "text-orange-400/70",
                        )}>
                            {log.type === "info" && "[INFO]"}
                            {log.type === "success" && "[OK]"}
                            {log.type === "request" && "[REQ]"}
                            {log.type === "payment" && "[PAY]"}
                        </span>
                        <span className="text-neutral-400 truncate">{log.text}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
            
            {/* Cursor - only animate when in view */}
            <motion.div
                animate={isInView ? { opacity: [1, 0, 1] } : { opacity: 1 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-neutral-500"
            >
                ▋
            </motion.div>
        </div>
    </div>
  );
};

// Card Components

const CardSkeletonBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn("flex-1 min-h-[150px]", className)}>{children}</div>;
};

const CardContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn("p-6 z-10 relative", className)}>{children}</div>;
};

const CardTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3
      className={cn(
        "font-sans text-lg md:text-xl font-medium tracking-tight text-white",
        className
      )}
    >
      {children}
    </h3>
  );
};
const CardDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p
      className={cn(
        "font-sans max-w-xs text-sm md:text-base font-normal tracking-tight mt-2 text-neutral-400",
        className
      )}
    >
      {children}
    </p>
  );
};

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={cn(
        "group isolate flex flex-col rounded-2xl bg-neutral-900 border border-white/10 overflow-hidden relative",
        className
      )}
    >
      {children}
    </motion.div>
  );
};


