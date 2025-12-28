"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CurrencyTabs } from "@/components/ui/currency-tabs";
import { usePricingView } from "@/app/contexts/PricingContext";
import { useModels } from "@/app/contexts/ModelsContext";
import { getPopularModels, getProviderFromModelName } from "@/app/data/models";
import { useState, useEffect } from "react";

interface DisplayModel {
  id: string;
  name: string;
  provider: string;
  promptPrice: string;
  completionPrice: string;
  context: string;
  created: number;
}

export function LandingBrowseModels() {
  const { currency } = usePricingView();
  const { models, loading: modelsLoading } = useModels();
  const [displayModels, setDisplayModels] = useState<DisplayModel[]>([]);

  useEffect(() => {
    const current = getPopularModels(6, models);

    if (!current || current.length === 0) {
      setDisplayModels([]);
      return;
    }

    const formattedModels = current.map((model) => {
      const provider = getProviderFromModelName(model.name);
      const modelName =
        model.name.split("/").length > 1
          ? model.name.split("/")[1]
          : model.name;

      const promptPrice =
        currency === "sats"
          ? model.sats_pricing.prompt > 0
            ? 1 / model.sats_pricing.prompt
            : 0
          : model.pricing.prompt * 1_000_000;
      const completionPrice =
        currency === "sats"
          ? model.sats_pricing.completion > 0
            ? 1 / model.sats_pricing.completion
            : 0
          : model.pricing.completion * 1_000_000;

      const formatPrice = (num: number) => {
        if (currency === "sats") {
          if (num < 0.0001) return num.toExponential(2);
          return num.toFixed(
            Math.min(4, Math.max(1, 6 - Math.floor(Math.log10(num) + 1)))
          );
        }
        return num.toFixed(2);
      };

      return {
        id: model.id,
        name: modelName,
        provider: provider,
        promptPrice: formatPrice(promptPrice),
        completionPrice: formatPrice(completionPrice),
        context: "128K tokens",
        created: model.created,
      };
    });
    setDisplayModels(formattedModels);
  }, [currency, models]);

  return (
    <div className="w-full max-w-7xl mx-auto py-20 md:py-32 px-4 md:px-8 bg-black">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
            Browse Models
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-neutral-400 max-w-xl">
            Access a wide range of AI models through independent providers with
            transparent pricing and performance metrics
          </p>
        </div>
        <div className="flex-shrink-0">
          <CurrencyTabs />
        </div>
      </div>

      {/* Models Grid */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelsLoading ? (
            // Skeleton loading UI
            Array(6)
              .fill(0)
              .map((_, index) => (
                <ModelCardSkeleton key={index} index={index} />
              ))
          ) : displayModels.length > 0 ? (
            displayModels.map((model, index) => (
              <ModelCard
                key={model.id}
                model={model}
                index={index}
                currency={currency}
              />
            ))
          ) : (
            <div className="text-center py-16 col-span-full">
              <p className="text-neutral-400">
                No models available at the moment. Please check back later.
              </p>
            </div>
          )}
        </div>

        {/* Fade effect at bottom */}
        {displayModels.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        )}
      </div>

      {/* View All Link */}
      <div className="mt-12 text-center relative z-10">
        <Link
          href="/models"
          className="group inline-flex items-center gap-3 text-white hover:text-neutral-300 font-medium text-lg transition-colors"
        >
          View all models
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
            initial={{ x: 0 }}
            whileHover={{ x: 5 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </motion.svg>
        </Link>
      </div>
    </div>
  );
}

const ModelCard = ({
  model,
  index,
  currency,
}: {
  model: DisplayModel;
  index: number;
  currency: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/models/${model.id}`} className="block group">
        <div className="relative bg-neutral-900 border border-white/10 rounded-xl p-5 md:p-6 hover:border-white/20 transition-colors duration-300 hover:bg-neutral-900/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-white truncate group-hover:text-white/90">
                {model.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm md:text-base">
                <span className="text-neutral-500">{model.provider}</span>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-600">
                  {new Date(model.created * 1000).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </span>
              </div>

              {/* Pricing row */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
                <div className="text-sm">
                  <span className="text-neutral-500">Input: </span>
                  <span className="font-mono text-white">
                    {currency === "sats"
                      ? model.promptPrice
                      : `$${model.promptPrice}`}
                  </span>
                  <span className="text-neutral-600 ml-1">
                    {currency === "sats" ? "tokens/sat" : "/M tokens"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-neutral-500">Output: </span>
                  <span className="font-mono text-white">
                    {currency === "sats"
                      ? model.completionPrice
                      : `$${model.completionPrice}`}
                  </span>
                  <span className="text-neutral-600 ml-1">
                    {currency === "sats" ? "tokens/sat" : "/M tokens"}
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors group-hover:translate-x-0.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const ModelCardSkeleton = ({ index }: { index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-neutral-900 border border-white/10 rounded-xl p-5 md:p-6 animate-pulse"
    >
      <div className="flex justify-between items-start">
        <div className="w-full">
          <div className="h-6 bg-white/5 rounded w-1/3 mb-3" />
          <div className="h-4 bg-white/5 rounded w-1/4 mb-4" />
          <div className="flex gap-6 mt-3">
            <div className="h-4 bg-white/5 rounded w-32" />
            <div className="h-4 bg-white/5 rounded w-32" />
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0" />
      </div>
    </motion.div>
  );
};

export default LandingBrowseModels;
