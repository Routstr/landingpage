'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { Model, Provider, ProviderWithHealth } from '@/app/data/models';
import { filterStagingEndpoints, shouldHideProvider } from '@/lib/staging-filter';

interface ModelsState {
  models: Model[];
  providerMap: Map<string, Provider[]>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

type ModelsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { models: Model[]; providerMap: Map<string, Provider[]> } }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const initialState: ModelsState = {
  models: [],
  providerMap: new Map<string, Provider[]>(),
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
      const response = await fetch('https://api.routstr.com/v1/providers/?include_json=true');
      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }
      const data = await response.json();

      // Assemble models from provider health responses and deduplicate
      const modelMap = new Map<string, Model>();
      const providerMap = new Map<string, Provider[]>();
      const providers = Array.isArray(data.providers) ? data.providers : [];
      providers
        .filter((entry: ProviderWithHealth) => {
          // Filter out providers that only have staging endpoints or are tagged as staging
          const provider = entry?.provider;
          const allEndpoints = provider?.endpoint_urls || [];
          const nameOrTag = `${provider?.name || ''}`.toLowerCase();
          const looksLikeStaging = nameOrTag.includes('staging');
          return !shouldHideProvider(allEndpoints) && !looksLikeStaging;
        })
        .forEach((entry: ProviderWithHealth) => {
          const health = entry?.health;
          const providerObj = entry?.provider as Provider | undefined;
          const models = health?.json?.models as Model[] | undefined;
          
          // Filter staging endpoints from provider object
          if (providerObj) {
            const filteredEndpoints = filterStagingEndpoints(providerObj.endpoint_urls || []);
            providerObj.endpoint_urls = filteredEndpoints;
            providerObj.endpoint_url = filteredEndpoints[0] || providerObj.endpoint_url || '';
          }
          
          if (Array.isArray(models)) {
            models.forEach((m) => {
              modelMap.set(m.id, m);
              if (providerObj) {
                const existing = providerMap.get(m.id) || [];
                providerMap.set(m.id, [...existing, providerObj]);
              }
            });
          }
        });

      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { models: Array.from(modelMap.values()), providerMap },
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
    const target = normalize(id);

    // Exact match
    let foundModel = state.models.find(m => m.id === id);
    if (foundModel) return foundModel;

    // Case-insensitive / decoded match
    foundModel = state.models.find(m => normalize(m.id) === target);
    if (foundModel) return foundModel;

    // Fallback: match last segment if unique
    const targetLast = target.split('/').pop();
    const candidates = state.models.filter(m => normalize(m.id).split('/').pop() === targetLast);
    if (candidates.length === 1) return candidates[0];

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
