"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import {
  Model,
  Provider,
  getProviderFromModelName,
  getModelNameWithoutProvider,
} from "@/app/data/models";
import { useModels } from "@/app/contexts/ModelsContext";
import { usePricingView } from "@/app/contexts/PricingContext";
import { CurrencyTabs } from "@/components/ui/currency-tabs";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronsUpDown as ChevronsUpDownIcon,
  Check as CheckIcon,
} from "lucide-react";
import { InfoPill } from "@/components/client/InfoPill";
import { PriceCompChart } from "@/components/client/PriceCompChart";
import ReactMarkdown from "react-markdown";
import { ModelReviews } from "@/components/ModelReviews";
import { getLocalCashuToken, setLocalCashuToken } from "@/utils/storageUtils";
// import ProviderPage from '@/app/providers/[id]/page';
// ProvidersTable removed
// import { UnfoldHorizontal } from 'lucide-react';

// Define types for code examples
type CodeLanguage = "curl" | "javascript" | "python";

// Helper to decode all path segments for display
function decodeSegments(segments: string[]): string[] {
  return segments.map((s) => decodeURIComponent(s));
}

// Removed EndpointData

export default function ModelDetailPage() {
  const params = useParams();
  const { currency } = usePricingView();
  const {
    models,
    loading,
    error,
    fetchModels,
    findModel,
    getProvidersForModelCheapestFirst,
    modelProviderEntries,
  } = useModels();
  const [providersForModel, setProvidersForModel] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [pricingSelectorOpen, setPricingSelectorOpen] = useState(false);
  const [apiSelectorOpen, setApiSelectorOpen] = useState(false);

  // Handle the catch-all route by joining the path segments
  const modelIdParts = params.modelId as string[];

  // Decoded for display and for model lookup
  const decodedModelIdParts = decodeSegments(modelIdParts);
  const decodedModelId = decodedModelIdParts.join("/");

  const [activeTab, setActiveTab] = useState<CodeLanguage>("curl");
  const [model, setModel] = useState<Model | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tokenInput, setTokenInput] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [descExpanded, setDescExpanded] = useState<boolean>(false);

  // Compute storage base URL from current provider selection (fallback to default)
  const storageBaseUrl = (() => {
    const selected =
      providersForModel.find((p) => p.id === selectedProviderId) ||
      providersForModel[0];
    const base = selected?.endpoint_url || "";
    if (!base) return "https://api.routstr.com";
    return base.replace(/\/v1$/, "");
  })();

  // Always call this hook (no conditional returns before), but no-op if base is empty
  useEffect(() => {
    try {
      const existing = getLocalCashuToken(storageBaseUrl) || "";
      setTokenInput(existing);
    } catch {
      // no-op
    }
  }, [storageBaseUrl]);

  useEffect(() => {
    async function loadModelData() {
      try {
        // Try to find the model using the decoded model ID
        let foundModel = findModel(decodedModelId);

        if (!foundModel && models.length === 0) {
          // If model is not found and no models loaded, try to fetch fresh data from API
          await fetchModels();
          foundModel = findModel(decodedModelId);
        }

        if (foundModel) {
          setModel(foundModel);
          setNotFound(false);
          setProvidersForModel(
            getProvidersForModelCheapestFirst(foundModel.id)
          );
          const p = getProvidersForModelCheapestFirst(foundModel.id);
          if (p && p.length > 0) {
            setSelectedProviderId((prev) => prev || p[0].id);
          }

          // Removed external endpoints fetch

          // Removed BTC price fetch (unused)
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error loading model data:", error);
        setNotFound(true);
      }
    }

    loadModelData();
  }, [
    decodedModelId,
    models,
    findModel,
    fetchModels,
    getProvidersForModelCheapestFirst,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Back link skeleton */}
            <div className="h-6 w-32 bg-zinc-800 rounded-md mb-6 animate-pulse"></div>

            {/* Hero section skeleton */}
            <div className="mb-6 md:mb-10 bg-gradient-to-r from-black to-zinc-900 rounded-xl p-4 md:p-8 border border-zinc-800">
              <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-6 mb-3 md:mb-6">
                <div className="w-full md:w-2/3">
                  <div className="h-10 w-64 bg-zinc-800 rounded-md mb-2 animate-pulse"></div>
                  <div className="h-6 w-40 bg-zinc-800 rounded-md mb-4 animate-pulse"></div>
                </div>
                <div className="h-10 w-32 bg-zinc-800 rounded-md animate-pulse self-start"></div>
              </div>

              <div className="space-y-2">
                <div className="h-4 bg-zinc-800 rounded-md animate-pulse w-full"></div>
                <div className="h-4 bg-zinc-800 rounded-md animate-pulse w-5/6"></div>
                <div className="h-4 bg-zinc-800 rounded-md animate-pulse w-4/6"></div>
              </div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-black/50 border border-zinc-800 rounded-lg p-4"
                >
                  <div className="h-3 w-20 bg-zinc-800 rounded-md mb-2 animate-pulse"></div>
                  <div className="h-6 w-16 bg-zinc-800 rounded-md mb-1 animate-pulse"></div>
                  <div className="h-3 w-24 bg-zinc-800 rounded-md animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Technical specs skeleton */}
            <div className="p-6 bg-black/50 border border-zinc-800 rounded-lg mb-10">
              <div className="h-6 w-48 bg-zinc-800 rounded-md mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="border-b border-zinc-700 py-3 flex justify-between"
                  >
                    <div className="h-4 w-32 bg-zinc-800 rounded-md animate-pulse"></div>
                    <div className="h-4 w-48 bg-zinc-800 rounded-md animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing skeleton */}
            <div className="bg-black/50 border border-zinc-800 p-6 mb-10">
              <div className="h-6 w-40 bg-zinc-800 rounded-md mb-4 animate-pulse"></div>
              <div className="bg-black/30 border border-zinc-700 rounded-lg p-5 mb-6">
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="border-b border-zinc-700 py-2 flex justify-between"
                    >
                      <div className="h-4 w-24 bg-zinc-800 rounded-md animate-pulse"></div>
                      <div className="h-4 w-32 bg-zinc-800 rounded-md animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="h-5 w-56 bg-zinc-800 rounded-md mb-2 animate-pulse"></div>
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-3 bg-zinc-800 rounded-md animate-pulse w-full"
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            {/* API integration skeleton */}
            <div className="bg-black/50 border border-zinc-800 p-6 mb-12">
              <div className="h-6 w-36 bg-zinc-800 rounded-md mb-4 animate-pulse"></div>
              <div className="h-4 w-full bg-zinc-800 rounded-md mb-6 animate-pulse"></div>

              <div className="flex space-x-1 mb-4 border-b border-zinc-700">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-24 bg-zinc-800 rounded-t-lg animate-pulse"
                  ></div>
                ))}
              </div>

              <div className="bg-black/70 rounded-lg p-4 border border-zinc-700 h-48 animate-pulse"></div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded bg-black/30 p-3 border border-zinc-800"
                  >
                    <div className="h-4 w-32 bg-zinc-800 rounded-md mb-2 animate-pulse"></div>
                    <div className="h-3 w-full bg-zinc-800 rounded-md animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl font-bold mb-4">
              Error Loading Models
            </h1>
            <p className="text-base sm:text-xl text-gray-300 mb-6">{error}</p>
            <Link href="/models" className="text-white underline">
              Back to models
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl font-bold mb-4">
              Model Not Found
            </h1>
            <p className="text-base sm:text-xl text-gray-300 mb-6">
              The model you&apos;re looking for doesn&apos;t exist or is not
              available.
            </p>
            <Link href="/models" className="text-white underline">
              View all models
            </Link>

            <div className="mt-8 p-4 bg-gray-900 border border-white/10 rounded-md text-left text-xs overflow-auto max-w-xl mx-auto">
              <p>Looking for model with ID: {decodedModelId}</p>
              <p>Path segments: {decodedModelIdParts.join(" → ")}</p>
              <p>Total models available: {models.length}</p>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Guard against transient state where model isn't set yet
  if (!model) {
    return null;
  }

  const provider = getProviderFromModelName(model.name);
  const selectedProvider =
    providersForModel.find((p) => p.id === selectedProviderId) ||
    providersForModel[0];
  const activeProviderEntry = (() => {
    const entries = modelProviderEntries.get(model.id) || [];
    return entries.find((e) => e.provider.id === selectedProviderId) || null;
  })();
  const activePricingModel = activeProviderEntry?.model || model;
  const providerBaseUrl = (() => {
    const base = selectedProvider?.endpoint_url || "";
    if (!base) return "";
    return base.endsWith("/v1") ? base : `${base.replace(/\/$/, "")}/v1`;
  })();

  const doCopy = async () => {
    try {
      const tokenForCode = (tokenInput ?? "").trim();
      let code = "";
      if (activeTab === "curl") {
        code = `curl -X POST ${
          providerBaseUrl || "https://api.routstr.com/v1"
        }/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${tokenForCode}" \\\n  -d '{\n    "model": "${
          model?.id
        }",\n    "messages": [\n      { "role": "user", "content": "Hello Nostr" }\n    ]\n  }'\n`;
      } else if (activeTab === "javascript") {
        code = `import OpenAI from 'openai';\n\nconst openai = new OpenAI({\n  baseURL: '${
          providerBaseUrl || "https://api.routstr.com/v1"
        }',\n  apiKey: '${tokenForCode}'\n});\n\nasync function main() {\n  const completion = await openai.chat.completions.create({\n    model: '${
          model?.id
        }',\n    messages: [\n      { role: 'user', content: 'Hello Nostr' }\n    ]\n  });\n  console.log(completion.choices[0].message);\n}\n\nmain();\n`;
      } else {
        code = `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="${
          providerBaseUrl || "https://api.routstr.com/v1"
        }",\n    api_key="${tokenForCode}"\n)\n\ncompletion = client.chat.completions.create(\n    model="${
          model?.id
        }",\n    messages=[\n        {"role": "user", "content": "Hello Nostr"}\n    ]\n)\nprint(completion.choices[0].message.content)\n`;
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  const displayName = getModelNameWithoutProvider(model.name);

  // API code examples for this specific model
  const codeExamples = {
    curl: `curl -X POST ${
      providerBaseUrl || "https://api.routstr.com/v1"
    }/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer cashuBpGFteCJodHRwczovL21p..." \\
  -d '{
    "model": "${model.id}",
    "messages": [
      {
        "role": "user", 
        "content": "Hello Nostr"
      }
    ]
  }'`,

    javascript: `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: '${providerBaseUrl || "https://api.routstr.com/v1"}',
  apiKey: 'cashuBpGFteCJodHRwczovL21p...' 
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: '${model.id}',
    messages: [
      { role: 'user', content: 'Hello Nostr' }
    ]
  });
  console.log(completion.choices[0].message);
}

main();`,

    python: `from openai import OpenAI

client = OpenAI(
    base_url="${providerBaseUrl || "https://api.routstr.com/v1"}",
    api_key="cashuBpGFteCJodHRwczovL21p..." 
)

completion = client.chat.completions.create(
    model="${model.id}",
    messages=[
        {"role": "user", "content": "Hello Nostr"}
    ]
)
print(completion.choices[0].message.content)`,
  };

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <section className="py-12 bg-black">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <BackButton
              fallbackHref="/models"
              className="text-gray-300 hover:text-white flex items-center gap-2 mb-6"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              Back
            </BackButton>

            {/* Hero section */}
            <div className="mb-6 md:mb-10 bg-gradient-to-r from-black to-zinc-900 rounded-xl p-4 md:p-8 border border-zinc-800">
              <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-6 mb-3 md:mb-6">
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-white">
                    {displayName}
                  </h1>
                  <p className="text-base md:text-xl text-gray-300 mb-2 md:mb-4">
                    by {provider}
                  </p>
                  <div className="mb-4">
                    <InfoPill label="Model ID" value={model.id} />
                  </div>
                </div>
                <a
                  href={`https://chat.routstr.com/?model=${encodeURIComponent(
                    model.id
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 md:py-3 bg-white text-black rounded-md font-medium hover:bg-gray-200 transition-colors self-start"
                >
                  Try It Now
                </a>
              </div>

              <div
                id="model-description"
                className="prose prose-invert max-w-none relative transition-all"
                style={{
                  maxHeight: descExpanded ? ("none" as const) : "10.5rem",
                  overflow: descExpanded ? "visible" : "hidden",
                  WebkitMaskImage: descExpanded
                    ? undefined
                    : "linear-gradient(to bottom, black 65%, transparent 100%)",
                  maskImage: descExpanded
                    ? undefined
                    : "linear-gradient(to bottom, black 65%, transparent 100%)",
                }}
              >
                <ReactMarkdown
                  components={{
                    a: (props) => (
                      <a
                        {...props}
                        className="underline hover:text-gray-300 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    ),
                  }}
                >
                  {model.description}
                </ReactMarkdown>
              </div>
              {model.description && model.description.length > 240 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                    aria-expanded={descExpanded}
                    aria-controls="model-description"
                  >
                    {descExpanded ? "Show less" : "Show more"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={descExpanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {/* Providers offering this model */}
            {/* Providers offering this model */}
            {providersForModel.length > 0 && (
              <div className="mb-12">
                <PriceCompChart
                  data={providersForModel.map((p) => {
                    // Find pricing for this provider's model entry
                    const entry = modelProviderEntries
                      .get(model.id)
                      ?.find((e) => e.provider.id === p.id);
                    const pricing = entry?.model.sats_pricing;

                    return {
                      providerName: p.name,
                      promptPrice: (pricing?.prompt || 0) * 1_000_000,
                      completionPrice: (pricing?.completion || 0) * 1_000_000,
                    };
                  })}
                  currencyLabel="sats / 1M tokens"
                />
              </div>
            )}

            {/* Endpoints table removed */}

            {/* Model Details */}
            <Card className="p-6 bg-black/50 border border-white/10 rounded-lg mb-10">
              <h2 className="text-xl font-bold mb-4 text-white">
                Technical Specifications
              </h2>
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Model ID</td>
                    <td className="py-3 font-medium text-white">{model.id}</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Provider</td>
                    <td className="py-3 font-medium text-white">{provider}</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Created</td>
                    <td className="py-3 font-medium text-white">
                      {formatDate(model.created)}
                    </td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Context length</td>
                    <td className="py-3 font-medium text-white">
                      {model.context_length.toLocaleString()} tokens
                    </td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Modality</td>
                    <td className="py-3 font-medium text-white">
                      {model.architecture.modality}
                    </td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Input Modalities</td>
                    <td className="py-3 font-medium text-white">
                      {model.architecture.input_modalities.join(", ")}
                    </td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Output Modalities</td>
                    <td className="py-3 font-medium text-white">
                      {model.architecture.output_modalities.join(", ")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-300">Tokenizer</td>
                    <td className="py-3 font-medium text-white">
                      {model.architecture.tokenizer}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* Pricing Section */}
            <Card className="bg-black/50 border border-white/10 p-6 mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
                <h2 className="text-xl font-bold text-white">
                  Pricing Information
                </h2>
                <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
                  <CurrencyTabs />
                  {providersForModel.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Provider</span>
                      <Popover
                        open={pricingSelectorOpen}
                        onOpenChange={setPricingSelectorOpen}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex w-full sm:w-56 items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 sm:py-1.5 text-left text-sm text-white hover:bg-white/10"
                            aria-label="Select provider for pricing"
                          >
                            <span className="truncate">
                              {selectedProvider?.name || "Select provider"}
                            </span>
                            <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-70" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[90vw] sm:w-56 p-2 sm:p-1 bg-black text-white border-white/10">
                          <div
                            role="listbox"
                            aria-label="Select provider"
                            className="max-h-[60vh] sm:max-h-64 overflow-y-auto"
                          >
                            {providersForModel.map((p) => {
                              const isActive = p.id === selectedProviderId;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isActive}
                                  onClick={() => {
                                    setSelectedProviderId(p.id);
                                    setPricingSelectorOpen(false);
                                  }}
                                  className={`flex w-full items-center gap-2 rounded px-3 py-3 sm:py-2 text-left text-sm hover:bg-white/10 ${
                                    isActive ? "bg-white/10" : ""
                                  }`}
                                >
                                  <CheckIcon
                                    className={`h-4 w-4 ${
                                      isActive ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <span className="truncate">{p.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="bg-black/30 border border-white/10 rounded-lg p-5 mb-6">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-white/10">
                      <td className="py-2 text-gray-300">Input cost</td>
                      <td className="py-2 font-medium text-white text-right">
                        {currency === "sats"
                          ? `${
                              activePricingModel.sats_pricing.prompt > 0
                                ? (
                                    1 / activePricingModel.sats_pricing.prompt
                                  ).toFixed(2)
                                : "—"
                            } tokens/sat`
                          : `$${(
                              activePricingModel.pricing.prompt * 1_000_000
                            ).toFixed(2)}/M tokens`}
                      </td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 text-gray-300">Output cost</td>
                      <td className="py-2 font-medium text-white text-right">
                        {currency === "sats"
                          ? `${
                              activePricingModel.sats_pricing.completion > 0
                                ? (
                                    1 /
                                    activePricingModel.sats_pricing.completion
                                  ).toFixed(2)
                                : "—"
                            } tokens/sat`
                          : `$${(
                              activePricingModel.pricing.completion * 1_000_000
                            ).toFixed(2)}/M tokens`}
                      </td>
                    </tr>
                    {currency === "sats" &&
                      activePricingModel.sats_pricing.request > 0 && (
                        <tr className="border-b border-white/10">
                          <td className="py-2 text-gray-300">Request fee</td>
                          <td className="py-2 font-medium text-white text-right">
                            {activePricingModel.sats_pricing.request.toFixed(8)}{" "}
                            sats/request
                          </td>
                        </tr>
                      )}
                    {currency === "sats" &&
                      activePricingModel.sats_pricing.image > 0 && (
                        <tr className="border-b border-white/10">
                          <td className="py-2 text-gray-300">Image fee</td>
                          <td className="py-2 font-medium text-white text-right">
                            {activePricingModel.sats_pricing.image.toFixed(8)}{" "}
                            sats/image
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* API Section */}
            <Card className="bg-black/50 border border-white/10 p-6 mb-12">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-white">
                  API Integration
                </h2>
                {providersForModel.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Provider</span>
                    <Popover
                      open={apiSelectorOpen}
                      onOpenChange={setApiSelectorOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex w-full sm:w-56 items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 sm:py-1.5 text-left text-sm text-white hover:bg-white/10"
                          aria-label="Select provider for API base URL"
                        >
                          <span className="truncate">
                            {selectedProvider?.name || "Select provider"}
                          </span>
                          <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-70" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[90vw] sm:w-56 p-2 sm:p-1 bg-black text-white border-white/10">
                        <div
                          role="listbox"
                          aria-label="Select provider"
                          className="max-h-[60vh] sm:max-h-64 overflow-y-auto"
                        >
                          {providersForModel.map((p) => {
                            const isActive = p.id === selectedProviderId;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onClick={() => {
                                  setSelectedProviderId(p.id);
                                  setApiSelectorOpen(false);
                                }}
                                className={`flex w-full items-center gap-2 rounded px-3 py-3 sm:py-2 text-left text-sm hover:bg-white/10 ${
                                  isActive ? "bg-white/10" : ""
                                }`}
                              >
                                <CheckIcon
                                  className={`h-4 w-4 ${
                                    isActive ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <span className="truncate">{p.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : null}
              </div>
              <p className="text-sm text-gray-200 mb-6">
                Access{" "}
                <span className="font-semibold text-white">{displayName}</span>{" "}
                with a simple API call using your Cashu token for
                authentication.
              </p>

              {/* Language tabs */}
              <div className="flex space-x-1 mb-4 border-b border-white/10 overflow-x-auto">
                {(Object.keys(codeExamples) as CodeLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg whitespace-nowrap ${
                      activeTab === lang
                        ? "text-white bg-white/10 border-b-2 border-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => setActiveTab(lang)}
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </button>
                ))}
              </div>

              {/* Code example with inline token inputs and copy */}
              <div className="relative group bg-black/70 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    doCopy();
                  }}
                  className="absolute top-1.5 sm:top-2 right-2 inline-flex items-center gap-1 rounded bg-black/80 border border-white/20 px-2 py-1 text-[10px] sm:text-xs text-white shadow-md hover:bg-black/90 sm:bg-white/10 sm:border-white/10 sm:hover:bg-white/20"
                  aria-label="Copy code"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-3 w-3"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  {copied ? "Copied" : "Copy"}
                </button>

                <div className="p-3 sm:p-4 pr-10 overflow-x-auto">
                  {activeTab === "curl" ? (
                    <pre className="text-xs sm:text-sm leading-6 whitespace-pre font-mono text-white">
                      <code>
                        <span className="text-[#61afef]">curl</span>
                        {" -X POST "}
                        <span className="text-[#61afef]">
                          {providerBaseUrl || "https://api.routstr.com/v1"}
                          /chat/completions
                        </span>
                        {" \\\n"}
                        <span className="text-[#abb2bf]">{"  -H "}</span>
                        <span className="text-[#98c379]">
                          {'"Content-Type: application/json"'}
                        </span>
                        {" \\\n"}
                        <span className="text-[#abb2bf]">{"  -H "}</span>
                        <span className="text-[#98c379]">
                          {'"Authorization: Bearer '}
                        </span>
                        <input
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          onBlur={() =>
                            setLocalCashuToken(storageBaseUrl, tokenInput || "")
                          }
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          placeholder="cashu..."
                          className="inline-block align-middle min-w-0 w-[9ch] sm:w-[16ch] max-w-[50vw] bg-transparent border border-white/10 rounded px-2 py-0.5 text-[10px] sm:text-xs text-[#98c379] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <span className="text-[#98c379]">{'"'}</span>
                        {" \\\n"}
                        {"  -d "}
                        <span className="text-[#98c379]">{"'"}</span>
                        {"{"}
                        <span className="text-[#98c379]">{""}</span>
                        {"}"}
                        {"\n"}
                        {'    "model": "'}
                        <span className="text-[#98c379]">{model.id}</span>
                        {'",'}
                        {"\n"}
                        {'    "messages": ['}
                        {"\n"}
                        {'      { "role": "user", "content": "'}
                        <span className="text-[#98c379]">{"Hello Nostr"}</span>
                        {'" }'}
                        {"\n"}
                        {"    ]"}
                        {"\n"}
                        {"  }"}
                        <span className="text-[#98c379]">{"'"}</span>
                        {"\n"}
                      </code>
                    </pre>
                  ) : activeTab === "javascript" ? (
                    <pre className="text-xs sm:text-sm leading-6 whitespace-pre font-mono text-white">
                      <code>
                        <span className="text-[#61afef]">import</span>{" "}
                        <span className="text-white">OpenAI</span>{" "}
                        <span className="text-[#61afef]">from</span>{" "}
                        <span className="text-[#98c379]">{"'openai'"}</span>
                        <span className="text-[#abb2bf]">;</span>
                        {"\n\n"}
                        <span className="text-[#61afef]">const</span>{" "}
                        <span className="text-white">openai</span>{" "}
                        <span className="text-[#abb2bf]">=</span>{" "}
                        <span className="text-[#61afef]">new</span>{" "}
                        <span className="text-white">OpenAI</span>
                        <span className="text-[#abb2bf]">({"\n"}</span>
                        {"  "}
                        <span className="text-[#e5c07b]">baseURL</span>
                        <span className="text-[#abb2bf]">: </span>
                        <span className="text-[#98c379]">
                          {"'"}
                          {providerBaseUrl || "https://api.routstr.com/v1"}
                          {"'"}
                        </span>
                        <span className="text-[#abb2bf]">,{"\n"}</span>
                        {"  "}
                        <span className="text-[#e5c07b]">apiKey</span>
                        <span className="text-[#abb2bf]">: </span>
                        <span className="text-[#98c379]">{"'"}</span>
                        <input
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          onBlur={() =>
                            setLocalCashuToken(storageBaseUrl, tokenInput || "")
                          }
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          placeholder="cashu..."
                          className="inline-block align-middle min-w-0 w-[9ch] sm:w-[16ch] max-w-[50vw] bg-transparent border border-white/10 rounded px-2 py-0.5 text-[10px] sm:text-xs text-[#98c379] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <span className="text-[#98c379]">{"'"}</span>
                        {"\n"}
                        <span className="text-[#abb2bf]">{"});\n\n"}</span>
                        <span className="text-[#61afef]">async</span>{" "}
                        <span className="text-[#61afef]">function</span>{" "}
                        <span className="text-white">main</span>
                        <span className="text-[#abb2bf]">(){"\n"}</span>
                        {"  "}
                        <span className="text-[#61afef]">const</span>{" "}
                        <span className="text-white">completion</span>{" "}
                        <span className="text-[#abb2bf]">=</span>{" "}
                        <span className="text-[#61afef]">await</span>{" "}
                        <span className="text-white">openai</span>
                        <span className="text-[#abb2bf]">
                          .chat.completions.create(
                        </span>
                        <span className="text-[#abb2bf]">{"{"}</span>
                        {"\n"}
                        {"    "}
                        <span className="text-[#e5c07b]">model</span>
                        <span className="text-[#abb2bf]">: </span>
                        <span className="text-[#98c379]">{"'"}</span>
                        <span className="text-[#98c379]">{model.id}</span>
                        <span className="text-[#98c379]">{"'"}</span>
                        <span className="text-[#abb2bf]">,{"\n"}</span>
                        {"    "}
                        <span className="text-[#e5c07b]">messages</span>
                        <span className="text-[#abb2bf]">: [</span>
                        {"\n"}
                        {"      "}
                        <span className="text-[#abb2bf]">{"{ "}</span>
                        <span className="text-[#e5c07b]">role</span>
                        <span className="text-[#abb2bf]">: </span>
                        <span className="text-[#98c379]">{"'user'"}</span>
                        <span className="text-[#abb2bf]">, </span>
                        <span className="text-[#e5c07b]">content</span>
                        <span className="text-[#abb2bf]">: </span>
                        <span className="text-[#98c379]">
                          {"'Hello Nostr'"}
                        </span>
                        <span className="text-[#abb2bf]">{" }\n"}</span>
                        {"    "}
                        <span className="text-[#abb2bf]">]</span>
                        {"\n"}
                        <span className="text-[#abb2bf]"> {"});\n"}</span>
                        {"  "}
                        <span className="text-white">console</span>
                        <span className="text-[#abb2bf]">.log(</span>
                        <span className="text-white">completion</span>
                        <span className="text-[#abb2bf]">.choices[</span>
                        <span className="text-[#c678dd]">0</span>
                        <span className="text-[#abb2bf]">].message);</span>
                        {"\n"}
                        <span className="text-[#abb2bf]">{"}\n\n"}</span>
                        <span className="text-white">main</span>
                        <span className="text-[#abb2bf]">();</span>
                      </code>
                    </pre>
                  ) : (
                    <pre className="text-xs sm:text-sm leading-6 whitespace-pre font-mono text-white">
                      <code>
                        <span className="text-[#61afef]">from</span>{" "}
                        <span className="text-white">openai</span>{" "}
                        <span className="text-[#61afef]">import</span>{" "}
                        <span className="text-white">OpenAI</span>
                        {"\n\n"}
                        <span className="text-white">client</span>{" "}
                        <span className="text-[#abb2bf]">=</span>{" "}
                        <span className="text-white">OpenAI</span>
                        <span className="text-[#abb2bf]">(</span>
                        {"\n"}
                        {"    "}
                        <span className="text-[#e5c07b]">base_url</span>
                        <span className="text-[#abb2bf]">=</span>
                        <span className="text-[#98c379]">
                          {'"'}
                          {providerBaseUrl || "https://api.routstr.com/v1"}
                          {'"'}
                        </span>
                        <span className="text-[#abb2bf]">,{"\n"}</span>
                        {"    "}
                        <span className="text-[#e5c07b]">api_key</span>
                        <span className="text-[#abb2bf]">=</span>
                        <span className="text-[#98c379]">{'"'}</span>
                        <input
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          onBlur={() =>
                            setLocalCashuToken(storageBaseUrl, tokenInput || "")
                          }
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          placeholder="cashu..."
                          className="inline-block align-middle min-w-0 w-[9ch] sm:w-[16ch] max-w-[50vw] bg-transparent border border-white/10 rounded px-2 py-0.5 text-[10px] sm:text-xs text-[#98c379] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <span className="text-[#98c379]">{'"'}</span>
                        {"\n"}
                        <span className="text-[#abb2bf]">){"\n\n"}</span>
                        <span className="text-white">completion</span>{" "}
                        <span className="text-[#abb2bf]">=</span>{" "}
                        <span className="text-white">client</span>
                        <span className="text-[#abb2bf]">
                          .chat.completions.create(
                        </span>
                        {"\n"}
                        {"    "}
                        <span className="text-[#e5c07b]">model</span>
                        <span className="text-[#abb2bf]">=</span>
                        <span className="text-[#98c379]">{'"'}</span>
                        <span className="text-[#98c079]">{model.id}</span>
                        <span className="text-[#98c379]">{'"'}</span>
                        <span className="text-[#abb2bf]">,{"\n"}</span>
                        {"    "}
                        <span className="text-[#e5c07b]">messages</span>
                        <span className="text-[#abb2bf]">=[</span>
                        {"\n"}
                        {"        "}
                        <span className="text-[#abb2bf]">{"{ "}</span>
                        <span className="text-[#98c379]">{"role"}</span>
                        <span className="text-[#abb2bf]">: </span>
                        <span className="text-[#98c379]">{"user"}</span>
                        <span className="text-[#abb2bf]">, </span>
                        <span className="text-[#98c379]">{"content"}</span>
                        <span className="text-[#abb2bf]">: </span>
                        <span className="text-[#98c379]">{"Hello Nostr"}</span>
                        <span className="text-[#abb2bf]">{" }\n"}</span>
                        {"    "}
                        <span className="text-[#abb2bf]">]</span>
                        {"\n"}
                        <span className="text-[#abb2bf]">){"\n"}</span>
                        <span className="text-[#61afef]">print</span>
                        <span className="text-[#abb2bf]">(</span>
                        <span className="text-white">completion</span>
                        <span className="text-[#abb2bf]">.choices[</span>
                        <span className="text-[#c678dd]">0</span>
                        <span className="text-[#abb2bf]">
                          ].message.content)
                        </span>
                      </code>
                    </pre>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="rounded bg-black/30 p-3 border border-white/5">
                  <span className="block font-medium text-white mb-1">
                    OpenAI Compatible
                  </span>
                  <span className="text-gray-300">
                    Drop-in replacement for OpenAI clients
                  </span>
                </div>
                <div className="rounded bg-black/30 p-3 border border-white/5">
                  <span className="block font-medium text-white mb-1">
                    Cashu Tokens
                  </span>
                  <span className="text-gray-300">
                    Pay with Lightning via Cashu ecash
                  </span>
                </div>
                <div className="rounded bg-black/30 p-3 border border-white/5">
                  <span className="block font-medium text-white mb-1">
                    Privacy First
                  </span>
                  <span className="text-gray-300">
                    No accounts, no tracking, just API tokens
                  </span>
                </div>
              </div>
            </Card>

            {/* Model Reviews Section */}
            <ModelReviews
              modelId={model.id}
              providersForModel={providersForModel}
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
