export interface Model {
  name: string;
  cost_per_1m_prompt_tokens: number;
  cost_per_1m_completion_tokens: number;
  currency: string;
}

// Import models from models.json
import modelsData from '../../models.json';

// Parse and export the models
export const models: Model[] = modelsData.models;

// Extract the provider name from model path (e.g., "meta-llama" from "meta-llama/Llama-3-8b-chat-hf")
export function getProviderFromModelName(modelName: string): string {
  const parts = modelName.split('/');
  if (parts.length > 1) {
    return parts[0];
  }
  return 'Unknown';
}

// Format price as a string
export function formatPrice(model: Model): string {
  const promptPrice = (model.cost_per_1m_prompt_tokens / 1000).toFixed(6);
  const completionPrice = (model.cost_per_1m_completion_tokens / 1000).toFixed(6);
  
  if (promptPrice === completionPrice) {
    return `$${promptPrice} / token`;
  }
  
  return `$${promptPrice}-${completionPrice} / token`;
}

// Group models by provider
export function groupModelsByProvider(): Record<string, Model[]> {
  const grouped: Record<string, Model[]> = {};
  
  models.forEach(model => {
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
  // Sort by a combination of factors and return top N
  return [...models]
    .sort((a, b) => 
      // Prioritize models from major providers
      (getProviderFromModelName(b.name).localeCompare(getProviderFromModelName(a.name)))
    )
    .slice(0, count);
}

// Get a model name for example usage
export function getExampleModel(): string {
  // Find a reasonably priced model from a well-known provider for examples
  const candidates = models.filter(model => 
    (model.name.includes('mistral') || model.name.includes('llama') || model.name.includes('deepseek')) &&
    model.cost_per_1m_prompt_tokens < 1.0
  );
  
  if (candidates.length > 0) {
    return candidates[0].name;
  }
  
  // Fallback to first model if no good candidates
  return models[0].name;
} 