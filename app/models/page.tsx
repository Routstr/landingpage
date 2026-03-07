"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import {
  getProviderFromModelName,
  fetchModels,
  getModelNameWithoutProvider,
  Model,
} from "@/app/data/models";
import { usePricingView } from "@/app/contexts/PricingContext";
import { ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";

const MIN_REASONABLE_CREATED = Date.UTC(2020, 0, 1) / 1000;
const MAX_FUTURE_SKEW_SECONDS = 7 * 24 * 60 * 60;

function normalizeCreated(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 0;
  // Accept both seconds and milliseconds timestamps.
  return value > 1_000_000_000_000 ? Math.floor(value / 1000) : value;
}

function inferCreatedFromModelId(modelId: string): number | null {
  const match = modelId.match(
    /(20\d{2})[-_](0[1-9]|1[0-2])[-_](0[1-9]|[12]\d|3[01])/
  );
  if (!match) return null;
  const parsed = Date.parse(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  if (Number.isNaN(parsed)) return null;
  return Math.floor(parsed / 1000);
}

function isReasonableCreated(value: number): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return (
    value >= MIN_REASONABLE_CREATED &&
    value <= nowSeconds + MAX_FUTURE_SKEW_SECONDS
  );
}

function getStableCreated(model: Model): number {
  const direct = normalizeCreated(model.created);
  const inferred = inferCreatedFromModelId(model.id);
  const candidates = [direct, inferred ?? 0].filter(
    (value) => value > 0 && isReasonableCreated(value)
  );
  if (candidates.length === 0) return 0;
  return Math.min(...candidates);
}

export default function ModelsPage() {
  const { currency } = usePricingView();
  const priceUnit = currency === "sats" ? "sats/1M tokens" : "USD/1M tokens";
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: "name" | "context" | "created" | "input" | "output";
    direction: "asc" | "desc";
  }>({ key: "created", direction: "desc" });

  const [items, setItems] = useState<Model[]>([]);
  const [modelProvidersKV, setModelProvidersKV] = useState<
    Record<string, Array<{ name: string; price: number }>>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const isUnknownProvider = (name: string) => {
    const normalized = name.trim().toLowerCase();
    return normalized === "unknown";
  };

  const getPrimaryProviderName = (
    modelName: string,
    providers: Array<{ name: string; price: number }> | undefined
  ) => {
    if (providers && providers.length > 0) {
      return providers[0].name;
    }
    return getProviderFromModelName(modelName);
  };

  useEffect(() => {
    let active = true;
    async function loadModels() {
      setIsLoading(true);
      setItems([]);
      setModelProvidersKV({});

      try {
        await fetchModels((provider, newModels) => {
          if (!active) return;

          setItems((prevItems) => {
            const byName = new Map(prevItems.map((m) => [m.name, m]));
            for (const model of newModels) {
              const incomingStableCreated = getStableCreated(model);
              const existing = byName.get(model.name);
              if (!existing) {
                byName.set(model.name, {
                  ...model,
                  created: incomingStableCreated || normalizeCreated(model.created),
                });
                continue;
              }

              const existingCreated = normalizeCreated(existing.created);
              const incomingCreated = normalizeCreated(model.created);
              const preferred = incomingCreated > existingCreated ? model : existing;
              const existingStableCreated = getStableCreated(existing);
              const mergedStableCreated =
                existingStableCreated > 0 && incomingStableCreated > 0
                  ? Math.min(existingStableCreated, incomingStableCreated)
                  : Math.max(existingStableCreated, incomingStableCreated);

              byName.set(model.name, {
                ...preferred,
                created:
                  mergedStableCreated || normalizeCreated(preferred.created),
              });
            }
            return Array.from(byName.values());
          });

          setModelProvidersKV((prev) => {
            const next = { ...prev };
            for (const model of newModels) {
              const modelProviderName = provider.name;
              const price = model.sats_pricing?.completion ?? 0;

              const existing = next[model.name] || [];
              const alreadyExists = existing.some(
                (p) => p.name === modelProviderName
              );

              if (!alreadyExists) {
                next[model.name] = [
                  ...existing,
                  { name: modelProviderName, price },
                ].sort((a, b) => {
                  const aUnknown = isUnknownProvider(a.name);
                  const bUnknown = isUnknownProvider(b.name);
                  if (aUnknown !== bUnknown) {
                    return aUnknown ? 1 : -1;
                  }
                  return a.price - b.price;
                });
              }
            }
            return next;
          });
        });
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadModels();
    return () => {
      active = false;
    };
  }, []);

  const filteredModels = items
    .filter((model) => {
      const matchesSearch =
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      const providersA = modelProvidersKV[a.name] || [
        { name: getProviderFromModelName(a.name), price: 0 },
      ];
      const providersB = modelProvidersKV[b.name] || [
        { name: getProviderFromModelName(b.name), price: 0 },
      ];
      const providerAUnknown = isUnknownProvider(
        getPrimaryProviderName(a.name, providersA)
      );
      const providerBUnknown = isUnknownProvider(
        getPrimaryProviderName(b.name, providersB)
      );
      if (providerAUnknown !== providerBUnknown) {
        return providerAUnknown ? 1 : -1;
      }

      let comparison = 0;
      switch (sortConfig.key) {
        case "name":
          comparison = getModelNameWithoutProvider(a.name).localeCompare(
            getModelNameWithoutProvider(b.name)
          );
          break;
        case "created":
          comparison = normalizeCreated(a.created) - normalizeCreated(b.created);
          break;
        case "context":
          comparison = a.context_length - b.context_length;
          break;
        case "input":
          const priceInA =
            currency === "sats" ? a.sats_pricing.prompt : a.pricing.prompt;
          const priceInB =
            currency === "sats" ? b.sats_pricing.prompt : b.pricing.prompt;
          comparison = priceInA - priceInB;
          break;
        case "output":
          const priceOutA =
            currency === "sats"
              ? a.sats_pricing.completion
              : a.pricing.completion;
          const priceOutB =
            currency === "sats"
              ? b.sats_pricing.completion
              : b.pricing.completion;
          comparison = priceOutA - priceOutB;
          break;
        default:
          comparison = 0;
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: key === "created" ? "desc" : "asc",
      };
    });
  };

  const SortIcon = ({ column }: { column: typeof sortConfig.key }) => {
    if (sortConfig.key !== column)
      return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  return (
    <SiteShell>
      <section className="py-12 md:py-20">
        <PageContainer>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-4 tracking-tight">Models</h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl font-light leading-relaxed">
                Browse and compare {items.length} AI models across the decentralized Routstr network.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-12">
            <Input
              type="text"
              placeholder="Search models..."
              className="h-10 max-w-md border-border bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 py-3 border-b border-border bg-card/50 px-4 text-[10px] font-bold text-muted-foreground">
              <div 
                className="col-span-6 md:col-span-4 cursor-pointer hover:text-muted-foreground transition-colors"
                onClick={() => handleSort("name")}
              >
                <div className="inline-flex items-center gap-1">
                  Model <SortIcon column="name" />
                </div>
              </div>
              <div className="hidden md:block col-span-2 text-left">Providers</div>
              <div 
                className="hidden lg:block col-span-2 cursor-pointer hover:text-muted-foreground transition-colors text-left"
                onClick={() => handleSort("context")}
              >
                <div className="inline-flex items-center gap-1">
                  Context <SortIcon column="context" />
                </div>
              </div>
              <div 
                className="hidden md:block col-span-2 cursor-pointer hover:text-muted-foreground transition-colors text-left"
                onClick={() => handleSort("created")}
              >
                <div className="inline-flex items-center gap-1">
                  Added <SortIcon column="created" />
                </div>
              </div>
              <div className="col-span-6 md:col-span-4 lg:col-span-2 text-right">Pricing (in/out)</div>
            </div>

            {isLoading && items.length === 0 ? (
              [...Array(10)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 py-6 border-b border-border/30 px-4 animate-pulse">
                  <div className="col-span-6 md:col-span-4 h-4 bg-border rounded w-3/4" />
                  <div className="hidden md:block col-span-2 h-3 bg-border rounded w-full" />
                  <div className="hidden lg:block col-span-2 h-3 bg-border rounded w-1/2" />
                  <div className="hidden md:block col-span-2 h-3 bg-border rounded w-1/2" />
                  <div className="col-span-6 md:col-span-2 h-3 bg-border rounded w-16 ml-auto" />
                </div>
              ))
            ) : filteredModels.length > 0 ? (
              filteredModels.map((model, index) => {
                const providersData = (modelProvidersKV[model.name] || [
                  { name: getProviderFromModelName(model.name), price: 0 },
                ]).sort((a, b) => {
                  const aUnknown = isUnknownProvider(a.name);
                  const bUnknown = isUnknownProvider(b.name);
                  if (aUnknown !== bUnknown) {
                    return aUnknown ? 1 : -1;
                  }
                  return a.price - b.price;
                });
                
                let displayedProviders = "";
                if (providersData.length <= 2) {
                  displayedProviders = providersData.map((p) => p.name).join(", ");
                } else {
                  displayedProviders = `${providersData.slice(0, 2).map((p) => p.name).join(", ")}, +${providersData.length - 2}`;
                }

                return (
                  <Link
                    key={`${model.id}-${index}`}
                    href={`/models/${model.id}`}
                    className="grid grid-cols-12 gap-4 py-5 border-b border-border/30 px-4 hover:bg-card transition-colors group items-center"
                  >
                    <div className="col-span-6 md:col-span-4">
                      <span className="font-bold text-sm text-white group-hover:underline decoration-muted-foreground underline-offset-4 truncate block">
                        {model.name}
                      </span>
                    </div>
                    <div className="hidden md:flex col-span-2 text-xs text-muted-foreground truncate min-w-0">
                      {displayedProviders}
                    </div>
                    <div className="hidden lg:flex col-span-2 text-xs text-muted-foreground font-mono">
                      {model.context_length >= 1000 ? `${Math.round(model.context_length / 1000)}K` : model.context_length}
                    </div>
                    <div className="hidden md:flex col-span-2 text-xs text-muted-foreground">
                      {model.created
                        ? new Date(normalizeCreated(model.created) * 1000).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                    <div className="col-span-6 md:col-span-4 lg:col-span-2 text-right text-[10px] flex flex-col gap-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-muted-foreground font-medium">in</span>
                        <span className="text-foreground font-mono">
                          {currency === "sats" 
                            ? (model.sats_pricing.prompt * 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                            : (model.pricing.prompt * 1_000_000).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{priceUnit}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-muted-foreground font-medium">out</span>
                        <span className="text-foreground font-mono">
                          {currency === "sats" 
                            ? (model.sats_pricing.completion * 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                            : (model.pricing.completion * 1_000_000).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{priceUnit}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="py-20 text-center text-muted-foreground text-sm font-mono border-b border-border/30">
                No models found matching your search.
              </div>
            )}
          </div>
        </PageContainer>
      </section>
    </SiteShell>
  );
}
