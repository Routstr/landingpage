import { NextResponse } from "next/server";
import { getDefaultRelays } from "@/lib/nostr";
import type { RelayPoint } from "@/lib/globe/relay-points";
import { fetchGeoForHost, mapWithConcurrency, GEO_LOOKUP_CONCURRENCY } from "@/lib/globe/geo-lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The relay set is static (not a fetched list like providers), so it can
// cache much longer — only the geolocation lookups are worth re-running.
const POINTS_CACHE_TTL_MS = 1000 * 60 * 30;

const RELAY_URLS = Array.from(
  new Set([...getDefaultRelays(), "wss://relay.routstr.com", "wss://nos.lol"])
);

let cachedPointsSnapshot: { points: RelayPoint[]; expiresAt: number } | null = null;
let lastSuccessfulPoints: RelayPoint[] = [];

function getHostnameFromRelayUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname || null;
  } catch {
    return null;
  }
}

async function toRelayGlobePoint(url: string): Promise<RelayPoint | null> {
  const hostname = getHostnameFromRelayUrl(url);
  if (!hostname) return null;

  const coordinates = await fetchGeoForHost(hostname);
  if (!coordinates) return null;

  return {
    kind: "relay",
    id: url,
    name: hostname,
    lat: coordinates.lat,
    lng: coordinates.lng,
  };
}

function readCachedPointsSnapshot(): RelayPoint[] | null {
  if (!cachedPointsSnapshot) return null;
  if (cachedPointsSnapshot.expiresAt <= Date.now()) {
    cachedPointsSnapshot = null;
    return null;
  }
  return cachedPointsSnapshot.points;
}

function storeCachedPointsSnapshot(points: RelayPoint[]): void {
  cachedPointsSnapshot = {
    points,
    expiresAt: Date.now() + POINTS_CACHE_TTL_MS,
  };
}

async function buildRelayPoints(): Promise<RelayPoint[]> {
  const resolved = await mapWithConcurrency(RELAY_URLS, GEO_LOOKUP_CONCURRENCY, toRelayGlobePoint);
  return resolved.filter((point): point is RelayPoint => point !== null);
}

export async function GET() {
  try {
    const cachedSnapshot = readCachedPointsSnapshot();
    if (cachedSnapshot) {
      return NextResponse.json(
        { points: cachedSnapshot },
        {
          headers: {
            "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
          },
        }
      );
    }

    const points = await buildRelayPoints();

    if (points.length > 0) {
      lastSuccessfulPoints = points;
      storeCachedPointsSnapshot(points);
      return NextResponse.json(
        { points },
        {
          headers: {
            "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
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
      { points: [] as RelayPoint[] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to build globe points from relay hosts:", error);

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

    return NextResponse.json({ points: [] as RelayPoint[] }, { status: 500 });
  }
}
