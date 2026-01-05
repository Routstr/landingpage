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
import { CurrencyTabs } from "@/components/ui/currency-tabs";
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

export default function ProviderPage() {
  const { currency } = usePricingView();
  const params = useParams();
  const providerId = (() => {
    const raw = (params?.id as string) || "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderType | null>(null);
  const [providerModels, setProviderModels] = useState<Model[]>([]);
  const [sort, setSort] = useState<{
    key: "name" | "price" | "context" | "created";
    direction: "asc" | "desc";
  }>({ key: "price", direction: "asc" });

  function requestSort(nextKey: "name" | "price" | "context" | "created") {
    setSort((prev) => {
      if (prev.key === nextKey) {
        return {
          key: nextKey,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key: nextKey, direction: "asc" };
    });
  }

  const sortedModels = useMemo(() => {
    if (!providerModels || providerModels.length === 0) return providerModels;
    const copy = [...providerModels];
    copy.sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      if (sort.key === "name") {
        return a.name.localeCompare(b.name) * direction;
      }
      if (sort.key === "price") {
        const aVal =
          currency === "sats"
            ? a.sats_pricing?.completion ?? 0
            : a.pricing?.completion ?? 0;
        const bVal =
          currency === "sats"
            ? b.sats_pricing?.completion ?? 0
            : b.pricing?.completion ?? 0;
        return (aVal - bVal) * direction;
      }
      if (sort.key === "context") {
        return (a.context_length - b.context_length) * direction;
      }
      // created
      return (a.created - b.created) * direction;
    });
    return copy;
  }, [providerModels, sort, currency]);

  function SortIcon({
    active,
    direction,
  }: {
    active: boolean;
    direction: "asc" | "desc";
  }) {
    return (
      <span
        aria-hidden
        className="ml-1 inline-block align-middle text-white/50"
      >
        {active ? (
          direction === "asc" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 01.832.445l4 6a1 1 0 11-1.664 1.11L10 5.882 6.832 10.555a1 1 0 11-1.664-1.11l4-6A1 1 0 0110 3z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M10 17a1 1 0 01-.832-.445l-4-6a1 1 0 111.664-1.11L10 14.118l3.168-4.673a1 1 0 111.664 1.11l-4 6A1 1 0 0110 17z"
                clipRule="evenodd"
              />
            </svg>
          )
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5 opacity-50"
          >
            <path d="M10 3l4 6H6l4-6zM6 11h8l-4 6-4-6z" />
          </svg>
        )}
      </span>
    );
  }

  useEffect(() => {
    let isActive = true;
    async function load() {
      setIsLoading(true);
      // Try existing in-memory data first
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
            <p className="text-gray-400 mb-6">
              The provider you&#39;re looking for doesn&#39;t exist.
            </p>
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
        <div className="pt-8 sm:pt-12 pb-12 border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center mb-6">
                <BackButton
                  fallbackHref="/providers"
                  className="text-gray-400 hover:text-white mr-4 flex items-center"
                  ariaLabel="Go back"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 mr-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                    />
                  </svg>
                  Back
                </BackButton>
              </div>

              {isLoading ? (
                <>
                  <Skeleton className="h-8 sm:h-10 w-56 mb-3 sm:mb-4" />
                  <Skeleton className="h-5 w-3/4 mb-6 sm:mb-8" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">
                    {provider?.name}
                  </h1>
                  <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8">
                    {provider?.description}
                  </p>
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
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-sm"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-3 mb-6">
                      <InfoPill
                        label="Endpoint"
                        value={provider.endpoint_url}
                      />
                      {(() => {
                        const urls =
                          provider.mint_urls && provider.mint_urls.length > 0
                            ? provider.mint_urls
                            : provider.mint_url
                            ? [provider.mint_url]
                            : [];
                        return urls.length > 0 ? (
                          <MintsPill mints={urls} />
                        ) : null;
                      })()}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>

        <div className="pt-8 sm:pt-12 pb-12">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between gap-3 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Models</h2>
                <CurrencyTabs />
              </div>

              <div className="border border-white/10 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th
                        className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300"
                        aria-sort={
                          sort.key === "name"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex items-center hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                          onClick={() => requestSort("name")}
                          disabled={isLoading}
                        >
                          Model
                          <SortIcon
                            active={sort.key === "name"}
                            direction={sort.direction}
                          />
                        </button>
                      </th>
                      <th
                        className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300"
                        aria-sort={
                          sort.key === "price"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex items-center hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                          onClick={() => requestSort("price")}
                          disabled={isLoading}
                        >
                          Price (
                          {currency === "sats"
                            ? "sats per M tokens"
                            : "USD per M tokens"}
                          )
                          <SortIcon
                            active={sort.key === "price"}
                            direction={sort.direction}
                          />
                        </button>
                      </th>
                      <th
                        className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300"
                        aria-sort={
                          sort.key === "context"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex items-center hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                          onClick={() => requestSort("context")}
                          disabled={isLoading}
                        >
                          Context
                          <SortIcon
                            active={sort.key === "context"}
                            direction={sort.direction}
                          />
                        </button>
                      </th>
                      <th
                        className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300"
                        aria-sort={
                          sort.key === "created"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex items-center hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                          onClick={() => requestSort("created")}
                          disabled={isLoading}
                        >
                          Created
                          <SortIcon
                            active={sort.key === "created"}
                            direction={sort.direction}
                          />
                        </button>
                      </th>
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
                    ) : sortedModels.length > 0 ? (
                      sortedModels.map((model) => (
                        <tr
                          key={`${providerId}-${model.id}`}
                          className="bg-black hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-white">
                            <Link
                              href={`/models/${model.id}`}
                              className="hover:text-gray-300"
                            >
                              {model.name}
                            </Link>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-300">
                            {currency === "sats"
                              ? `${
                                  model.sats_pricing.prompt > 0
                                    ? (
                                        model.sats_pricing.prompt * 1_000_000
                                      ).toFixed(2)
                                    : "—"
                                } / ${
                                  model.sats_pricing.completion > 0
                                    ? (
                                        model.sats_pricing.completion *
                                        1_000_000
                                      ).toFixed(2)
                                    : "—"
                                }`
                              : `$${(model.pricing.prompt * 1_000_000).toFixed(
                                  2
                                )} / $${(
                                  model.pricing.completion * 1_000_000
                                ).toFixed(2)}`}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-300">
                            {model.context_length.toLocaleString()} tokens
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(
                              model.created * 1000
                            ).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 sm:px-6 py-8 text-center text-gray-400"
                        >
                          No models available for this provider
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Reviews Section */}
              {provider ? (
                <ProviderReviews
                  providerNpub={formatPublicKey(provider.pubkey)}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
