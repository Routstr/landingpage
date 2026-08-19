import { SimplePool } from "nostr-tools";
import type { Event } from "nostr-tools";
import { filterStagingEndpoints, shouldHideProvider } from "@/lib/staging-filter";

const PROVIDER_ANNOUNCEMENT_KIND = 38421;
const DISCOVERY_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.routstr.com",
];
export const PROVIDERS_API_URL = "https://routstr.otrta.me/v1/providers/";

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

function tagValues(event: Event, name: string): string[] {
  return event.tags
    .filter((tag) => tag[0] === name && typeof tag[1] === "string" && tag[1])
    .map((tag) => tag[1]);
}

// Events missing endpoint (u) or address (d) tags are other protocols
// squatting the kind, or malformed; they are dropped.
function eventToProviderRecord(event: Event): ProviderApiRecord | null {
  const endpoints = tagValues(event, "u");
  const dTag = tagValues(event, "d")[0];
  if (endpoints.length === 0 || !dTag) return null;

  let name = "";
  let description = "";
  try {
    const content = JSON.parse(event.content) as {
      name?: unknown;
      about?: unknown;
    };
    if (typeof content.name === "string") name = content.name;
    if (typeof content.about === "string") description = content.about;
  } catch {
    // keep empty name/description for non-JSON content
  }

  return {
    id: dTag,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    endpoint_url: endpoints[0],
    endpoint_urls: endpoints,
    name,
    description,
    mint_urls: tagValues(event, "mint"),
    version: tagValues(event, "version")[0] || "",
    content: event.content,
  };
}

async function fetchProvidersFromNostr(): Promise<ProviderApiRecord[]> {
  const pool = new SimplePool();
  try {
    const events = await pool.querySync(
      DISCOVERY_RELAYS,
      { kinds: [PROVIDER_ANNOUNCEMENT_KIND], limit: 200 },
      { maxWait: 5000 }
    );

    // NIP-01 addressable-event rule: newest (pubkey, d) wins, ties to lower id.
    const latest = new Map<string, Event>();
    for (const event of events) {
      const key = `${event.pubkey}:${tagValues(event, "d")[0] ?? ""}`;
      const seen = latest.get(key);
      const wins =
        !seen ||
        event.created_at > seen.created_at ||
        (event.created_at === seen.created_at && event.id < seen.id);
      if (wins) latest.set(key, event);
    }

    return Array.from(latest.values())
      .map(eventToProviderRecord)
      .filter((record): record is ProviderApiRecord => record !== null);
  } finally {
    pool.close(DISCOVERY_RELAYS);
  }
}

async function fetchProvidersFromHttp(
  fetchImpl: typeof fetch
): Promise<ProviderApiRecord[]> {
  const response = await fetchImpl(PROVIDERS_API_URL, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch providers: ${response.status}`);
  }

  const payload = (await response.json()) as ProviderApiListResponse;
  return Array.isArray(payload.providers) ? payload.providers : [];
}

// Relays and the HTTP directory each see a partial view of the network,
// so neither is trusted alone and neither is required.
export async function fetchProvidersList(
  fetchImpl: typeof fetch = fetch
): Promise<ProviderApiRecord[]> {
  const [nostr, http] = await Promise.allSettled([
    fetchProvidersFromNostr(),
    fetchProvidersFromHttp(fetchImpl),
  ]);

  const merged = new Map<string, ProviderApiRecord>();
  for (const result of [http, nostr]) {
    if (result.status !== "fulfilled") continue;
    for (const record of result.value) {
      const key = `${record.pubkey}:${record.id}`;
      const seen = merged.get(key);
      if (!seen || record.created_at >= seen.created_at) merged.set(key, record);
    }
  }

  if (merged.size === 0) {
    if (nostr.status === "rejected") throw nostr.reason;
    if (http.status === "rejected") throw http.reason;
  }
  return Array.from(merged.values()).sort((a, b) => b.created_at - a.created_at);
}
