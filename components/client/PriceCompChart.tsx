"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export interface PriceData {
  providerName: string;
  promptPrice: number;
  completionPrice: number;
}

interface PriceCompChartProps {
  data: PriceData[];
  currencyLabel?: string;
  unitSuffix?: string;
  className?: string;
}

export function PriceCompChart({
  data,
  currencyLabel = "sats / 1M tokens",
  unitSuffix = "",
  className = "",
}: PriceCompChartProps) {
  const maxValue = useMemo(() => {
    return Math.max(
      ...data.map((d) => Math.max(d.promptPrice, d.completionPrice)),
      0.000001
    );
  }, [data]);

  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) =>
        a.promptPrice + a.completionPrice - (b.promptPrice + b.completionPrice)
    );
  }, [data]);

  return (
    <div className={`w-full overflow-hidden font-mono ${className}`}>
      {currencyLabel ? (
        <div className="mb-4 flex justify-end">
          <span className="text-[10px] text-muted-foreground">{currencyLabel}</span>
        </div>
      ) : null}

      <div className="flex flex-col border-t border-border/30">
        {sortedData.map((d, index) => {
          const promptPercent = (d.promptPrice / maxValue) * 100;
          const completionPercent = (d.completionPrice / maxValue) * 100;

          return (
            <div
              key={d.providerName}
              className="py-6 border-b border-border/30 group"
            >
              <div className="flex justify-between items-baseline mb-4">
                <span className="max-w-[60vw] truncate text-sm font-bold text-foreground sm:max-w-none">
                  {d.providerName}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 text-[10px]">
                  <span className="w-12 text-muted-foreground shrink-0">input</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(promptPercent, 1)}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <span className="w-20 text-right text-muted-foreground tabular-nums font-mono">
                    {d.promptPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{unitSuffix ? ` ${unitSuffix}` : ""}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[10px]">
                  <span className="w-12 text-muted-foreground shrink-0">output</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(completionPercent, 1)}%` }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1 + 0.1,
                      }}
                      className="h-full rounded-full bg-muted-foreground"
                    />
                  </div>
                  <span className="w-20 text-right text-muted-foreground tabular-nums font-mono">
                    {d.completionPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{unitSuffix ? ` ${unitSuffix}` : ""}
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
