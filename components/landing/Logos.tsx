"use client";
import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useModels } from "@/app/contexts/ModelsContext";

interface ModelLogo {
  name: string;
  id: string;
}

export function LandingLogos() {
  const { models, loading } = useModels();
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Get latest models and format for display
  const modelSets = useMemo(() => {
    if (models.length === 0) {
      // Fallback while loading
      return [
        [
          { name: "GPT-4o", id: "gpt-4o" },
          { name: "Claude 3.5 Sonnet", id: "claude-3.5-sonnet" },
          { name: "Llama 3.1 405B", id: "llama-3.1-405b" },
          { name: "Mistral Large", id: "mistral-large" },
        ],
        [
          { name: "Gemma 2 27B", id: "gemma-2-27b" },
          { name: "Qwen 2.5 72B", id: "qwen-2.5-72b" },
          { name: "DeepSeek V3", id: "deepseek-v3" },
          { name: "Mixtral 8x22B", id: "mixtral-8x22b" },
        ],
      ];
    }

    // Sort by created date (newest first) and take top 8
    const latestModels = [...models]
      .sort((a, b) => b.created - a.created)
      .slice(0, 8);

    // Format model names for display (extract short name)
    const formatModelName = (name: string): string => {
      // Remove provider prefix if present (e.g., "Qwen: Qwen3 30B" -> "Qwen3 30B")
      const colonIndex = name.indexOf(":");
      if (colonIndex !== -1) {
        return name.substring(colonIndex + 1).trim();
      }
      // Handle slash format (e.g., "openai/gpt-4o" -> "GPT-4o")
      const slashIndex = name.lastIndexOf("/");
      if (slashIndex !== -1) {
        return name.substring(slashIndex + 1).trim();
      }
      return name;
    };

    const formattedModels: ModelLogo[] = latestModels.map((model) => ({
      name: formatModelName(model.name || model.id),
      id: model.id,
    }));

    // Split into sets of 4
    const sets: ModelLogo[][] = [];
    for (let i = 0; i < formattedModels.length; i += 4) {
      const set = formattedModels.slice(i, i + 4);
      if (set.length > 0) {
        sets.push(set);
      }
    }

    return sets.length > 0 ? sets : [[{ name: "Loading...", id: "loading" }]];
  }, [models]);

  const activeLogoSet = modelSets[activeSetIndex] || modelSets[0];

  const flipLogos = () => {
    setActiveSetIndex((current) => (current + 1) % modelSets.length);
    setIsAnimating(true);
  };

  useEffect(() => {
    if (!isAnimating && modelSets.length > 1) {
      const timer = setTimeout(() => {
        flipLogos();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, modelSets.length]);

  return (
    <div className="relative z-20 py-10 md:py-20 px-4 md:px-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-center text-xl md:text-2xl font-bold font-sans text-white mb-8">
          Access Top Tier Models
        </h2>
        <div className="flex gap-6 sm:gap-10 flex-wrap justify-center md:gap-16 lg:gap-20 relative h-full w-full min-h-[60px]">
          <AnimatePresence
            mode="popLayout"
            onExitComplete={() => {
              setIsAnimating(false);
            }}
          >
            {loading && models.length === 0 ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, idx) => (
                <motion.div
                  key={`skeleton-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="h-8 md:h-10 w-24 md:w-40 bg-neutral-800 rounded animate-pulse"
                />
              ))
            ) : (
              activeLogoSet.map((logo, idx) => (
                <motion.div
                  initial={{
                    y: 40,
                    opacity: 0,
                    filter: "blur(10px)",
                  }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    filter: "blur(0px)",
                  }}
                  exit={{
                    y: -40,
                    opacity: 0,
                    filter: "blur(10px)",
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 * idx,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  key={`${activeSetIndex}-${logo.id}`}
                  className="relative"
                >
                  <span className="text-lg sm:text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 whitespace-nowrap">
                    {logo.name}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
        
        {/* Dot indicators */}
        {modelSets.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {modelSets.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveSetIndex(idx);
                  setIsAnimating(true);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === activeSetIndex
                    ? "bg-white w-4"
                    : "bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Show model set ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
