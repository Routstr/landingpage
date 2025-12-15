export interface PerRequestLimits {
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly requests_per_minute?: number;
  readonly images_per_minute?: number;
  readonly web_searches_per_minute?: number;
  readonly [key: string]: number | undefined;
}

import { filterStagingEndpoints, shouldHideProvider } from '@/lib/staging-filter';

export interface Model {
  id: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: readonly string[];
    output_modalities: readonly string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: number;
    completion: number;
    request: number;
    image: number;
    web_search: number;
    internal_reasoning: number;
    max_cost: number;
  };
  sats_pricing: {
    prompt: number;
    completion: number;
    request: number;
    image: number;
    web_search: number;
    internal_reasoning: number;
    max_cost: number;
  };
  per_request_limits: PerRequestLimits | null;
  top_provider?: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
}

export interface Provider {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  endpoint_url: string;
  endpoint_urls: readonly string[];
  name: string;
  description: string;
  contact?: string | null;
  pricing_url?: string | null;
  mint_url?: string | null;
  mint_urls?: readonly string[];
  version: string;
  supported_models: readonly string[];
  content: string;
}

interface ApiProviderListResponse { providers: Array<{
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  endpoint_url: string;
  endpoint_urls?: string[];
  name: string;
  description: string;
  mint_url?: string | null;
  mint_urls?: string[];
  version: string;
  content: string;
}> }

// Initial state with empty data
export let models: Model[] = [];
export let providers: Provider[] = [];
export let providerModelMap: Map<string, Model[]> = new Map();
export let modelProvidersMap: Map<string, Provider[]> = new Map();
// Keep provider-specific model entries to compute cheapest providers per model
export let modelProviderEntries: Map<string, Array<{ provider: Provider; model: Model }>> = new Map();

