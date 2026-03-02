"use client";
import Link from "next/link";
import { usePricingView } from "@/app/contexts/PricingContext";
import { useModels } from "@/app/contexts/ModelsContext";
import { getPopularModels } from "@/app/data/models";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

interface DisplayModel {
  id: string;
  name: string;
  promptPrice: string;
  completionPrice: string;
  context: string;
  created: number;
}

export function LandingBrowseModels() {
  const { currency } = usePricingView();
  const priceUnit = currency === "sats" ? "sats/m" : "usd/m";
  const { models, loading: modelsLoading } = useModels();
  const [displayModels, setDisplayModels] = useState<DisplayModel[]>([]);

  useEffect(() => {
    const current = getPopularModels(6, models);

    if (!current || current.length === 0) {
      setDisplayModels([]);
      return;
    }

    const formattedModels = current.map((model) => {
      const modelName =
        model.name.split("/").length > 1
          ? model.name.split("/")[1]
          : model.name;

      const promptPrice =
        currency === "sats"
          ? model.sats_pricing.prompt > 0
            ? model.sats_pricing.prompt * 1_000_000
            : 0
          : model.pricing.prompt * 1_000_000;
      const completionPrice =
        currency === "sats"
          ? model.sats_pricing.completion > 0
            ? model.sats_pricing.completion * 1_000_000
            : 0
          : model.pricing.completion * 1_000_000;

      const formatPrice = (num: number) => {
        if (currency === "sats") {
          return num.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          });
        }
        return num.toFixed(2);
      };

      const formatContext = (length: number) => {
        if (!length) return "N/A";
        if (length >= 1000000) return `${(length / 1000000).toFixed(0)}M`;
        if (length >= 1000) return `${(length / 1000).toFixed(0)}K`;
        return length.toString();
      };

      return {
        id: model.id,
        name: modelName,
        promptPrice: formatPrice(promptPrice),
        completionPrice: formatPrice(completionPrice),
        context: formatContext(model.context_length),
        created: model.created,
      };
    });
    setDisplayModels(formattedModels);
  }, [currency, models]);

  return (
    <div className="w-full relative">
      <div className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Browse Models
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl">
              Access leading open source AI models through independent providers.
            </p>
          </div>
        </div>

        <div className="flex flex-col mt-8">
          <div className="grid grid-cols-12 gap-4 py-3 border-b border-border bg-card/50 px-4 text-[10px] font-bold text-muted-foreground">
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
                  <span className="font-bold text-sm text-white group-hover:underline decoration-muted-foreground underline-offset-4 truncate">
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
                    <span className="text-foreground font-mono">
                      {model.promptPrice}
                    </span>
                    <span className="text-muted-foreground">{priceUnit}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-muted-foreground font-medium">out</span>
                    <span className="text-foreground font-mono">
                      {model.completionPrice}
                    </span>
                    <span className="text-muted-foreground">{priceUnit}</span>
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

        <div className="mt-8">
          <Link
            href="/models"
            className="inline-flex items-center gap-2 text-sm text-foreground hover:text-white transition-colors"
          >
            View all models
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
