"use client";
import React from "react";
import { motion } from "framer-motion";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { 
  Smartphone,
  Server
} from "lucide-react";

export function LandingArchitecture() {
  const clientFeatures = [
    "Drop-in OpenAI SDK compatibility",
    "Pay-per-request with Cashu eCash",
    "No accounts or sign-ups required",
    "Complete privacy — no tracking",
  ];

  const nodeFeatures = [
    "Monetize your AI infrastructure",
    "Accept Cashu and BOLT12 payments",
    "Built-in rate limiting & security",
    "Auto-publish to Nostr relays",
  ];

  return (
    <div className="w-full bg-black border-t border-white/[0.03]">
      <div className="max-w-7xl mx-auto py-20 md:py-32 px-4 md:px-8">
        
        {/* Header */}
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 tracking-tight">
            Simple Architecture, Powerful Results
          </h2>
          <p className="text-base md:text-lg text-neutral-400 leading-relaxed">
            A decentralized protocol connecting apps directly to independent AI providers. 
            No central gateway — just peer-to-peer intelligence powered by Nostr and Cashu.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Left Side: Diagram */}
          <div className="lg:col-span-7 w-full">
            <ArchitectureDiagram />
          </div>

          {/* Right Side: Features */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:pt-2">
            
            {/* For Users */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-neutral-900/40 border border-white/[0.06] rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">For App Developers</h3>
              </div>
              <ul className="space-y-3">
                {clientFeatures.map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-400">
                    <div className="w-1 h-1 rounded-full bg-purple-500/60" />
                    {text}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* For Providers */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-neutral-900/40 border border-white/[0.06] rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Server className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">For Node Operators</h3>
              </div>
              <ul className="space-y-3">
                {nodeFeatures.map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-400">
                    <div className="w-1 h-1 rounded-full bg-green-500/60" />
                    {text}
                  </li>
                ))}
              </ul>
            </motion.div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default LandingArchitecture;
