'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { Model, Provider, PerRequestLimits } from '@/app/data/models';
import { filterStagingEndpoints, shouldHideProvider } from '@/lib/staging-filter';

interface ModelsState {
  models: Model[];
  providerMap: Map<string, Provider[]>;
  // For each model id, keep provider-specific model entries so we can access provider-specific pricing
  modelProviderEntries: Map<string, Array<{ provider: Provider; model: Model }>>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

type ModelsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { models: Model[]; providerMap: Map<string, Provider[]>; modelProviderEntries: Map<string, Array<{ provider: Provider; model: Model }>> } }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const initialState: ModelsState = {
  models: [],
  providerMap: new Map<string, Provider[]>(),
  modelProviderEntries: new Map<string, Array<{ provider: Provider; model: Model }>>(),
  loading: false,
  error: null,
  lastFetched: null,
};

function modelsReducer(state: ModelsState, action: ModelsAction): ModelsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        models: action.payload.models,
        providerMap: action.payload.providerMap,
        modelProviderEntries: action.payload.modelProviderEntries,
        lastFetched: Date.now(),
        error: null,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface ModelsContextType extends ModelsState {
  fetchModels: () => Promise<void>;
  clearError: () => void;
  findModel: (id: string) => Model | undefined;
  getProvidersForModel: (id: string) => Provider[];
  // Returns providers sorted by cheapest pricing for a given model
  getProvidersForModelCheapestFirst: (id: string) => Provider[];
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(modelsReducer, initialState);

  const fetchModels = useCallback(async () => {
    // Don't fetch if already loading or recently fetched (within 5 minutes)
    if (state.loading || (state.lastFetched && Date.now() - state.lastFetched < 5 * 60 * 1000)) {
      return;
    }

    dispatch({ type: 'FETCH_START' });

    try {
      const response = await fetch('https://api.routstr.com/v1/providers/');
      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }
      const data = await response.json();

      const list: Array<{
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
      }> = Array.isArray(data.providers) ? data.providers : [];

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

      // Assemble models by querying each provider's /v1/models
      const modelMap = new Map<string, Model>();
      const providerMap = new Map<string, Provider[]>();
  const modelProviderEntries = new Map<string, Array<{ provider: Provider; model: Model }>>();

      await Promise.all(
        list
          .filter((p) => {
            const endpoints = (Array.isArray(p.endpoint_urls) && p.endpoint_urls.length > 0)
              ? p.endpoint_urls!
              : [p.endpoint_url].filter(Boolean);
            const nameOrTag = `${p.name || ''}`.toLowerCase();
            const looksLikeStaging = nameOrTag.includes('staging');
            return !shouldHideProvider(endpoints) && !looksLikeStaging;
          })
          .map(async (p) => {
            const nonStaging = filterStagingEndpoints(p.endpoint_urls || []);
            const http = nonStaging.filter((u) => typeof u === 'string' && !u.includes('.onion'));
            const primary = (http[0] || p.endpoint_url || '').trim();

            const providerObj: Provider = {
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
              mint_url: (p.mint_url ?? null) || (Array.isArray(p.mint_urls) && p.mint_urls.length > 0 ? p.mint_urls[0] : null),
              mint_urls: Array.isArray(p.mint_urls) ? p.mint_urls : [],
              version: p.version,
              supported_models: [],
              content: p.content,
            };

            if (!primary) return; // skip if no usable endpoint
            try {
              const base = normalizeForFetch(primary).replace(/\/$/, '');
              const modelsUrl = `${base}/v1/models`;
              const r = await fetchWithTimeout(modelsUrl, { headers: { 'accept': 'application/json' } }, 8000);
              if (!r.ok) return;
              const payload = await r.json();
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
                per_request_limits?: unknown;
                [key: string]: unknown;
              }> = Array.isArray(payload?.data) ? payload.data : [];
              arr.forEach((raw) => {
                const m: Model = {
                  id: raw.id,
                  name: raw.name,
                  created: raw.created,
                  description: raw.description ?? '',
                  context_length: raw.context_length ?? 0,
                  architecture: {
                    modality: raw.architecture?.modality ?? '',
                    input_modalities: raw.architecture?.input_modalities ?? [],
                    output_modalities: raw.architecture?.output_modalities ?? [],
                    tokenizer: raw.architecture?.tokenizer ?? '',
                    instruct_type: raw.architecture?.instruct_type ?? null,
                  },
                  pricing: {
                    prompt: raw.pricing?.prompt ?? 0,
                    completion: raw.pricing?.completion ?? 0,
                    request: raw.pricing?.request ?? 0,
                    image: raw.pricing?.image ?? 0,
                    web_search: raw.pricing?.web_search ?? 0,
                    internal_reasoning: raw.pricing?.internal_reasoning ?? 0,
                    max_cost: raw.pricing?.max_cost ?? 0,
                  },
                  sats_pricing: {
                    prompt: raw.sats_pricing?.prompt ?? 0,
                    completion: raw.sats_pricing?.completion ?? 0,
                    request: raw.sats_pricing?.request ?? 0,
                    image: raw.sats_pricing?.image ?? 0,
                    web_search: raw.sats_pricing?.web_search ?? 0,
                    internal_reasoning: raw.sats_pricing?.internal_reasoning ?? 0,
                    max_cost: raw.sats_pricing?.max_cost ?? 0,
                  },
                  per_request_limits: (raw.per_request_limits && Object.keys(raw.per_request_limits).length > 0)
                    ? raw.per_request_limits as PerRequestLimits
                    : null,
                  top_provider: {
                    context_length: raw.context_length ?? 0,
                    max_completion_tokens: null,
                    is_moderated: false,
                  },
                };
                // de-duplicate and map to provider
                if (!modelMap.has(m.id)) modelMap.set(m.id, m);
                const existing = providerMap.get(m.id) || [];
                providerMap.set(m.id, [...existing, providerObj]);
                const existingEntries = modelProviderEntries.get(m.id) || [];
                modelProviderEntries.set(m.id, [...existingEntries, { provider: providerObj, model: m }]);
              });
            } catch {
              // ignore per-provider errors
            }
          })
      );

      dispatch({
        type: 'FETCH_SUCCESS',
    payload: { models: Array.from(modelMap.values()), providerMap, modelProviderEntries },
      });
    } catch (error) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }, [state.loading, state.lastFetched]);

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const findModel = (id: string): Model | undefined => {
    const normalize = (s: string) => decodeURIComponent(s).trim().toLowerCase();
    const canonicalize = (s: string) => normalize(s).replace(/[\s._-]/g, '');
    const parseProviderAndModel = (s: string) => {
      const parts = normalize(s).split('/');
      const providerSegment = parts.length > 1 ? parts[0] : '';
      const modelSegment = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
      return { providerSegment, modelSegment };
    };
    const expandProviderAliases = (provider: string): readonly string[] => {
      const p = canonicalize(provider);
      if (!p) return [];
      // Known aliases: "z-ai" often maps to Zhipu providers/IDs (glm family)
      if (p === 'zai' || p === 'z-ai' || p.includes('zai')) {
        return ['zai', 'z-ai', 'zhipu', 'zhipuai', 'zhipu-ai'].map(canonicalize);
      }
      return [p];
    };

    const targetRaw = id;
    const targetNormalized = normalize(targetRaw);
    const targetCanonical = canonicalize(targetRaw);

    // 1) Exact match
    let found = state.models.find((model) => model.id === targetRaw);
    if (found) return found;

    // 2) Case-insensitive / decoded match
    found = state.models.find((model) => normalize(model.id) === targetNormalized);
    if (found) return found;

    // 3) Canonical (punctuation-insensitive) full-ID match
    found = state.models.find((model) => canonicalize(model.id) === targetCanonical);
    if (found) return found;

    // 4) Fuzzy match on last segment (handle dots vs dashes, etc.)
    const { providerSegment: wantedProvider, modelSegment: wantedModel } = parseProviderAndModel(targetRaw);
    const wantedLast = (wantedModel.split('/').pop() || '').trim();
    const wantedLastCanonical = canonicalize(wantedLast);

    const lastSegmentCandidates = state.models.filter((model) => {
      const modelLast = normalize(model.id).split('/').pop() || '';
      return canonicalize(modelLast) === wantedLastCanonical;
    });
    if (lastSegmentCandidates.length === 1) return lastSegmentCandidates[0];

    // 5) If multiple candidates, prefer ones whose provider matches known aliases
    if (lastSegmentCandidates.length > 1 && wantedProvider) {
      const aliasSet = new Set(expandProviderAliases(wantedProvider));
      const aliasMatches = lastSegmentCandidates.filter((model) => {
        const providerOfModel = normalize(model.id).split('/')[0] || '';
        return aliasSet.has(canonicalize(providerOfModel));
      });
      if (aliasMatches.length === 1) return aliasMatches[0];
      if (aliasMatches.length > 1) return aliasMatches[0];
    }

    // 6) As a final fallback, if exactly one model matches by case-insensitive last segment
    const ciLastMatches = state.models.filter((model) => {
      const modelLast = normalize(model.id).split('/').pop() || '';
      return modelLast === normalize(wantedLast);
    });
    if (ciLastMatches.length === 1) return ciLastMatches[0];

    return undefined;
  };

  const getProvidersForModel = (id: string): Provider[] => {
    const normalize = (s: string) => decodeURIComponent(s).trim().toLowerCase();
    const direct = state.providerMap.get(id);
    if (direct && direct.length > 0) return direct;
    const entries = Array.from(state.providerMap.entries());
    for (const [key, value] of entries) {
      if (normalize(key) === normalize(id)) return value;
    }
    return [];
  };

  // Cheapest-first providers by comparing provider-specific model sats pricing
  const getProvidersForModelCheapestFirst = (id: string): Provider[] => {
    const normalize = (s: string) => decodeURIComponent(s).trim().toLowerCase();
    const entries = state.modelProviderEntries.get(id)
      ?? Array.from(state.modelProviderEntries.entries()).find(([key]) => normalize(key) === normalize(id))?.[1]
      ?? [];
    if (entries.length === 0) return getProvidersForModel(id);
    const sorted = [...entries].sort((a, b) => {
      const aPrice = a.model.sats_pricing?.prompt ?? 0;
      const bPrice = b.model.sats_pricing?.prompt ?? 0;
      return aPrice - bPrice; // cheaper first
    });
    return sorted.map((e) => e.provider);
  };

  // Auto-fetch on mount if no data
  useEffect(() => {
    if (state.models.length === 0 && !state.loading && !state.error) {
      fetchModels();
    }
  }, [fetchModels, state.error, state.loading, state.models.length]);

  const contextValue: ModelsContextType = {
    ...state,
    fetchModels,
    clearError,
    findModel,
    getProvidersForModel,
    getProvidersForModelCheapestFirst,
  };

  return (
    <ModelsContext.Provider value={contextValue}>
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelsContext);
  if (context === undefined) {
    throw new Error('useModels must be used within a ModelsProvider');
  }
  return context;
}
