import { filterStagingEndpoints, shouldHideProvider } from '@/lib/staging-filter';

interface ApiProvider {
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
    const res = await fetch('https://api.routstr.com/v1/providers/');
    if (!res.ok) throw new Error(`Failed to fetch providers: ${res.status}`);
    const json = await res.json();
    const list: ApiProvider[] = Array.isArray(json.providers) ? (json.providers as ApiProvider[]) : [];

    // Filter out providers that have any staging endpoints
    const visibleProviders = list.filter((p) => {
      const allEndpoints = (Array.isArray(p.endpoint_urls) && p.endpoint_urls.length > 0)
        ? p.endpoint_urls!
        : [p.endpoint_url].filter(Boolean);
      return !shouldHideProvider(allEndpoints);
    });

    // Helper to normalize URL for fetch
    const normalizeForFetch = (urlOrHost: string): string => {
      if (!urlOrHost) return '';
      const hasProtocol = /^(https?:)?\/\//i.test(urlOrHost);
      return hasProtocol ? urlOrHost : `https://${urlOrHost}`;
    };

    // Timeout-enabled fetch
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

    const results = await Promise.allSettled(
      visibleProviders.map(async (p) => {
        const nonStaging = filterStagingEndpoints(p.endpoint_urls || []);
        const http: string[] = [];
        const tor: string[] = [];
        for (const url of nonStaging) {
          if (typeof url !== 'string') continue;
          if (url.includes('.onion')) tor.push(url);
          else http.push(url);
        }

        // Determine primary HTTP endpoint for fetching models
        const primary = (http[0] || p.endpoint_url || '').trim();
        let supportedModels: string[] = [];
        if (primary) {
          try {
            const base = normalizeForFetch(primary).replace(/\/$/, '');
            const modelsUrl = `${base}/v1/models`;
            const r = await fetchWithTimeout(modelsUrl, { headers: { 'accept': 'application/json' } }, 8000);
            if (r.ok) {
              const m = await r.json();
              const arr: Array<{ id: string }> = Array.isArray(m?.data) ? m.data : [];
              supportedModels = arr.map((x) => x.id).filter((x) => typeof x === 'string');
            }
          } catch {
            // ignore per-provider errors
          }
        }

        const summary: ProviderSummary = {
          id: p.id,
          pubkey: p.pubkey,
          name: p.name,
          description: p.description,
          endpoints: { http, tor },
          mint_url: p.mint_url ?? null,
          version: p.version,
          supported_models: supportedModels,
        };
        return summary;
      })
    );

    providers = results
      .filter((r): r is PromiseFulfilledResult<ProviderSummary> => r.status === 'fulfilled')
      .map((r) => r.value);
  } catch (err) {
    console.error('Error fetching providers:', err);
    providers = [];
  }
}


