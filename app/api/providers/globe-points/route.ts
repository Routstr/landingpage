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
import { fetchGeoForHost, mapWithConcurrency, GEO_LOOKUP_CONCURRENCY } from "@/lib/globe/geo-lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POINTS_CACHE_TTL_MS = 1000 * 60 * 10;
const EMPTY_POINTS_CACHE_TTL_MS = 1000 * 60;
const FALLBACK_POINTS_MAX_AGE_MS = 1000 * 60 * 30;

let lastSuccessfulPoints: { points: ProviderPoint[]; createdAt: number } | null = null;
let cachedPointsSnapshot: { points: ProviderPoint[]; expiresAt: number } | null = null;
let inFlightPointsBuild: Promise<ProviderPoint[]> | null = null;

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

function readCachedPointsSnapshot(): ProviderPoint[] | null {
  if (!cachedPointsSnapshot) return null;
  if (cachedPointsSnapshot.expiresAt <= Date.now()) {
    cachedPointsSnapshot = null;
    return null;
  }
  return cachedPointsSnapshot.points;
}

function storeCachedPointsSnapshot(points: ProviderPoint[], ttlMs = POINTS_CACHE_TTL_MS): void {
  cachedPointsSnapshot = {
    points,
    expiresAt: Date.now() + ttlMs,
  };
}

function readRecentFallbackPoints(): ProviderPoint[] | null {
  if (!lastSuccessfulPoints) return null;
  return Date.now() - lastSuccessfulPoints.createdAt <= FALLBACK_POINTS_MAX_AGE_MS
    ? lastSuccessfulPoints.points
    : null;
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

async function toProviderGlobePoint(provider: ProviderApiRecord): Promise<ProviderPoint | null> {
  const metadataCoordinates = extractCoordinatesFromMetadata(provider);
  if (metadataCoordinates) {
    return {
      id: provider.id,
      name: provider.name,
      description: provider.description,
      createdAt: provider.created_at,
      mints: provider.mint_urls,
      pubkey: provider.pubkey,
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
    pubkey: provider.pubkey,
    lat: coordinates.lat,
    lng: coordinates.lng,
  };
}

async function buildProviderPoints(): Promise<ProviderPoint[]> {
  const providers = await fetchProvidersList();
  const visibleProviders = providers
    .filter((provider) => isProviderVisible(provider))
    .filter((provider) => !isOnionOnlyProvider(provider));

  const resolved = await mapWithConcurrency(
    visibleProviders,
    GEO_LOOKUP_CONCURRENCY,
    toProviderGlobePoint
  );

  return resolved.filter((point): point is ProviderPoint => point !== null);
}

export async function GET() {
  try {
    const cachedSnapshot = readCachedPointsSnapshot();
    if (cachedSnapshot) {
      return NextResponse.json(
        { points: cachedSnapshot },
        {
          headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
          },
        }
      );
    }

    const buildPromise =
      inFlightPointsBuild ??
      (inFlightPointsBuild = buildProviderPoints().finally(() => {
        inFlightPointsBuild = null;
      }));
    const points = await buildPromise;

    if (points.length > 0) {
      lastSuccessfulPoints = { points, createdAt: Date.now() };
      storeCachedPointsSnapshot(points);
      return NextResponse.json(
        { points },
        {
          headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
          },
        }
      );
    }

    const fallbackPoints = readRecentFallbackPoints();
    if (fallbackPoints) {
      return NextResponse.json(
        { points: fallbackPoints },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
          },
        }
      );
    }

    storeCachedPointsSnapshot([], EMPTY_POINTS_CACHE_TTL_MS);
    return NextResponse.json(
      { points: [] as ProviderPoint[] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("Failed to build globe points from provider endpoint IPs:", error);

    const fallbackPoints = readRecentFallbackPoints();
    if (fallbackPoints) {
      return NextResponse.json(
        { points: fallbackPoints },
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
