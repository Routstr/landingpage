import dns from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
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
  type ProviderPoint,
} from "@/lib/globe/provider-points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IPWHO_BASE_URL = "https://ipwho.is";
const IP_API_BASE_URL = "http://ip-api.com/json";
const GEO_TIMEOUT_MS = 8000;
const GEO_CACHE_TTL_MS = 1000 * 60 * 60;

type IpWhoApiResponse = {
  success?: boolean;
  latitude?: number;
  longitude?: number;
};

type IpApiResponse = {
  status?: string;
  lat?: number;
  lon?: number;
};

type CachedGeoPoint = {
  lat: number;
  lng: number;
  expiresAt: number;
};

const geoCache = new Map<string, CachedGeoPoint>();
const inFlightGeoLookups = new Map<string, Promise<{ lat: number; lng: number } | null>>();
let lastSuccessfulPoints: ProviderPoint[] = [];

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

function getHostnameFromEndpoint(endpoint: string): string | null {
  const normalized = normalizeEndpointForFetch(endpoint.trim());
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

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

function isPublicIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return false;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return false;
  }
  if (normalized.startsWith("ff")) return false;
  return true;
}

function isPublicIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPublicIpv4(ip);
  if (family === 6) return isPublicIpv6(ip);
  return false;
}

function readCachedGeo(cacheKey: string): { lat: number; lng: number } | null {
  const cached = geoCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    geoCache.delete(cacheKey);
    return null;
  }
  return { lat: cached.lat, lng: cached.lng };
}

function storeCachedGeo(cacheKey: string, lat: number, lng: number): void {
  geoCache.set(cacheKey, {
    lat,
    lng,
    expiresAt: Date.now() + GEO_CACHE_TTL_MS,
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

async function resolveHostToPublicIp(host: string): Promise<string | null> {
  if (host.endsWith(".onion")) return null;

  if (isIP(host) > 0) {
    return isPublicIp(host) ? host : null;
  }

  try {
    const resolved = await dns.lookup(host, { family: 4 });
    if (isPublicIp(resolved.address)) return resolved.address;
  } catch {
    // Ignore IPv4 lookup failure and try IPv6.
  }

  try {
    const resolved = await dns.lookup(host, { family: 6 });
    if (isPublicIp(resolved.address)) return resolved.address;
  } catch {
    return null;
  }

  return null;
}

async function fetchGeoViaIpWho(target: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await withTimeout(
      fetch(`${IPWHO_BASE_URL}/${encodeURIComponent(target)}`, {
        headers: { accept: "application/json" },
      }),
      GEO_TIMEOUT_MS
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as IpWhoApiResponse;
    if (
      payload.success !== true ||
      !isValidLatitude(payload.latitude) ||
      !isValidLongitude(payload.longitude)
    ) {
      return null;
    }

    return { lat: payload.latitude, lng: payload.longitude };
  } catch {
    return null;
  }
}

async function fetchGeoViaIpApi(target: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await withTimeout(
      fetch(`${IP_API_BASE_URL}/${encodeURIComponent(target)}?fields=status,lat,lon`, {
        headers: { accept: "application/json" },
      }),
      GEO_TIMEOUT_MS
    );
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
  } catch {
    return null;
  }
}

async function fetchGeoForHost(host: string): Promise<{ lat: number; lng: number } | null> {
  const cached = readCachedGeo(host);
  if (cached) return cached;

  const inFlight = inFlightGeoLookups.get(host);
  if (inFlight) return inFlight;

  const lookupPromise = (async () => {
    try {
      const fromHostIpApi = await fetchGeoViaIpApi(host);
      if (fromHostIpApi) {
        storeCachedGeo(host, fromHostIpApi.lat, fromHostIpApi.lng);
        return fromHostIpApi;
      }

      const fromHostIpWho = await fetchGeoViaIpWho(host);
      if (fromHostIpWho) {
        storeCachedGeo(host, fromHostIpWho.lat, fromHostIpWho.lng);
        return fromHostIpWho;
      }

      const resolvedIp = await resolveHostToPublicIp(host);
      if (!resolvedIp) return null;

      const ipCacheKey = `ip:${resolvedIp}`;
      const ipCached = readCachedGeo(ipCacheKey);
      if (ipCached) {
        storeCachedGeo(host, ipCached.lat, ipCached.lng);
        return ipCached;
      }

      const fromIpIpWho = await fetchGeoViaIpWho(resolvedIp);
      if (fromIpIpWho) {
        storeCachedGeo(ipCacheKey, fromIpIpWho.lat, fromIpIpWho.lng);
        storeCachedGeo(host, fromIpIpWho.lat, fromIpIpWho.lng);
        return fromIpIpWho;
      }

      const fromIpIpApi = await fetchGeoViaIpApi(resolvedIp);
      if (fromIpIpApi) {
        storeCachedGeo(ipCacheKey, fromIpIpApi.lat, fromIpIpApi.lng);
        storeCachedGeo(host, fromIpIpApi.lat, fromIpIpApi.lng);
        return fromIpIpApi;
      }

      return null;
    } finally {
      inFlightGeoLookups.delete(host);
    }
  })();

  inFlightGeoLookups.set(host, lookupPromise);
  return lookupPromise;
}

async function toProviderGlobePoint(provider: ProviderApiRecord): Promise<ProviderPoint | null> {
  const metadataCoordinates = extractCoordinatesFromMetadata(provider);
  if (metadataCoordinates) {
    return {
      id: provider.id,
      name: provider.name,
      description: provider.description,
      createdAt: provider.created_at,
      mints: provider.mint_urls,
      lat: metadataCoordinates.lat,
      lng: metadataCoordinates.lng,
    };
  }

  const primaryEndpoint = getPrimaryHttpEndpoint(provider);
  if (!primaryEndpoint) return null;

  const hostname = getHostnameFromEndpoint(primaryEndpoint);
  if (!hostname || hostname.endsWith(".onion")) return null;

  const coordinates = await fetchGeoForHost(hostname);
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

export async function GET() {
  try {
    const providers = await fetchProvidersList();
    const visibleProviders = providers
      .filter((provider) => isProviderVisible(provider))
      .filter((provider) => !isOnionOnlyProvider(provider));

    const points: ProviderPoint[] = [];
    for (const provider of visibleProviders) {
      const point = await toProviderGlobePoint(provider);
      if (point) points.push(point);
    }

    if (points.length > 0) {
      lastSuccessfulPoints = points;
      return NextResponse.json(
        { points },
        {
          headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
          },
        }
      );
    }

    if (lastSuccessfulPoints.length > 0) {
      return NextResponse.json(
        { points: lastSuccessfulPoints },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
          },
        }
      );
    }

    return NextResponse.json(
      { points: [] as ProviderPoint[] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to build globe points from provider endpoint IPs:", error);

    if (lastSuccessfulPoints.length > 0) {
      return NextResponse.json(
        { points: lastSuccessfulPoints },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
          },
        }
      );
    }

    return NextResponse.json({ points: [] as ProviderPoint[] }, { status: 500 });
  }
}
