import {
  fetchProvidersList,
  getPrimaryHttpEndpoint,
  isOnionOnlyProvider,
  isProviderVisible,
  normalizeEndpointForFetch,
  type ProviderApiRecord,
} from "@/lib/api/providers";
import {
  isValidLatitude,
  isValidLongitude,
  isProviderPoint,
  type ProviderPoint,
  type ProviderPointsResponse,
} from "@/lib/globe/provider-points";

type DnsAnswer = {
  type?: number;
  data?: string;
};

type DnsResolveResponse = {
  Answer?: DnsAnswer[];
};

type IpWhoResponse = {
  success?: boolean;
  latitude?: number;
  longitude?: number;
};

type IpApiResponse = {
  status?: string;
  lat?: number;
  lon?: number;
};

const GEO_LOOKUP_TIMEOUT_MS = 5000;
const DEFAULT_CONCURRENCY = 4;

function isPublicIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;

  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a >= 224) return false;
  return true;
}

function toEndpointHost(endpoint: string): string | null {
  const normalized = normalizeEndpointForFetch(endpoint.trim());
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    return parsed.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export async function fetchProviderPointsFromApiRoute(): Promise<ProviderPoint[]> {
  const response = await fetch("/api/providers/globe-points", {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch provider globe points: ${response.status}`);
  }

  const payload = (await response.json()) as ProviderPointsResponse;
  if (!Array.isArray(payload.points)) return [];
  return payload.points.filter(isProviderPoint);
}

async function resolveProviderPoint(
  provider: ProviderApiRecord,
  hostToIp: Map<string, Promise<string | null>>,
  ipToCoords: Map<string, Promise<{ lat: number; lng: number } | null>>
): Promise<ProviderPoint | null> {
  const endpoint = getPrimaryHttpEndpoint(provider);
  if (!endpoint) return null;

  const host = toEndpointHost(endpoint);
  if (!host || host.endsWith(".onion")) return null;

  const resolveHostToIp = (targetHost: string): Promise<string | null> => {
    if (isPublicIpv4(targetHost)) return Promise.resolve(targetHost);

    const existing = hostToIp.get(targetHost);
    if (existing) return existing;

    const lookupPromise = withTimeout(
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(targetHost)}&type=A`, {
        headers: { accept: "application/json" },
      })
        .then(async (res) => {
          if (!res.ok) return null;
          const payload = (await res.json()) as DnsResolveResponse;
          const answers = Array.isArray(payload.Answer) ? payload.Answer : [];
          const ipv4Answers = answers
            .filter((answer) => answer?.type === 1 && typeof answer.data === "string")
            .map((answer) => answer.data as string)
            .filter(isPublicIpv4);
          return ipv4Answers[0] ?? null;
        })
        .catch(() => null),
      GEO_LOOKUP_TIMEOUT_MS
    ).catch(() => null);

    hostToIp.set(targetHost, lookupPromise);
    return lookupPromise;
  };

  const geolocateIp = (ip: string): Promise<{ lat: number; lng: number } | null> => {
    const existing = ipToCoords.get(ip);
    if (existing) return existing;

    const geoPromise = withTimeout(
      fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon`, {
        headers: { accept: "application/json" },
      })
        .then(async (res) => {
          if (res.ok) {
            const payload = (await res.json()) as IpApiResponse;
            if (
              payload.status === "success" &&
              isValidLatitude(payload.lat) &&
              isValidLongitude(payload.lon)
            ) {
              return { lat: payload.lat, lng: payload.lon };
            }
          }

          const fallbackRes = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
            headers: { accept: "application/json" },
          });
          if (!fallbackRes.ok) return null;

          const fallbackPayload = (await fallbackRes.json()) as IpWhoResponse;
          if (
            fallbackPayload.success !== true ||
            !isValidLatitude(fallbackPayload.latitude) ||
            !isValidLongitude(fallbackPayload.longitude)
          ) {
            return null;
          }
          return {
            lat: fallbackPayload.latitude,
            lng: fallbackPayload.longitude,
          };
        })
        .catch(() => null),
      GEO_LOOKUP_TIMEOUT_MS
    ).catch(() => null);

    ipToCoords.set(ip, geoPromise);
    return geoPromise;
  };

  const ip = await resolveHostToIp(host);
  if (!ip) return null;

  const coordinates = await geolocateIp(ip);
  if (!coordinates) return null;

  return {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    createdAt: provider.created_at,
    mints: provider.mint_urls,
    lat: coordinates.lat,
    lng: coordinates.lng,
  };
}

export async function fetchProviderPointsFromEndpointIpProgressive(
  onPoint: (point: ProviderPoint) => void,
  options?: { signal?: AbortSignal; concurrency?: number }
): Promise<void> {
  const providers = await fetchProvidersList();
  const visibleProviders = providers
    .filter((provider) => isProviderVisible(provider))
    .filter((provider) => !isOnionOnlyProvider(provider));

  const hostToIp = new Map<string, Promise<string | null>>();
  const ipToCoords = new Map<string, Promise<{ lat: number; lng: number } | null>>();
  const signal = options?.signal;
  const workerCount = Math.max(
    1,
    Math.min(options?.concurrency ?? DEFAULT_CONCURRENCY, visibleProviders.length || 1)
  );
  let cursor = 0;

  const workers = Array.from({ length: workerCount }, async () => {
    for (;;) {
      if (signal?.aborted) return;
      const provider = visibleProviders[cursor++];
      if (!provider) return;

      const point = await resolveProviderPoint(provider, hostToIp, ipToCoords);
      if (point && !signal?.aborted) {
        onPoint(point);
      }
    }
  });

  await Promise.all(workers);
}
