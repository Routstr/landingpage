"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { fetchProviders, providers as providersState, ProviderSummary } from "@/app/data/providers";

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
      await fetchProviders();
      if (!active) return;
      setItems(providersState);
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />
      
      <main className="flex-grow">
        <div className="py-12 border-b border-white/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-6">
                <Link 
                  href="/" 
                  className="text-gray-400 hover:text-white mr-4 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back to home
                </Link>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">AI Providers</h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8">
                Browse {items.length} AI providers available through Routstr&apos;s decentralized marketplace.
              </p>
            </div>
          </div>
        </div>
        
        <div className="py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="max-w-4xl mx-auto border border-white/10 rounded-lg overflow-hidden">
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
              <div className="max-w-4xl mx-auto border border-white/10 rounded-lg overflow-hidden">
                <ul className="divide-y divide-white/10">
                  {items.map((provider) => (
                    <li key={provider.id}>
                      <Link
                        href={`/providers/${provider.id}`}
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
                            <p className="text-gray-400 mb-4">{provider.description}</p>
                            <div className="mt-auto">
                              <div className="text-sm text-gray-500">
                                <span className="text-gray-400 font-medium">Available models:</span> {provider.supported_models.slice(0, 3).join(", ")}
                                {provider.supported_models.length > 3 && "..."}
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                {provider.endpoints.http[0] || provider.endpoints.tor[0]}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="py-12 bg-white/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-6">Integrate with Any Provider</h2>
              <p className="text-gray-300 mb-8">
                Routstr gives you a single API to access all providers, with automatic routing to the best available option based on your criteria.
              </p>
              
              <div className="mb-8">
                <div className="bg-black border border-white/10 rounded-lg p-4 inline-block">
                  <code className="font-mono text-sm">npm install @routstr/sdk</code>
                </div>
              </div>
              
              <Link
                href="/models"
                className="inline-flex items-center justify-center rounded-md bg-white text-black px-6 py-3 text-sm font-medium transition-colors hover:bg-gray-200"
              >
                Explore Models
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}