// Fetch models and providers from the new API
export async function fetchModels(): Promise<void> {
  try {
    const response = await fetch("https://api.routstr.com/v1/providers/");
    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.status}`);
    }
    const data: ApiProviderListResponse = await response.json();
    const list = Array.isArray(data.providers) ? data.providers : [];

    // staging filtering based on endpoints and name
    const visible = list.filter((p) => {
      const endpoints = (Array.isArray(p.endpoint_urls) && p.endpoint_urls.length > 0)
        ? p.endpoint_urls!
        : [p.endpoint_url].filter(Boolean);
      const nameOrTag = `${p.name || ''}`.toLowerCase();
      const looksLikeStaging = nameOrTag.includes('staging');
      return !shouldHideProvider(endpoints) && !looksLikeStaging;
    });

    const normalizeForFetch = (urlOrHost: string): string => {
      if (!urlOrHost) return '';
      const hasProtocol = /^(https?:)?\/\//i.test(urlOrHost);
      return hasProtocol ? urlOrHost : `https://${urlOrHost}`;
    };

    const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { ...options, signal: controller.signal });
        return resp;
      } finally {
        clearTimeout(id);
      }
    };

    const allModels: Model[] = [];
    const allProviders: Provider[] = [];
    const newProviderModelMap = new Map<string, Model[]>();
    const newModelProvidersMap = new Map<string, Provider[]>();
    const newModelProviderEntries = new Map<string, Array<{ provider: Provider; model: Model }>>();
    const modelMap = new Map<string, Model>();

    await Promise.all(
      visible.map(async (p) => {
        const nonStaging = filterStagingEndpoints(p.endpoint_urls || []);
        const http = nonStaging.filter((u) => typeof u === 'string' && !u.includes('.onion'));
        const primary = (http[0] || p.endpoint_url || '').trim();

        // Normalize mint URLs
        const mintUrls = Array.isArray(p.mint_urls) ? p.mint_urls.filter((u) => typeof u === 'string' && u.length > 0) : [];
        const mintUrl = (p.mint_url ?? null) || (mintUrls.length > 0 ? mintUrls[0] : null);

        const providerAugmented: Provider = {
          id: p.id,
          pubkey: p.pubkey,
          created_at: p.created_at,
          kind: p.kind,
          endpoint_url: primary || p.endpoint_url,
          endpoint_urls: nonStaging,
          name: p.name,
          description: p.description,
          contact: undefined,
          pricing_url: undefined,
          mint_url: mintUrl,
          mint_urls: mintUrls,
          version: p.version,
          supported_models: [],
          content: p.content,
        };

        allProviders.push(providerAugmented);

        let providerModels: Model[] = [];
        if (primary) {
          try {
            const base = normalizeForFetch(primary).replace(/\/$/, '');
            const modelsUrl = `${base}/v1/models`;
            const r = await fetchWithTimeout(modelsUrl, { headers: { 'accept': 'application/json' } }, 8000);
            if (r.ok) {
              const m = await r.json();
              const arr: Array<{
                id: string;
                name: string;
                created: number;
                description?: string;
                context_length?: number;
                architecture?: {
                  modality?: string;
                  input_modalities?: string[];
                  output_modalities?: string[];
                  tokenizer?: string;
                  instruct_type?: string | null;
                };
                pricing?: {
                  prompt?: number;
                  completion?: number;
                  request?: number;
                  image?: number;
                  web_search?: number;
                  internal_reasoning?: number;
                  max_cost?: number;
                };
                sats_pricing?: {
                  prompt?: number;
                  completion?: number;
                  request?: number;
                  image?: number;
                  web_search?: number;
                  internal_reasoning?: number;
                  max_cost?: number;
                };
                per_request_limits?: PerRequestLimits | null;
                [key: string]: unknown;
              }> = Array.isArray(m?.data) ? m.data : [];
              providerModels = arr.map((rawModel) => {
                const model: Model = {
                  id: rawModel.id,
                  name: rawModel.name,
                  created: rawModel.created,
                  description: rawModel.description ?? "",
                  context_length: rawModel.context_length ?? 0,
                  architecture: {
                    modality: rawModel.architecture?.modality ?? "",
                    input_modalities: rawModel.architecture?.input_modalities ?? [],
                    output_modalities: rawModel.architecture?.output_modalities ?? [],
                    tokenizer: rawModel.architecture?.tokenizer ?? "",
                    instruct_type: rawModel.architecture?.instruct_type ?? null,
                  },
                  pricing: {
                    prompt: rawModel.pricing?.prompt ?? 0,
                    completion: rawModel.pricing?.completion ?? 0,
                    request: rawModel.pricing?.request ?? 0,
                    image: rawModel.pricing?.image ?? 0,
                    web_search: rawModel.pricing?.web_search ?? 0,
                    internal_reasoning: rawModel.pricing?.internal_reasoning ?? 0,
                    max_cost: rawModel.pricing?.max_cost ?? 0,
                  },
                  sats_pricing: {
                    prompt: rawModel.sats_pricing?.prompt ?? 0,
                    completion: rawModel.sats_pricing?.completion ?? 0,
                    request: rawModel.sats_pricing?.request ?? 0,
                    image: rawModel.sats_pricing?.image ?? 0,
                    web_search: rawModel.sats_pricing?.web_search ?? 0,
                    internal_reasoning: rawModel.sats_pricing?.internal_reasoning ?? 0,
                    max_cost: rawModel.sats_pricing?.max_cost ?? 0,
                  },
                  per_request_limits: rawModel.per_request_limits ?? null,
                  top_provider: {
                    context_length: rawModel.context_length ?? 0,
                    max_completion_tokens: null,
                    is_moderated: false,
                  },
                };
                return model;
              });
            }
          } catch {
            // ignore per-provider errors
          }
        }

        // Deduplicate and map
        const existingModelsForProvider: Model[] = [];
        providerModels.forEach((model) => {
          const existing = modelMap.get(model.id);
          if (!existing) {
            modelMap.set(model.id, model);
          }
          existingModelsForProvider.push(modelMap.get(model.id)!);
          const existingProviders = newModelProvidersMap.get(model.id) || [];
          newModelProvidersMap.set(model.id, [...existingProviders, providerAugmented]);
          const existingEntries = newModelProviderEntries.get(model.id) || [];
          newModelProviderEntries.set(model.id, [...existingEntries, { provider: providerAugmented, model }]);
        });
        newProviderModelMap.set(p.id, existingModelsForProvider);
      })
    );

    allModels.push(...Array.from(modelMap.values()));
    models = allModels;
    providers = allProviders;
    providerModelMap = newProviderModelMap;
    modelProvidersMap = newModelProvidersMap;
    modelProviderEntries = newModelProviderEntries;
    return;
  } catch (error) {
    console.error("Error fetching models and providers:", error);
    return;
  }
}

// Extract the provider name from the model name (e.g., "Qwen" from "Qwen: Qwen3 30B A3B")
export function getProviderFromModelName(modelName: string): string {
  const colonIndex = modelName.indexOf(":");
  if (colonIndex !== -1) {
    return modelName.substring(0, colonIndex).trim();
  }
  return "Unknown";
}

// Extract the model name without provider (e.g., "Qwen3 30B A3B" from "Qwen: Qwen3 30B A3B")
export function getModelNameWithoutProvider(modelName: string): string {
  const colonIndex = modelName.indexOf(":");
  if (colonIndex !== -1) {
    return modelName.substring(colonIndex + 1).trim();
  }
  return modelName;
}

