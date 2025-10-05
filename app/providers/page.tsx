"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { fetchProviders, providers as providersState, ProviderSummary } from "@/app/data/providers";
import { fetchModels, getModelsByProvider } from "@/app/data/models";

function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse bg-white/10 rounded ${className}`} />
  );
}

export default function ProvidersPage() {
  const [items, setItems] = useState<ProviderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      await Promise.all([
        fetchProviders(),
        fetchModels(),
      ]);
      if (!active) return;
      setItems(providersState);
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [] as ProviderSummary[];
    const getModelCount = (providerId: string) => {
      const models = getModelsByProvider(providerId);
      return models.length;
    };
    return [...items].sort((a, b) => getModelCount(b.id) - getModelCount(a.id));
  }, [items]);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />
      
      <main className="flex-grow">
        <div className="pt-8 sm:pt-16 pb-16 bg-black">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              
              
              <h1 className="text-2xl sm:text-4xl font-bold mb-6">Providers</h1>
              <p className="text-base sm:text-xl text-gray-400 mb-10">
                Browse {items.length} providers available through Routstr&apos;s decentralized marketplace.
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-0 pb-16">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            {isLoading ? (
              <div className="max-w-5xl mx-auto border border-white/10 rounded-lg overflow-hidden">
                <ul className="divide-y divide-white/10">
                  {[...Array(8)].map((_, i) => (
                    <li key={i} className="p-4 sm:p-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-5 w-5 shrink-0" />
                          </div>
                          <Skeleton className="h-4 w-full mb-4" />
                          <div className="flex flex-wrap gap-2 mb-3">
                            {[...Array(3)].map((_, idx) => (
                              <Skeleton key={idx} className="h-6 w-16 rounded-full" />
                            ))}
                          </div>
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto border border-white/10 rounded-lg overflow-hidden">
                <ul className="divide-y divide-white/10">
                  {sortedItems.map((provider) => {
                    const models = getModelsByProvider(provider.id);
                    const modelCount = models.length;
                    return (
                      <li key={provider.id}>
                        <Link
                          href={`/providers/${encodeURIComponent(provider.id)}`}
                          className="block p-4 sm:p-6 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                          aria-label={`View ${provider.name}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <h3 className="text-lg sm:text-xl font-bold text-white truncate">{provider.name}</h3>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white/70 shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-300">
                                  {modelCount} {modelCount === 1 ? 'model' : 'models'}
                                </span>
                                {provider.version && (
                                  <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-300">
                                    v{provider.version}
                                  </span>
                                )}
                              </div>

                              <p className="text-gray-400 mb-4">{provider.description}</p>
                              <div className="mt-auto">
                                <div className="text-sm text-gray-500">
                                  <span className="text-gray-400 font-medium">models:</span> {provider.supported_models.slice(0, 3).join(", ")}
                                  {provider.supported_models.length > 3 && "..."}
                                </div>
                                
                              </div>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        
      </main>
      
      <Footer />
    </div>
  );
}