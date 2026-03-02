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

const IPWHO_BASE_URL = "https://ipwho.is";
const IP_API_BASE_URL = "http://ip-api.com/json";
const GEO_CACHE_TTL_MS = 1000 * 60 * 60;

type CachedGeoPoint = {
  lat: number;
  lng: number;
  expiresAt: number;
};

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

const geoCache = new Map<string, CachedGeoPoint>();
const inFlightGeoLookups = new Map<string, Promise<{ lat: number; lng: number } | null>>();
let lastSuccessfulPoints: ProviderPoint[] = [];

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

async function resolveHostToPublicIp(host: string): Promise<string | null> {
  if (host.endsWith(".onion")) return null;

  if (isIP(host) > 0) {
    return isPublicIp(host) ? host : null;
  }

  try {
    const resolved = await dns.lookup(host, { family: 4 });
    if (isPublicIp(resolved.address)) return resolved.address;
  } catch {
    // Try IPv6 if IPv4 lookup failed.
  }

  try {
    const resolved = await dns.lookup(host, { family: 6 });
    if (isPublicIp(resolved.address)) return resolved.address;
  } catch {
    return null;
  }

  return null;
}

async function fetchGeoViaIpWho(ip: string): Promise<{ lat: number; lng: number } | null> {
  if (!isPublicIp(ip)) return null;

  try {
    const response = await fetch(`${IPWHO_BASE_URL}/${encodeURIComponent(ip)}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as IpWhoApiResponse;
    const lat = payload.latitude;
    const lng = payload.longitude;
    if (!isValidLatitude(lat) || !isValidLongitude(lng)) return null;
    if (payload.success !== true) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

async function fetchGeoViaIpApi(target: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `${IP_API_BASE_URL}/${encodeURIComponent(target)}?fields=status,lat,lon`,
      {
        headers: { accept: "application/json" },
      }
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as IpApiResponse;
    const lat = payload.lat;
    const lng = payload.lon;
    if (payload.status !== "success") return null;
    if (!isValidLatitude(lat) || !isValidLongitude(lng)) return null;

    return { lat, lng };
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
      // Primary strategy: geolocate the endpoint host/IP directly.
      const fromHost = await fetchGeoViaIpApi(host);
      if (fromHost) {
        storeCachedGeo(host, fromHost.lat, fromHost.lng);
        return fromHost;
      }

      // Secondary strategy: resolve host to IP locally, then geolocate that IP.
      const resolvedIp = await resolveHostToPublicIp(host);
      if (!resolvedIp) return null;

      const ipCacheKey = `ip:${resolvedIp}`;
      const ipCached = readCachedGeo(ipCacheKey);
      if (ipCached) {
        storeCachedGeo(host, ipCached.lat, ipCached.lng);
        return ipCached;
      }

      const fromIpWho = await fetchGeoViaIpWho(resolvedIp);
      if (fromIpWho) {
        storeCachedGeo(ipCacheKey, fromIpWho.lat, fromIpWho.lng);
        storeCachedGeo(host, fromIpWho.lat, fromIpWho.lng);
        return fromIpWho;
      }

      const fromIpApi = await fetchGeoViaIpApi(resolvedIp);
      if (fromIpApi) {
        storeCachedGeo(ipCacheKey, fromIpApi.lat, fromIpApi.lng);
        storeCachedGeo(host, fromIpApi.lat, fromIpApi.lng);
        return fromIpApi;
      }

      return null;
    } finally {
      inFlightGeoLookups.delete(host);
    }
  })();

  inFlightGeoLookups.set(host, lookupPromise);
  return lookupPromise;
}

async function toProviderGlobePoint(
  provider: ProviderApiRecord
): Promise<ProviderPoint | null> {
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
      try {
        const point = await toProviderGlobePoint(provider);
        if (point) points.push(point);
      } catch {
        // Skip providers that fail geolocation.
      }
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

    return NextResponse.json(
      { points: [] as ProviderPoint[] },
      { status: 500 }
    );
  }
}