// Format price as a string
export function formatPrice(model: Model): string {
  const promptPrice = model.pricing.prompt.toExponential(6);
  const completionPrice = model.pricing.completion.toExponential(6);

  return `$${promptPrice} prompt / $${completionPrice} completion`;
}

// Format sats price as a string
export function formatSatsPrice(model: Model): string {
  const promptTokensPerSat = model.sats_pricing.prompt > 0 ? (1 / model.sats_pricing.prompt).toFixed(2) : '—';
  const completionTokensPerSat = model.sats_pricing.completion > 0 ? (1 / model.sats_pricing.completion).toFixed(2) : '—';

  return `${promptTokensPerSat} tokens/sat prompt / ${completionTokensPerSat} tokens/sat completion`;
}

// Get primary provider for a model (first provider in mapping)
export function getPrimaryProviderForModel(
  modelId: string
): Provider | undefined {
  // Choose cheapest provider (by sats_pricing.completion) if available
  const entries = modelProviderEntries.get(modelId);
  if (entries && entries.length > 0) {
    const cheapest = [...entries].sort((a, b) => {
      const aPrice = a.model.sats_pricing?.completion ?? 0;
      const bPrice = b.model.sats_pricing?.completion ?? 0;
      return aPrice - bPrice;
    })[0];
    return cheapest?.provider;
  }
  const providersForModel = modelProvidersMap.get(modelId);
  return providersForModel && providersForModel.length > 0
    ? providersForModel[0]
    : undefined;
}

// Get USD pricing short string for a model
export function getUsdPricingShort(model: Model): string {
  const inPerMTokens = model.pricing.prompt * 1_000_000;
  const outPerMTokens = model.pricing.completion * 1_000_000;
  const inStr = `$${inPerMTokens.toFixed(
    inPerMTokens >= 0.1 ? 2 : 2
  )}/M input tokens`;
  const outStr = `$${outPerMTokens.toFixed(
    outPerMTokens >= 0.1 ? 2 : 2
  )}/M output tokens`;
  return `${inStr}  |  ${outStr}`;
}

// Get the display name for a model (remove provider prefix if present)
export function getModelDisplayName(model: Model): string {
  const colonIndex = model.name.indexOf(":");
  if (colonIndex !== -1) {
    return model.name.substring(colonIndex + 1).trim();
  }
  return model.name;
}

// Group models by provider
export function groupModelsByProvider(): Record<string, Model[]> {
  const grouped: Record<string, Model[]> = {};

  models.forEach((model) => {
    const provider = getProviderFromModelName(model.name);
    if (!grouped[provider]) {
      grouped[provider] = [];
    }
    grouped[provider].push(model);
  });

  return grouped;
}

// Get popular models (for showcase)
export function getPopularModels(count: number = 6, sourceModels: Model[] = models): Model[] {
  // Sort by created date (newest first) and return top N
  return [...sourceModels]
    .sort(
      (a, b) =>
        // Prioritize newest models
        b.created - a.created
    )
    .slice(0, count);
}

// Get a model id for example usage
export function getExampleModelId(): string {
  // Find a model from a well-known provider for examples
  const candidates = models.filter(
    (model) =>
      model.name.toLowerCase().includes("qwen") ||
      model.name.toLowerCase().includes("gemini") ||
      model.name.toLowerCase().includes("glm")
  );

  if (candidates.length > 0) {
    return candidates[0].id;
  }

  // Fallback to first model if no good candidates
  return models.length > 0 ? models[0].id : "qwen/qwen3-14b";
}

// Get provider by ID
export function getProviderById(id: string): Provider | undefined {
  return providers.find(
    (provider) => provider.id === id
  );
}

// Get provider features (extracted from content or default features)
export function getProviderFeatures(provider: Provider): string[] {
  try {
    const content = JSON.parse(provider.content);
    return content.features || [];
  } catch {
    // Default features based on provider characteristics
    const features = [];
    if (provider.endpoint_urls.some((url) => url.includes(".onion"))) {
      features.push("Tor support");
    }
    if (provider.mint_url) {
      features.push("Lightning payments");
    }
    if (provider.pricing_url) {
      features.push("Transparent pricing");
    }
    return features.length > 0 ? features : ["AI models", "API access"];
  }
}

// Get models for a specific provider
export function getModelsByProvider(providerId: string): Model[] {
  // Use the provider-model mapping we built during fetch
  // Sort cheapest first (by sats_pricing.completion)
  const models = providerModelMap.get(providerId) || [];
  return [...models].sort((a, b) => (a.sats_pricing?.completion ?? 0) - (b.sats_pricing?.completion ?? 0));
}