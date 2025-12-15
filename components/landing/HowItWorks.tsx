"use client";
import React, { useState, useId, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

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
    fontSize: "0.75rem",
  },
};

export function LandingHowItWorks() {
  const [activeTab, setActiveTab] = useState<"users" | "providers">("users");

  return (
    <div className="w-full max-w-7xl mx-auto py-20 md:py-32 px-4 md:px-8 bg-black relative overflow-hidden">
      {/* Background grid effect */}
      <BackgroundGrid />
      
      <div className="relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-neutral-400 max-w-2xl mx-auto">
            Simple steps to get started with decentralized AI access
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex justify-center mb-16">
          <div className="bg-neutral-900 rounded-full p-1 flex gap-1 border border-white/10">
            <button
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                activeTab === "users"
                  ? "bg-white text-black shadow-lg"
                  : "text-white hover:bg-white/10"
              )}
              onClick={() => setActiveTab("users")}
            >
              For Users
            </button>
            <button
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                activeTab === "providers"
                  ? "bg-white text-black shadow-lg"
                  : "text-white hover:bg-white/10"
              )}
              onClick={() => setActiveTab("providers")}
            >
              For Providers
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "users" ? (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <UserSteps />
            </motion.div>
          ) : (
            <motion.div
              key="providers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ProviderSteps />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const UserSteps = () => {
  const steps = [
    {
      number: 1,
      title: "Get a Cashu Token",
      description: "Bring your own Cashu eCash token. No account or sign-up required.",
      visual: <CashuTokenVisual />,
    },
    {
      number: 2,
      title: "Use any OpenAI-compatible client",
      description: "Point your existing OpenAI SDK or application at any Routstr provider. Use your Cashu token as the API key.",
      visual: <ApiKeyVisual />,
    },
    {
      number: 3,
      title: "Pay per request",
      description: "Cost is deducted based on actual token usage. Model-based pricing with live BTC/USD conversion.",
      visual: <PaymentVisual />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {steps.map((step, index) => (
        <StepCard key={step.number} step={step} index={index} />
      ))}
    </div>
  );
};

const ProviderSteps = () => {
  const steps = [
    {
      number: 1,
      title: "Deploy the payment proxy",
      description: "Run Routstr Core in front of any OpenAI-compatible API. One Docker command to monetize your AI infrastructure.",
      visual: <DockerVisual />,
    },
    {
      number: 2,
      title: "Accept Bitcoin payments",
      description: "Connect to a Cashu mint for eCash payments. No Stripe, no KYC, no payment processing fees.",
      visual: <BitcoinPaymentVisual />,
    },
    {
      number: 3,
      title: "Get discovered via Nostr",
      description: "Publish your node to Nostr relays. Users can discover your services through decentralized provider listings.",
      visual: <NostrDiscoveryVisual />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {steps.map((step, index) => (
        <StepCard key={step.number} step={step} index={index} />
      ))}
    </div>
  );
};

const StepCard = ({
  step,
  index,
}: {
  step: { number: number; title: string; description: string; visual: React.ReactNode };
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="group relative bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Step number indicator */}
      <div className="absolute top-4 right-4 z-20">
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{step.number}</span>
        </div>
      </div>
      
      {/* Visual section */}
      <div className="h-48 relative overflow-hidden bg-neutral-950">
        {step.visual}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Content section */}
      <div className="p-6 flex-1">
        <h3 className="text-lg md:text-xl font-bold text-white mb-2">{step.title}</h3>
        <p className="text-sm md:text-base text-neutral-400 leading-relaxed">{step.description}</p>
      </div>

      {/* Hover border glow */}
      <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-white/20 transition-colors pointer-events-none" />
    </motion.div>
  );
};

// Visual Components

const CashuTokenVisual = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="bg-neutral-800/50 rounded-lg border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-mono text-neutral-400">cashuA1...</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={isInView ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.75 }}
                transition={{ duration: 1.5, repeat: isInView ? Infinity : 0 }}
                className="relative w-5 h-5"
              >
                <Image 
                  src="/assets/cashu-token.png" 
                  alt="Cashu Token" 
                  fill 
                  className="object-contain" 
                />
              </motion.div>
              <span className="text-sm text-white">Cashu Token</span>
            </div>
            <span className="text-xs font-mono text-neutral-400">10,000 sats</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApiKeyVisual = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="bg-neutral-800/50 rounded-lg border border-white/10 p-4">
          <div className="text-xs text-neutral-500 mb-2 font-mono">API_KEY</div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: isInView ? Infinity : 0, repeatDelay: 1 }}
            className="h-6 bg-gradient-to-r from-neutral-700/50 to-transparent rounded flex items-center px-2"
          >
            <span className="text-xs font-mono text-green-400">cashuA1DkpMbgQ9VkL6U...</span>
          </motion.div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["OpenAI SDK", "LangChain", "LlamaIndex", "AI SDK"].map((label) => (
              <span key={label} className="px-2 py-0.5 text-[10px] bg-neutral-700/50 rounded text-neutral-400">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentVisual = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-[280px] overflow-hidden">
        <div className="bg-neutral-950 rounded-lg border border-white/10 p-3">
          <SyntaxHighlighter
            language="bash"
            style={customTheme}
            customStyle={{
              background: "transparent",
              lineHeight: "1.4",
              margin: 0,
              fontSize: "9px",
            }}
            showLineNumbers={false}
            wrapLines={true}
            wrapLongLines={true}
          >
            {`curl -X POST https://api.routstr.com/v1/chat
  -H "Authorization: Bearer cashu..."
  -d '{"model": "gpt-5.1"}'`}
          </SyntaxHighlighter>
        </div>
        <motion.div
          animate={isInView ? { opacity: [0, 1, 1, 0] } : { opacity: 0 }}
          transition={{ duration: 2, repeat: isInView ? Infinity : 0, times: [0, 0.2, 0.8, 1] }}
          className="mt-2 flex items-center justify-center gap-2 text-xs text-green-400"
        >
          <span>✓</span>
          <span>-150 sats deducted</span>
        </motion.div>
      </div>
    </div>
  );
};

