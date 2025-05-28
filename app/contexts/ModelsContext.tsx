'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { Model, RoutstrNodeInfo } from '@/app/data/models';

interface ModelsState {
  models: Model[];
  nodeInfo: Partial<RoutstrNodeInfo>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

type ModelsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { models: Model[]; nodeInfo: RoutstrNodeInfo } }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const initialState: ModelsState = {
  models: [],
  nodeInfo: {
    name: "Routstr Node",
    description: "A Routstr Node",
    version: "0.0.1"
  },
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
        nodeInfo: action.payload.nodeInfo,
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
      const response = await fetch('https://api.routstr.com/');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const data: RoutstrNodeInfo = await response.json();
      
      dispatch({ 
        type: 'FETCH_SUCCESS', 
        payload: { models: data.models, nodeInfo: data } 
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
    // Direct match by ID
    let foundModel = state.models.find(m => m.id === id);

    // Case-insensitive match by ID
    if (!foundModel) {
      foundModel = state.models.find(m => m.id.toLowerCase() === id.toLowerCase());
    }

    return foundModel;
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
