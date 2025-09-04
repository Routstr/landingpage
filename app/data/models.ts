export interface PerRequestLimits {
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly requests_per_minute?: number;
  readonly images_per_minute?: number;
  readonly web_searches_per_minute?: number;
  readonly [key: string]: number | undefined;
}

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
  top_provider: {
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
  d_tag: string;
  endpoint_url: string;
  endpoint_urls: readonly string[];
  name: string;
  description: string;
  contact: string | null;
  pricing_url: string | null;
  mint_url?: string | null;
  mint_urls?: readonly string[];
  version: string;
  supported_models: readonly string[];
  content: string;
}

export interface ProviderWithHealth {
  provider: Provider;
  health: {
    status_code: number;
    endpoint: string;
    json: {
      name: string;
      description: string;
      version: string;
      npub: string;
      mints: string[];
      http_url: string;
      onion_url: string;
      models: Model[];
    };
  };
}

export interface ProvidersResponse {
  providers: ProviderWithHealth[];
}

// Initial state with empty data
export let models: Model[] = [];
export let providers: Provider[] = [];
export let providerModelMap: Map<string, Model[]> = new Map();
export let modelProvidersMap: Map<string, Provider[]> = new Map();

// Fetch models and providers from the new API
export async function fetchModels(): Promise<void> {
  try {
    const response = await fetch(
      "https://api.routstr.com/v1/providers/?include_json=true"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.status}`);
    }

    const data: ProvidersResponse = await response.json();

    // Filter out providers that don't have models available in their health response
    const activeProviders = data.providers.filter(
      ({ health }) =>
        health.status_code === 200 &&
        health.json?.models &&
        health.json.models.length > 0
    );

    // Extract all models from all providers and map them to providers
    const allModels: Model[] = [];
    const allProviders: Provider[] = [];
    const newProviderModelMap = new Map<string, Model[]>();
    const newModelProvidersMap = new Map<string, Provider[]>();
    const modelMap = new Map<string, Model>(); // To deduplicate models

    activeProviders.forEach(({ provider, health }) => {
      // Normalize mint fields across API variants
      const mintUrlsFromProvider = (provider as unknown as { mint_urls?: string[] }).mint_urls || [];
      const mintUrlsFromHealth = Array.isArray(health?.json?.mints) ? (health!.json!.mints as string[]) : [];
      const normalizedMintUrls = (mintUrlsFromProvider.length > 0 ? mintUrlsFromProvider : mintUrlsFromHealth).filter(
        (u) => typeof u === "string" && u.length > 0
      );
      const singleMintUrlFromProvider = (provider as unknown as { mint_url?: string | null }).mint_url ?? null;
      const normalizedMintUrl = singleMintUrlFromProvider ?? (normalizedMintUrls.length > 0 ? normalizedMintUrls[0] : null);

      const providerAugmented: Provider = {
        ...provider,
        mint_urls: normalizedMintUrls,
        mint_url: normalizedMintUrl,
      } as Provider;

      allProviders.push(providerAugmented);
      if (health.json?.models) {
        // Deduplicate models by ID and ensure proper Model structure
        health.json.models.forEach((rawModel) => {
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
              internal_reasoning:
                rawModel.sats_pricing?.internal_reasoning ?? 0,
              max_cost: rawModel.sats_pricing?.max_cost ?? 0,
            },
            per_request_limits: rawModel.per_request_limits ?? null,
            top_provider: {
              context_length: rawModel.context_length ?? 0,
              max_completion_tokens: null,
              is_moderated: false,
            },
          };

          modelMap.set(model.id, model);
          const existingProviders = newModelProvidersMap.get(model.id) || [];
          newModelProvidersMap.set(model.id, [...existingProviders, provider]);
        });

        // Map models to this provider
        const providerModels = health.json.models.map(
          (rawModel) => modelMap.get(rawModel.id)!
        );
        newProviderModelMap.set(provider.id, providerModels);
        newProviderModelMap.set(provider.d_tag, providerModels);
      }
    });

    // Convert deduplicated models map to array
    allModels.push(...Array.from(modelMap.values()));

    // Update the global state
    models = allModels;
    providers = allProviders;
    providerModelMap = newProviderModelMap;
    modelProvidersMap = newModelProvidersMap;
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
  const promptPrice = model.sats_pricing.prompt.toFixed(8);
  const completionPrice = model.sats_pricing.completion.toFixed(8);

  return `${promptPrice} sats/token prompt / ${completionPrice} sats/token completion`;
}

// Get primary provider for a model (first provider in mapping)
export function getPrimaryProviderForModel(
  modelId: string
): Provider | undefined {
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
export function getPopularModels(count: number = 6): Model[] {
  // Sort by created date (newest first) and return top N
  return [...models]
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
    (provider) => provider.id === id || provider.d_tag === id
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
  return providerModelMap.get(providerId) || [];
}