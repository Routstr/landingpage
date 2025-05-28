# React Data Management: Best Practices Guide

## The Problem with Your Current Approach

Your original code used this pattern:

```typescript
// ❌ BAD: Global mutable state
export let models: Model[] = [];

export async function fetchModels(): Promise<void> {
  // Directly mutates global variable
  models = data.models;
}
```

### Issues with This Approach:

1. **No Reactivity**: React doesn't know when `models` changes, so components won't re-render
2. **Global Mutable State**: Creates unpredictable behavior and makes testing difficult
3. **Race Conditions**: Multiple components calling `fetchModels()` can cause conflicts
4. **No Loading/Error States**: Components can't show proper loading or error feedback
5. **Memory Leaks**: No cleanup mechanism for the global state
6. **Hard to Debug**: Global state makes it difficult to track where changes come from

## ✅ Better Approaches

### 1. React Context + useReducer (Recommended)

This is what we implemented for your project:

```typescript
// ModelsContext.tsx
interface ModelsState {
  models: Model[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

type ModelsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { models: Model[] } }
  | { type: 'FETCH_ERROR'; payload: string };

function modelsReducer(state: ModelsState, action: ModelsAction): ModelsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, models: action.payload.models };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(modelsReducer, initialState);
  
  const fetchModels = async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const data = await fetch('https://api.routstr.com/');
      dispatch({ type: 'FETCH_SUCCESS', payload: { models: data.models } });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error.message });
    }
  };

  return (
    <ModelsContext.Provider value={{ ...state, fetchModels }}>
      {children}
    </ModelsContext.Provider>
  );
}
```

**Benefits:**
- ✅ Proper React state management with automatic re-renders
- ✅ Centralized state with predictable updates
- ✅ Built-in loading and error states
- ✅ Prevents duplicate API calls with caching
- ✅ Easy to test and debug
- ✅ Type-safe with TypeScript

### 2. Custom Hook with useState

For simpler cases:

```typescript
function useModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.routstr.com/');
      const data = await response.json();
      setModels(data.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, error, refetch: fetchModels };
}
```

### 3. State Management Libraries

For larger applications:

#### Zustand (Lightweight)
```typescript
import { create } from 'zustand';

interface ModelsStore {
  models: Model[];
  loading: boolean;
  error: string | null;
  fetchModels: () => Promise<void>;
}

export const useModelsStore = create<ModelsStore>((set) => ({
  models: [],
  loading: false,
  error: null,
  fetchModels: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('https://api.routstr.com/');
      const data = await response.json();
      set({ models: data.models, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));
```

#### Redux Toolkit (For complex apps)
```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchModels = createAsyncThunk(
  'models/fetchModels',
  async () => {
    const response = await fetch('https://api.routstr.com/');
    return response.json();
  }
);

const modelsSlice = createSlice({
  name: 'models',
  initialState: {
    models: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchModels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.loading = false;
        state.models = action.payload.models;
      })
      .addCase(fetchModels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});
```

### 4. Server State Libraries

For data fetching specifically:

#### TanStack Query (React Query)
```typescript
import { useQuery } from '@tanstack/react-query';

function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const response = await fetch('https://api.routstr.com/');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Usage in component
function ModelsPage() {
  const { data, isLoading, error, refetch } = useModels();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data.models.map(model => (
        <div key={model.id}>{model.name}</div>
      ))}
    </div>
  );
}
```

#### SWR
```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function useModels() {
  const { data, error, mutate } = useSWR('https://api.routstr.com/', fetcher);
  
  return {
    models: data?.models || [],
    loading: !error && !data,
    error,
    refetch: mutate,
  };
}
```

## When to Use Each Approach

### Use React Context + useReducer when:
- You need to share state across multiple components
- State logic is complex with multiple actions
- You want built-in React patterns without external dependencies
- **✅ This is what we implemented for your project**

### Use Custom Hooks when:
- State is only needed in a few components
- Logic is simple (just fetching and storing data)
- You want to keep things lightweight

### Use Zustand when:
- You need global state but want something simpler than Redux
- You like the store pattern but want minimal boilerplate
- You need good TypeScript support

### Use Redux Toolkit when:
- You have complex state interactions
- You need time-travel debugging
- Your team is already familiar with Redux patterns

### Use TanStack Query/SWR when:
- You're primarily dealing with server state
- You want automatic caching, background updates, and error retry
- You need optimistic updates and offline support

## Migration Path for Your Project

Your project now uses the **React Context + useReducer** approach, which provides:

1. **Proper React Integration**: Components automatically re-render when data changes
2. **Loading States**: Users see loading indicators during API calls
3. **Error Handling**: Proper error messages when API calls fail
4. **Caching**: Prevents unnecessary API calls with timestamp-based caching
5. **Type Safety**: Full TypeScript support with proper typing

The updated component usage:
```typescript
// Before (❌ Bad)
import { models, fetchModels } from '@/app/data/models';

// After (✅ Good)
import { useModels } from '@/app/contexts/ModelsContext';

function MyComponent() {
  const { models, loading, error, fetchModels, findModel } = useModels();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {models.map(model => (
        <ModelCard key={model.id} model={model} />
      ))}
    </div>
  );
}
```

This approach scales well and follows React best practices while being maintainable and testable.