const DockerVisual = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  
  return (
    <div ref={ref} className="w-full h-full p-4 font-mono text-[10px] leading-tight overflow-hidden">
      <div className="text-neutral-400 mb-1">$ docker run -p 8080:8080 routstr/proxy</div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-green-400 space-y-0.5"
      >
        <div>[+] Pulling image...</div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          [+] Starting Routstr Proxy...
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          [+] Connected to Nostr relay
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          [+] Listening on :8080
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: [0, 1] } : { opacity: 0 }}
          transition={{ delay: 2, duration: 0.5, repeat: isInView ? Infinity : 0, repeatDelay: 2 }}
          className="text-yellow-400"
        >
          [INFO] Request received /v1/chat
        </motion.div>
      </motion.div>
    </div>
  );
};

const BitcoinPaymentVisual = () => {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-2">
        {[
          { label: "Multiple Cashu mints", active: true },
          { label: "Lightning integration", active: true },
          { label: "Balance tracking", active: true },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <motion.svg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 0.2 + 0.3, duration: 0.3 }}
                className="w-2.5 h-2.5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
            </div>
            <span className="text-neutral-400">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const NostrDiscoveryVisual = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center p-4">
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        <motion.div
          animate={isInView ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 2, repeat: isInView ? Infinity : 0 }}
          className="bg-neutral-800/50 rounded-lg p-3 border border-white/10"
        >
          <div className="text-[10px] text-neutral-500 mb-1">Requests</div>
          <motion.div
            animate={isInView ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
            transition={{ duration: 1, repeat: isInView ? Infinity : 0 }}
            className="text-lg font-bold text-white"
          >
            1,240
          </motion.div>
        </motion.div>
        <motion.div
          animate={isInView ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 2, repeat: isInView ? Infinity : 0, delay: 0.5 }}
          className="bg-neutral-800/50 rounded-lg p-3 border border-white/10"
        >
          <div className="text-[10px] text-neutral-500 mb-1">Revenue</div>
          <motion.div
            animate={isInView ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
            transition={{ duration: 1, repeat: isInView ? Infinity : 0, delay: 0.3 }}
            className="text-lg font-bold text-yellow-400"
          >
            42.3k ₿
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

// Background Grid Component
const BackgroundGrid = () => {
  const id = useId();
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={`grid-${id}`}
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${id})`} />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
    </div>
  );
};

export default LandingHowItWorks;
