export interface ApiProviderEnvelope {
  provider: {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    d_tag: string;
    endpoint_url: string;
    endpoint_urls: string[];
    name: string;
    description: string;
    contact: string | null;
    pricing_url: string | null;
    mint_url: string | null;
    version: string;
    supported_models: string[];
    content: string;
  };
  health?: {
    status_code?: number;
    endpoint?: string;
    json?: any;
  };
}

export interface ProviderSummary {
  id: string;
  pubkey: string;
  name: string;
  description: string;
  endpoints: { http: readonly string[]; tor: readonly string[] };
  mint_url?: string | null;
  version: string;
  supported_models: readonly string[];
}

export let providers: ProviderSummary[] = [];

export async function fetchProviders(): Promise<void> {
  try {
    const res = await fetch('https://staging.routstr.com/v1/providers/?include_json=true');
    if (!res.ok) throw new Error(`Failed to fetch providers: ${res.status}`);
    const json = await res.json();
    const list: ApiProviderEnvelope[] = Array.isArray(json.providers) ? json.providers : [];
    // Prefer providers that are healthy and expose models in health.json
    const filtered = list.filter((p) =>
      (p?.health?.status_code === 200) && Array.isArray(p?.health?.json?.models) && p.health!.json!.models!.length > 0
    );

    providers = filtered.map((p) => {
      const http: string[] = [];
      const tor: string[] = [];
      for (const url of p.provider.endpoint_urls || []) {
        if (typeof url !== 'string') continue;
        if (url.includes('.onion')) tor.push(url);
        else http.push(url);
      }
      // Build supported models from health.json if available, else fallback to provider.supported_models
      const supportedModelsFromHealth = Array.isArray(p?.health?.json?.models)
        ? (p.health!.json!.models as Array<{ id: string }>).map(m => m.id)
        : [];
      return {
        id: p.provider.id,
        pubkey: p.provider.pubkey,
        name: p.provider.name,
        description: p.provider.description,
        endpoints: { http, tor },
        mint_url: p.provider.mint_url,
        version: p.provider.version,
        supported_models: supportedModelsFromHealth.length > 0 ? supportedModelsFromHealth : (p.provider.supported_models || []),
      } as ProviderSummary;
    });
  } catch (err) {
    console.error('Error fetching providers:', err);
    providers = [];
  }
}


