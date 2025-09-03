"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { InfoPill } from '@/components/client/InfoPill';
import { fetchModels, getProviderById, getProviderFeatures, getModelsByProvider, type Provider as ProviderType, type Model } from '@/app/data/models';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProviderPage() {
  const params = useParams();
  const providerId = (params?.id as string) || '';

  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderType | null>(null);
  const [providerModels, setProviderModels] = useState<Model[]>([]);

  useEffect(() => {
    let isActive = true;
    async function load() {
      setIsLoading(true);
      // Try existing in-memory data first
      let p = getProviderById(providerId);
      if (!p) {
        await fetchModels();
        p = getProviderById(providerId) || null;
      }
      if (!isActive) return;
      setProvider(p || null);
      setProviderModels(p ? getModelsByProvider(providerId) : []);
      setIsLoading(false);
    }
    if (providerId) load();
    return () => {
      isActive = false;
    };
  }, [providerId]);

  if (!isLoading && !provider) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Provider Not Found</h1>
            <p className="text-gray-400 mb-6">The provider you're looking for doesn't exist.</p>
            <Link href="/providers" className="text-white hover:text-gray-300">
              ← Back to providers
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const features = provider ? getProviderFeatures(provider) : [];

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />
      <main className="flex-grow">
        <div className="py-12 border-b border-white/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-6">
                <Link href="/providers" className="text-gray-400 hover:text-white mr-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back to providers
                </Link>
              </div>

              {isLoading ? (
                <>
                  <Skeleton className="h-8 sm:h-10 w-56 mb-3 sm:mb-4" />
                  <Skeleton className="h-5 w-3/4 mb-6 sm:mb-8" />
                </>
              ) : (
                <>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{provider?.name}</h1>
                  <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8">{provider?.description}</p>
                </>
              )}

              {isLoading ? (
                <>
                  <div className="flex flex-wrap gap-4 mb-6">
                    {[...Array(3)].map((_, idx) => (
                      <Skeleton key={idx} className="h-6 w-20 rounded-full" />
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-3 mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                </>
              ) : (
                provider && (
                  <>
                    <div className="flex flex-wrap gap-4 mb-6">
                      {features.map((feature, index) => (
                        <span key={index} className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-sm">
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-3 mb-6">
                      <InfoPill label="Endpoint" value={provider.endpoint_url} />
                      {provider.mint_url ? <InfoPill label="Mint" value={provider.mint_url} /> : null}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>

        <div className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Available Models</h2>

              <div className="border border-white/10 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300">Model</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300">Price (per 1K tokens, sats)</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300">Context</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={`sk-${i}`} className="bg-black">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-40" />
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-32" />
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-24" />
                          </td>
                        </tr>
                      ))
                    ) : providerModels.length > 0 ? (
                      providerModels.map((model) => (
                        <tr key={`${providerId}-${model.id}`} className="bg-black hover:bg-white/5 transition-colors">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-white">
                            <Link href={`/models/${model.id}` } className="hover:text-gray-300">
                              {model.name}
                            </Link>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-300">
                            {(model.sats_pricing.prompt * 1000).toFixed(2)} / {(model.sats_pricing.completion * 1000).toFixed(2)}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-300">
                            {model.context_length.toLocaleString()} tokens
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(model.created * 1000).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-gray-400">
                          No models available for this provider
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

 
