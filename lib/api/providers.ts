import { filterStagingEndpoints, shouldHideProvider } from "@/lib/staging-filter";

export const PROVIDERS_API_URL = "https://api.routstr.com/v1/providers/";

export interface ProviderApiRecord {
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

interface ProviderApiListResponse {
  providers?: ProviderApiRecord[];
}

export function getProviderEndpoints(provider: {
  endpoint_url: string;
  endpoint_urls?: readonly string[];
}): string[] {
  const candidates =
    Array.isArray(provider.endpoint_urls) && provider.endpoint_urls.length > 0
      ? provider.endpoint_urls
      : [provider.endpoint_url];

  return candidates.filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0
  );
}

export function getProviderNonStagingEndpoints(provider: {
  endpoint_url: string;
  endpoint_urls?: readonly string[];
}): string[] {
  return filterStagingEndpoints(getProviderEndpoints(provider));
}

export function isOnionEndpoint(url: string): boolean {
  return url.toLowerCase().includes(".onion");
}

export function hasNonOnionEndpoint(urls: readonly string[]): boolean {
  return urls.some((url) => !isOnionEndpoint(url));
}

export function getPrimaryHttpEndpoint(provider: {
  endpoint_url: string;
  endpoint_urls?: readonly string[];
}): string {
  const nonStaging = getProviderNonStagingEndpoints(provider);
  const nonOnion = nonStaging.filter((url) => !isOnionEndpoint(url));
  return (nonOnion[0] || provider.endpoint_url || "").trim();
}

export function isProviderVisible(provider: {
  endpoint_url: string;
  endpoint_urls?: readonly string[];
  name?: string;
}): boolean {
  const endpoints = getProviderEndpoints(provider);
  const nameOrTag = `${provider.name || ""}`.toLowerCase();
  const looksLikeStaging = nameOrTag.includes("staging");
  return !shouldHideProvider(endpoints) && !looksLikeStaging;
}

export function isOnionOnlyProvider(provider: {
  endpoint_url: string;
  endpoint_urls?: readonly string[];
}): boolean {
  const nonStaging = getProviderNonStagingEndpoints(provider);
  return nonStaging.length > 0 && !hasNonOnionEndpoint(nonStaging);
}

export function normalizeEndpointForFetch(urlOrHost: string): string {
  if (!urlOrHost) return "";
  const hasProtocol = /^(https?:)?\/\//i.test(urlOrHost);
  return hasProtocol ? urlOrHost : `https://${urlOrHost}`;
}

export async function fetchProvidersList(
  fetchImpl: typeof fetch = fetch
): Promise<ProviderApiRecord[]> {
  const response = await fetchImpl(PROVIDERS_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch providers: ${response.status}`);
  }

  const payload = (await response.json()) as ProviderApiListResponse;
  return Array.isArray(payload.providers) ? payload.providers : [];
}
