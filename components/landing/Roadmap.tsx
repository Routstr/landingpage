"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
}

const roadmapItems: RoadmapItem[] = [
  {
    id: "rip-01",
    title: "RIP-01: API Proxy & Payments",
    description:
      "OpenAI-API Proxy with Cashu micropayments for LLM inference",
  },
  {
    id: "rip-02",
    title: "RIP-02: Node Listing",
    description:
      "Nostr event announcements for inference nodes and capabilities",
  },
  {
    id: "rip-03",
    title: "RIP-03: Frontend Discovery",
    description: "Web interface for browsing and filtering available nodes",
  },
  {
    id: "rip-04-05",
    title: "RIP-04 & RIP-05: Quality & Privacy",
    description:
      "Anonymous evaluations and smart clients with Tor/proxy routing",
  },
];

export function LandingRoadmap() {
  return (
    <div className="w-full max-w-7xl mx-auto py-20 md:py-32 px-4 md:px-8 bg-black">
      {/* Header */}
      <div className="text-center mb-16">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
          Roadmap
        </h2>
        <p className="text-base md:text-lg lg:text-xl text-neutral-400 max-w-2xl mx-auto">
          Our progressive journey to building a decentralized AI ecosystem
        </p>
      </div>

      {/* Roadmap Timeline */}
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-neutral-800" />

          {/* Timeline items */}
          {roadmapItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative mb-8 last:mb-0"
            >
              {/* Dot indicator */}
              <div className="absolute left-4 md:left-8 top-0 -translate-x-1/2">
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center bg-black border-neutral-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* Content card */}
              <div className="ml-12 md:ml-20">
                <div className="bg-neutral-900 border border-white/10 rounded-xl p-5 md:p-6 hover:border-white/20 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm md:text-base text-neutral-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* View Full Roadmap Link */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-16 text-center"
      >
        <Link
          href="/roadmap"
          className="group inline-flex items-center gap-3 bg-neutral-900 border border-white/10 hover:border-white/20 rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors"
        >
          View full roadmap
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </Link>
      </motion.div>
    </div>
  );
}

export default LandingRoadmap;

