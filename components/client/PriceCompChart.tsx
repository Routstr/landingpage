"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export interface PriceData {
  providerName: string;
  promptPrice: number;
  completionPrice: number;
  // Prices in sats/1M tokens usually, but just passed as raw numbers
  // We can normalize them for the bar width
}

interface PriceCompChartProps {
  data: PriceData[];
  currencyLabel?: string;
  className?: string;
}

export function PriceCompChart({
  data,
  currencyLabel = "sats / 1M tokens",
  className = "",
}: PriceCompChartProps) {
  // Determine max value for sealing bars
  const maxValue = useMemo(() => {
    return Math.max(
      ...data.map((d) => Math.max(d.promptPrice, d.completionPrice)),
      0.000001 // prevent div by zero
    );
  }, [data]);

  // Sort by lowest total price (cheapest first)
  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) =>
        a.promptPrice + a.completionPrice - (b.promptPrice + b.completionPrice)
    );
  }, [data]);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Price Comparison</h3>
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          {currencyLabel}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {sortedData.map((d, index) => {
          const promptPercent = (d.promptPrice / maxValue) * 100;
          const completionPercent = (d.completionPrice / maxValue) * 100;

          return (
            <div
              key={d.providerName}
              className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4"
            >
              <div className="flex justify-between items-end mb-2">
                <span className="font-medium text-white">{d.providerName}</span>
              </div>

              {/* Bars container */}
              <div className="space-y-2">
                {/* Prompt Price Bar */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-gray-500 shrink-0">Input</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(promptPercent, 1)}%` }} // Ensure at least a sliver
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full bg-emerald-500/80 rounded-full"
                    />
                  </div>
                  <span className="w-24 text-right text-gray-300 tabular-nums">
                    {d.promptPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* Completion Price Bar */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-gray-500 shrink-0">Output</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(completionPercent, 1)}%` }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1 + 0.1,
                      }}
                      className="h-full bg-blue-500/80 rounded-full"
                    />
                  </div>
                  <span className="w-24 text-right text-gray-300 tabular-nums">
                    {d.completionPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
