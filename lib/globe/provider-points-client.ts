import {
  fetchProvidersList,
  getPrimaryHttpEndpoint,
  isProviderVisible,
  normalizeEndpointForFetch,
  type ProviderApiRecord,
} from "@/lib/api/providers";
import {
  isValidLatitude,
  isValidLongitude,
  type ProviderPoint,
} from "@/lib/globe/provider-points";

type IpApiResponse = {
  status?: string;
  lat?: number;
  lon?: number;
};

const GEO_LOOKUP_TIMEOUT_MS = 5000;
const DEFAULT_CONCURRENCY = 4;

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
    timeoutId = setTimeout(
      () => reject(new Error(`Timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function extractCoordinatesFromMetadata(
  provider: ProviderApiRecord
): { lat: number; lng: number } | null {
  try {
    const parsed = JSON.parse(provider.content || "{}") as Record<string, unknown>;

    const rootLat =
      typeof parsed.lat === "number"
        ? parsed.lat
        : typeof parsed.latitude === "number"
          ? parsed.latitude
          : undefined;
    const rootLng =
      typeof parsed.lng === "number"
        ? parsed.lng
        : typeof parsed.longitude === "number"
          ? parsed.longitude
          : undefined;

    if (isValidLatitude(rootLat) && isValidLongitude(rootLng)) {
      return { lat: rootLat, lng: rootLng };
    }

    const location =
      parsed.location && typeof parsed.location === "object"
        ? (parsed.location as Record<string, unknown>)
        : null;
    if (!location) return null;

    const locationLat =
      typeof location.lat === "number"
        ? location.lat
        : typeof location.latitude === "number"
          ? location.latitude
          : undefined;
    const locationLng =
      typeof location.lng === "number"
        ? location.lng
        : typeof location.longitude === "number"
          ? location.longitude
          : undefined;

    if (isValidLatitude(locationLat) && isValidLongitude(locationLng)) {
      return { lat: locationLat, lng: locationLng };
    }
  } catch {
    return null;
  }

  return null;
}

async function geolocateWithIpApi(
  host: string,
  cache: Map<string, Promise<{ lat: number; lng: number } | null>>
): Promise<{ lat: number; lng: number } | null> {
  if (!host || host.endsWith(".onion")) return null;

  const existing = cache.get(host);
  if (existing) return existing;

  const lookupPromise = withTimeout(
    fetch(
      `http://ip-api.com/json/${encodeURIComponent(host)}?fields=status,lat,lon`,
      {
        headers: { accept: "application/json" },
      }
    ),
    GEO_LOOKUP_TIMEOUT_MS
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as IpApiResponse;
      if (
        payload.status !== "success" ||
        !isValidLatitude(payload.lat) ||
        !isValidLongitude(payload.lon)
      ) {
        return null;
      }
      return { lat: payload.lat, lng: payload.lon };
    })
    .catch(() => null);

  cache.set(host, lookupPromise);
  return lookupPromise;
}

function buildProviderPoint(
  provider: ProviderApiRecord,
  coords: { lat: number; lng: number }
): ProviderPoint {
  return {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    createdAt: provider.created_at,
    mints: provider.mint_urls,
    lat: coords.lat,
    lng: coords.lng,
  };
}

async function resolveProviderPoint(
  provider: ProviderApiRecord,
  hostCoordinatesCache: Map<string, Promise<{ lat: number; lng: number } | null>>
): Promise<ProviderPoint | null> {
  const metadataCoordinates = extractCoordinatesFromMetadata(provider);
  if (metadataCoordinates) {
    return buildProviderPoint(provider, metadataCoordinates);
  }

  const endpoint = getPrimaryHttpEndpoint(provider);
  if (!endpoint) return null;

  const host = toEndpointHost(endpoint);
  if (!host) return null;

  const coordinates = await geolocateWithIpApi(host, hostCoordinatesCache);
  if (!coordinates) return null;

  return buildProviderPoint(provider, coordinates);
}

export async function fetchProviderPointsFromEndpointIpProgressive(
  onPoint: (point: ProviderPoint) => void,
  options?: { signal?: AbortSignal; concurrency?: number }
): Promise<void> {
  const providers = await fetchProvidersList();
  const visibleProviders = providers.filter((provider) => isProviderVisible(provider));
  const hostCoordinatesCache = new Map<
    string,
    Promise<{ lat: number; lng: number } | null>
  >();

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

      const point = await resolveProviderPoint(provider, hostCoordinatesCache);
      if (point && !signal?.aborted) {
        onPoint(point);
      }
    }
  });

  await Promise.all(workers);
}
