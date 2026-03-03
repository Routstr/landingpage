"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { InfoPill } from "@/components/client/InfoPill";
import { MintsPill } from "@/components/client/MintsPill";
import { usePricingView } from "@/app/contexts/PricingContext";
import {
  fetchModels,
  getProviderById,
  getProviderFeatures,
  getModelsByProvider,
  type Provider as ProviderType,
  type Model,
} from "@/app/data/models";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderReviews } from "@/components/ProviderReviews";
import { formatPublicKey } from "@/lib/nostr";
import { ArrowLeft, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function ProviderPage() {
  const { currency } = usePricingView();
  const priceUnit = currency === "sats" ? "sats/1M tokens" : "USD/1M tokens";
  const params = useParams();
  const providerId = (() => {
    const raw = (params?.id as string) || "";
    try { return decodeURIComponent(raw); } catch { return raw; }
  })();

  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderType | null>(null);
  const [providerModels, setProviderModels] = useState<Model[]>([]);
  const [sort, setSort] = useState<{
    key: "name" | "price" | "context" | "created";
    direction: "asc" | "desc";
  }>({ key: "created", direction: "desc" });

  function requestSort(nextKey: "name" | "price" | "context" | "created") {
    setSort((prev) => {
      if (prev.key === nextKey) {
        return { key: nextKey, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key: nextKey, direction: "asc" };
    });
  }

  const sortedModels = useMemo(() => {
    if (!providerModels || providerModels.length === 0) return providerModels;
    const copy = [...providerModels];
    copy.sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      if (sort.key === "name") return a.name.localeCompare(b.name) * direction;
      if (sort.key === "price") {
        const aVal = currency === "sats" ? a.sats_pricing?.completion ?? 0 : a.pricing?.completion ?? 0;
        const bVal = currency === "sats" ? b.sats_pricing?.completion ?? 0 : b.pricing?.completion ?? 0;
        return (aVal - bVal) * direction;
      }
      if (sort.key === "context") return (a.context_length - b.context_length) * direction;
      return (a.created - b.created) * direction;
    });
    return copy;
  }, [providerModels, sort, currency]);

  function SortIcon({ column }: { column: "name" | "price" | "context" | "created" }) {
    if (sort.key !== column) return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sort.direction === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  }

  useEffect(() => {
    let isActive = true;
    async function load() {
      setIsLoading(true);
      let p = getProviderById(providerId);
      if (!p) {
        await fetchModels();
        p = getProviderById(providerId) || undefined;
      }
      if (!isActive) return;
      setProvider(p || null);
      setProviderModels(p ? getModelsByProvider(providerId) : []);
      setIsLoading(false);
    }
    if (providerId) load();
    return () => { isActive = false; };
  }, [providerId]);

  if (!isLoading && !provider) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-muted-foreground selection:bg-neutral-800 selection:text-foreground font-mono">
        <Header />
        <main className="flex-grow flex flex-col items-start justify-center px-6 md:px-12 max-w-5xl mx-auto w-full text-left">
          <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-4 tracking-tight">Provider Not Found</h1>
          <p className="text-muted-foreground mb-8">The provider you&#39;re looking for doesn&#39;t exist.</p>
          <Link href="/providers" className="text-foreground hover:underline underline-offset-4">Back to providers</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const features = provider ? getProviderFeatures(provider) : [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-muted-foreground selection:bg-neutral-800 selection:text-foreground font-mono">
      <Header />
      <main className="flex-grow py-12 md:py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <BackButton fallbackHref="/providers" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-12">
            <ArrowLeft className="w-3 h-3" /> Back to Providers
          </BackButton>

          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-4 tracking-tight">
                {isLoading ? <Skeleton className="h-10 w-64 bg-border" /> : provider?.name}
              </h1>
              {isLoading ? (
                <div className="mb-8">
                  <Skeleton className="h-4 w-full bg-border" />
                </div>
              ) : (
                <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed mb-8">
                  {provider?.description}
                </p>
              )}
              
              {!isLoading && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {features.map((feature, index) => (
                    <span key={index} className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] text-muted-foreground">
                      {feature}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col items-start gap-y-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-3">
                {isLoading ? (
                  <Skeleton className="h-10 w-full bg-border" />
                ) : (
                  provider && (
                    <>
                      <InfoPill label="Endpoint" value={provider.endpoint_url} />
                      {(() => {
                        const urls = provider.mint_urls && provider.mint_urls.length > 0 ? provider.mint_urls : provider.mint_url ? [provider.mint_url] : [];
                        return urls.length > 0 ? <MintsPill mints={urls} /> : null;
                      })()}
                    </>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col mt-20">
            <div className="flex items-center justify-between gap-3 mb-8">
              <h2 className="text-xl font-bold text-white">Models</h2>
            </div>

            <div className="flex flex-col">
              <div className="grid grid-cols-12 gap-4 py-3 border-b border-border bg-card/50 px-4 text-[10px] font-bold text-muted-foreground">
                <div className="col-span-6 cursor-pointer hover:text-muted-foreground" onClick={() => requestSort("name")}>
                  <div className="inline-flex items-center gap-1">
                    Model <SortIcon column="name" />
                  </div>
                </div>
                <div className="hidden md:block col-span-2 cursor-pointer hover:text-muted-foreground" onClick={() => requestSort("context")}>
                  <div className="inline-flex items-center gap-1">
                    Context <SortIcon column="context" />
                  </div>
                </div>
                <div className="hidden md:block col-span-2 cursor-pointer hover:text-muted-foreground" onClick={() => requestSort("created")}>
                  <div className="inline-flex items-center gap-1">
                    Added <SortIcon column="created" />
                  </div>
                </div>
                <div className="col-span-6 md:col-span-2 text-right cursor-pointer hover:text-muted-foreground" onClick={() => requestSort("price")}>
                  <div className="inline-flex items-center justify-end gap-1 w-full">
                    Pricing (in/out) <SortIcon column="price" />
                  </div>
                </div>
              </div>

              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 py-6 border-b border-border/30 px-4 animate-pulse">
                    <div className="col-span-6 h-4 bg-border rounded w-3/4" />
                    <div className="hidden md:block col-span-2 h-3 bg-border rounded w-1/2" />
                    <div className="hidden md:block col-span-2 h-3 bg-border rounded w-1/3" />
                    <div className="col-span-6 md:col-span-2 h-4 bg-border rounded w-12 ml-auto" />
                  </div>
                ))
              ) : sortedModels.length > 0 ? (
                sortedModels.map((model) => (
                  <Link key={model.id} href={`/models/${model.id}`} className="grid grid-cols-12 gap-4 py-5 border-b border-border/30 px-4 hover:bg-card transition-colors group items-center">
                    <div className="col-span-6">
                      <span className="font-bold text-sm text-white group-hover:underline decoration-muted-foreground underline-offset-4 truncate block">
                        {model.name}
                      </span>
                    </div>
                    <div className="hidden md:flex col-span-2 text-xs text-muted-foreground font-mono">
                      {model.context_length >= 1000 ? `${Math.round(model.context_length / 1000)}K` : model.context_length}
                    </div>
                    <div className="hidden md:flex col-span-2 text-xs text-muted-foreground">
                      {model.created ? new Date(model.created * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "—"}
                    </div>
                    <div className="col-span-6 md:col-span-2 text-right text-[10px] flex flex-col gap-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-muted-foreground font-medium">in</span>
                        <span className="text-foreground font-mono">
                          {currency === "sats" ? (model.sats_pricing.prompt * 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) : (model.pricing.prompt * 1_000_000).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{priceUnit}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-muted-foreground font-medium">out</span>
                        <span className="text-foreground font-mono">
                          {currency === "sats" ? (model.sats_pricing.completion * 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) : (model.pricing.completion * 1_000_000).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{priceUnit}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-20 text-center text-muted-foreground text-sm border-b border-border/30">No models available for this provider.</div>
              )}
            </div>
          </div>

          <div className="mt-20">
            {provider && <ProviderReviews providerNpub={formatPublicKey(provider.pubkey)} />}
          </div>
        </div>
      </main>
      <div className="max-w-5xl mx-auto w-full">
        <Footer />
      </div>
    </div>
  );
}
