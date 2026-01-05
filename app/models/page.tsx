"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  models as modelsState,
  getProviderFromModelName,
  fetchModels,
  getModelNameWithoutProvider,
  getModelDisplayName,
  getPrimaryProviderForModel,
  Model,
} from "@/app/data/models";
import { usePricingView } from "@/app/contexts/PricingContext";
import { CurrencyTabs } from "@/components/ui/currency-tabs";
import { ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";

export default function ModelsPage() {
  const { currency } = usePricingView();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: "name" | "context" | "input" | "output";
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });

  const [items, setItems] = useState<Model[]>([]);
  const [modelProvidersKV, setModelProvidersKV] = useState<
    Record<string, Array<{ name: string; price: number }>>
  >({});
  const [isLoading, setIsLoading] = useState(true);

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
            // Deduplicate models based on Name (not ID) to group same models
            const currentNames = new Set(prevItems.map((m) => m.name));
            const uniqueNewModels = newModels.filter(
              (m) => !currentNames.has(m.name)
            );
            return [...prevItems, ...uniqueNewModels];
          });

          setModelProvidersKV((prev) => {
            const next = { ...prev };
            // For each model in this batch, add the provider to its list
            for (const model of newModels) {
              const modelProviderName = provider.name;
              // Use completion price as the sorting metric (cheaper is better)
              const price = model.sats_pricing?.completion ?? 0;

              const existing = next[model.name] || [];
              const alreadyExists = existing.some(
                (p) => p.name === modelProviderName
              );

              if (!alreadyExists) {
                next[model.name] = [
                  ...existing,
                  { name: modelProviderName, price },
                ].sort((a, b) => a.price - b.price);
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

  // Filter and sort models
  const filteredModels = items
    .filter((model) => {
      const matchesSearch =
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case "name":
          comparison = getModelNameWithoutProvider(a.name).localeCompare(
            getModelNameWithoutProvider(b.name)
          );
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
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ column }: { column: typeof sortConfig.key }) => {
    if (sortConfig.key !== column)
      return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4 shrink-0" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 shrink-0" />
    );
  };

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <section className="pt-8 sm:pt-16 pb-16 bg-black">
        <div className="px-4 md:px-6 max-w-5xl mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold">Models</h1>
                <p className="text-base sm:text-xl text-gray-400 mt-2">
                  Browse and compare {items.length} AI models
                </p>
              </div>
              <CurrencyTabs />
            </div>

            {isLoading && items.length === 0 ? (
              <>
                {/* Search skeleton */}
                <div className="mb-10 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Skeleton className="w-full h-11" />
                  </div>
                </div>

                {/* Models Table Skeleton */}
                <div className="border border-white/10 rounded-lg overflow-hidden bg-black">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-gray-400 text-xs">
                        <tr>
                          <th className="px-6 py-3 font-medium">Model</th>
                          <th className="px-6 py-3 font-medium">Provider</th>
                          <th className="px-6 py-3 font-medium">Context</th>
                          <th className="px-6 py-3 font-medium text-right">
                            Input
                          </th>
                          <th className="px-6 py-3 font-medium text-right">
                            Output
                          </th>
                          <th className="px-6 py-3 font-medium sr-only">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {[...Array(10)].map((_, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4">
                              <Skeleton className="h-5 w-48" />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton className="h-4 w-32" />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton className="ml-auto h-4 w-20" />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton className="ml-auto h-4 w-20" />
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton className="ml-auto h-5 w-5" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Search */}
                <div className="mb-10 flex flex-col md:flex-row gap-4">
                  <div className="flex-1 flex">
                    <input
                      type="text"
                      placeholder="Search models..."
                      className="w-full h-11 px-4 py-2 bg-black border border-white/20 rounded-md text-white focus:outline-none focus:ring-0 focus:border-white/20"
                      style={{ minHeight: 44, maxHeight: 44 }}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Models Table */}
                <div className="border border-white/10 rounded-lg overflow-hidden bg-black">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-gray-400 text-xs text-left">
                        <tr>
                          <th
                            className="px-6 py-3 font-medium cursor-pointer hover:text-white group select-none"
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center">
                              Model
                              <SortIcon column="name" />
                            </div>
                          </th>
                          <th className="px-6 py-3 font-medium select-none">
                            <div className="flex items-center">Provider</div>
                          </th>
                          <th
                            className="px-6 py-3 font-medium cursor-pointer hover:text-white group select-none"
                            onClick={() => handleSort("context")}
                          >
                            <div className="flex items-center">
                              Context
                              <SortIcon column="context" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 font-medium text-right cursor-pointer hover:text-white group select-none"
                            onClick={() => handleSort("input")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Input
                              <SortIcon column="input" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 font-medium text-right cursor-pointer hover:text-white group select-none"
                            onClick={() => handleSort("output")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Output
                              <SortIcon column="output" />
                            </div>
                          </th>
                          <th className="px-6 py-3 font-medium sr-only">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredModels.length > 0 ? (
                          filteredModels.map((model, index) => {
                            const providersData = modelProvidersKV[
                              model.name
                            ] || [
                              {
                                name: getProviderFromModelName(model.name),
                                price: 0,
                              },
                            ];
                            const modelName = getModelDisplayName(model);

                            // Logic to display providers
                            // Pick top 2, maybe 3 if brief, else show +X
                            // Use text-ellipsis for safety
                            let displayedProviders = "";
                            if (providersData.length <= 2) {
                              displayedProviders = providersData
                                .map((p) => p.name)
                                .join(", ");
                            } else {
                              displayedProviders = `${providersData
                                .slice(0, 2)
                                .map((p) => p.name)
                                .join(", ")}, +${providersData.length - 2}`;
                            }

                            const allProvidersString = providersData
                              .map((p) => p.name)
                              .join(", ");

                            return (
                              <tr
                                key={`${model.id}-${index}`}
                                className="group hover:bg-white/5 transition-colors cursor-pointer"
                              >
                                <td className="px-6 py-4">
                                  <Link
                                    href={`/models/${model.id.replace(
                                      "/",
                                      "/"
                                    )}`}
                                    className="block font-medium text-white group-hover:text-blue-400 transition-colors"
                                  >
                                    {model.name || modelName}
                                  </Link>
                                </td>
                                <td
                                  className="px-6 py-4 text-gray-400 max-w-[200px] truncate"
                                  title={allProvidersString}
                                >
                                  {displayedProviders}
                                </td>
                                <td className="px-6 py-4 text-gray-400">
                                  {model.context_length >= 1000
                                    ? `${Math.round(
                                        model.context_length / 1000
                                      )}K`
                                    : model.context_length.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-400 font-mono">
                                  {currency === "sats"
                                    ? (
                                        model.sats_pricing.prompt * 1_000_000
                                      ).toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                      }) + " sats"
                                    : "$" +
                                      (
                                        model.pricing.prompt * 1_000_000
                                      ).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-400 font-mono">
                                  {currency === "sats"
                                    ? (
                                        model.sats_pricing.completion *
                                        1_000_000
                                      ).toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                      }) + " sats"
                                    : "$" +
                                      (
                                        model.pricing.completion * 1_000_000
                                      ).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Link
                                    href={`/models/${model.id.replace(
                                      "/",
                                      "/"
                                    )}`}
                                    className="text-white/40 hover:text-white transition-colors"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="w-5 h-5 ml-auto"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                      />
                                    </svg>
                                  </Link>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-10 text-center text-gray-500"
                            >
                              No models found matching your criteria
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
