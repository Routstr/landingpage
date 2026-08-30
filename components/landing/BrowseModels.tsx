"use client";
import Link from "next/link";
import { usePricingView } from "@/app/contexts/PricingContext";
import { useModels } from "@/app/contexts/ModelsContext";
import { getPopularModels } from "@/app/data/models";
import { fetchRoutstr21ModelIds } from "@/lib/routstr21";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyTabs } from "@/components/ui/currency-tabs";
import {
  formatCompactContextLength,
  formatCompactPriceValue,
  formatSatsPriceValue,
} from "@/lib/number-format";

interface DisplayModel {
  id: string;
  name: string;
  promptPrice: string;
  completionPrice: string;
  context: string;
  created: number;
}

// A provider publishing placeholder metadata should not be able to set the
// price shown for a model, so take the median across everyone serving it.
function median(values: number[]): number {
  const sorted = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

const FALLBACK_MODEL_COUNT = 6;

export function LandingBrowseModels() {
  const { currency } = usePricingView();
  const priceAmount = (value: string) =>
    currency === "usd" ? `$${value}` : `${value} sats`;
  const { models, modelProviderEntries, loading: modelsLoading } = useModels();
  const [curatedIds, setCuratedIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRoutstr21ModelIds().then((ids) => {
      if (!cancelled) setCuratedIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const curatedModels = useMemo(
    () =>
      (curatedIds ?? [])
        .map((id) => models.find((model) => model.id === id))
        .filter((model): model is NonNullable<typeof model> => Boolean(model)),
    [curatedIds, models]
  );
  const isCurated = curatedModels.length > 0;

  const displayModels: DisplayModel[] = useMemo(() => {
    if (models.length === 0) return [];

    const selected = isCurated
      ? curatedModels
      : getPopularModels(FALLBACK_MODEL_COUNT, models);

    return selected.map((model) => {
      const entries = modelProviderEntries.get(model.id);
      const variants = entries && entries.length > 0 ? entries.map((entry) => entry.model) : [model];

      const promptPrice =
        median(
          variants.map((variant) =>
            currency === "sats"
              ? variant.sats_pricing?.prompt ?? 0
              : variant.pricing?.prompt ?? 0
          )
        ) * 1_000_000;
      const completionPrice =
        median(
          variants.map((variant) =>
            currency === "sats"
              ? variant.sats_pricing?.completion ?? 0
              : variant.pricing?.completion ?? 0
          )
        ) * 1_000_000;
      const contextLength = median(variants.map((variant) => variant.context_length ?? 0));

      const modelName =
        model.name.split("/").length > 1 ? model.name.split("/")[1] : model.name;

      return {
        id: model.id,
        name: modelName,
        promptPrice:
          currency === "sats"
            ? formatSatsPriceValue(promptPrice)
            : formatCompactPriceValue(promptPrice, { fixedSmallDecimals: true }),
        completionPrice:
          currency === "sats"
            ? formatSatsPriceValue(completionPrice)
            : formatCompactPriceValue(completionPrice, { fixedSmallDecimals: true }),
        context: contextLength ? formatCompactContextLength(contextLength) : "N/A",
        created: model.created,
      };
    });
  }, [curatedModels, isCurated, models, modelProviderEntries, currency]);

  return (
    <div className="w-full relative md:flex md:min-h-[calc(100svh-80px)] md:flex-col md:justify-center">
      <div className="w-full px-[clamp(1rem,5vw,5rem)] py-20 max-w-[1800px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            {isCurated && (
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Routstr 21
              </p>
            )}
            <h2 className="text-xl font-bold text-foreground mb-2">
              Browse Models
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl">
              Recommended models, priced across independent providers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CurrencyTabs />
            <Button asChild className="hidden md:inline-flex">
              <Link href="/models">
                View all models
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-8">
          <div className="scrollbar-subtle flex max-h-[19rem] flex-col overflow-y-auto">
            <div className="sticky top-0 z-10 grid grid-cols-12 gap-4 py-3 border-b border-border bg-background px-4 text-[10px] font-bold text-muted-foreground">
              <div className="col-span-6 md:col-span-6 lg:col-span-6">Model</div>
              <div className="hidden lg:block col-span-2">Context</div>
              <div className="hidden md:block col-span-2">Added</div>
              <div className="col-span-6 md:col-span-4 lg:col-span-2 text-right">Pricing (in/out)</div>
            </div>

            {modelsLoading ? (
              [...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-4 py-6 border-b border-border/30 px-4 animate-pulse"
                >
                  <div className="col-span-6 md:col-span-6 lg:col-span-6 flex items-center">
                    <div className="h-4 bg-border rounded w-3/4" />
                  </div>
                  <div className="hidden lg:block col-span-2 flex items-center">
                    <div className="h-3 bg-border rounded w-1/2" />
                  </div>
                  <div className="hidden md:block col-span-2 flex items-center">
                    <div className="h-3 bg-border rounded w-1/2" />
                  </div>
                  <div className="col-span-6 md:col-span-4 lg:col-span-2 flex flex-col justify-center items-end gap-2">
                    <div className="h-3 bg-border rounded w-16" />
                    <div className="h-3 bg-border rounded w-16" />
                  </div>
                </div>
              ))
            ) : displayModels.length > 0 ? (
              displayModels.map((model) => (
                <Link
                  key={model.id}
                  href={`/models/${model.id}`}
                  className="grid grid-cols-12 gap-4 py-5 border-b border-border/30 px-4 hover:bg-card transition-colors group"
                >
                  <div className="col-span-6 md:col-span-6 lg:col-span-6 flex items-center">
                    <span className="font-bold text-sm text-foreground group-hover:underline decoration-muted-foreground underline-offset-4 truncate">
                      {model.name}
                    </span>
                  </div>
                  <div className="hidden lg:flex col-span-2 items-center text-xs text-muted-foreground font-mono">
                    {model.context}
                  </div>
                  <div className="hidden md:flex col-span-2 items-center text-xs text-muted-foreground">
                    {new Date(model.created * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="col-span-6 md:col-span-4 lg:col-span-2 text-right text-[10px] flex flex-col justify-center gap-1">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-muted-foreground font-medium">in</span>
                      <span className="text-foreground font-mono whitespace-nowrap">
                        {priceAmount(model.promptPrice)}
                        <span className="text-[9px] font-normal text-muted-foreground">/M tokens</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-muted-foreground font-medium">out</span>
                      <span className="text-foreground font-mono whitespace-nowrap">
                        {priceAmount(model.completionPrice)}
                        <span className="text-[9px] font-normal text-muted-foreground">/M tokens</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-xs text-muted-foreground">No models available at the moment.</p>
              </div>
            )}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent"
          />
        </div>

        <div className="mt-8 md:hidden">
          <Button asChild className="w-full">
            <Link href="/models">
              View all models
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
