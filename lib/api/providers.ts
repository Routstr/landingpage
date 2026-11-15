import { SimplePool } from "nostr-tools";
import type { Event } from "nostr-tools";
import { filterStagingEndpoints, shouldHideProvider } from "@/lib/staging-filter";
import { consolidateAnnouncementsByKey } from "./provider-consolidation";

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

const isLocalIpv4 = (host: string): boolean => {
  const m = host.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

/**
 * An endpoint on the announcer's own machine or network (localhost, names
 * without a dot or under .local, .internal, .lan or .home.arpa, loopback and
 * private addresses). Nobody else can reach it, and fetching it from this
 * site makes the browser ask the visitor for local network access.
 */
export function isLocalNetworkEndpoint(urlOrHost: string): boolean {
  let host: string;
  try {
    host = new URL(normalizeEndpointForFetch(urlOrHost.trim()), "https://routstr.com").hostname
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return false;
  }
  if (host === "localhost" || /\.(localhost|local|internal|lan|home\.arpa)$/.test(host)) {
    return true;
  }
  if (!host.startsWith("[")) return !host.includes(".") || isLocalIpv4(host);
  const v6 = host.slice(1, -1);
  // the URL parser writes an IPv4-mapped address in hex: ::ffff:7f00:1
  const mapped = v6.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mapped) {
    const hi = parseInt(mapped[1], 16);
    const lo = parseInt(mapped[2], 16);
    return isLocalIpv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return v6 === "::" || v6 === "::1" || /^f[cd][0-9a-f]{2}:/.test(v6) || /^fe[89ab][0-9a-f]:/.test(v6);
}

export function getProviderNonStagingEndpoints(provider: {
  endpoint_url: string;
  endpoint_urls?: readonly string[];
}): string[] {
  return filterStagingEndpoints(getProviderEndpoints(provider)).filter(
    (url) => !isLocalNetworkEndpoint(url)
  );
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
  const fallback = isLocalNetworkEndpoint(provider.endpoint_url || "") ? "" : provider.endpoint_url;
  return (nonOnion[0] || fallback || "").trim();
}

export function isProviderVisible(provider: {
  endpoint_url: string;
  endpoint_urls?: readonly string[];
  name?: string;
}): boolean {
  const endpoints = getProviderEndpoints(provider);
  const nameOrTag = `${provider.name || ""}`.toLowerCase();
  const looksLikeStaging = nameOrTag.includes("staging");
  const localOnly = endpoints.length > 0 && endpoints.every(isLocalNetworkEndpoint);
  return !shouldHideProvider(endpoints) && !looksLikeStaging && !localOnly;
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

  // Same address (pubkey + d) from both sources collapses to the newest event.
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

  // A key that rotated its `d` tag still has its previous announcement on the
  // relays, so keep one row per key (see provider-consolidation.ts).
  return consolidateAnnouncementsByKey(Array.from(merged.values())).sort(
    (a, b) => b.created_at - a.created_at
  );
}
