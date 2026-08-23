import { isRelayPoint, type RelayPoint } from "@/lib/globe/relay-points";

type GlobePointsApiResponse = {
  points?: unknown;
};

export async function fetchRelayPoints(options?: {
  signal?: AbortSignal;
}): Promise<RelayPoint[]> {
  const response = await fetch("/api/relays/globe-points", {
    signal: options?.signal,
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch relay globe points: ${response.status}`);
  }

  const payload = (await response.json()) as GlobePointsApiResponse;
  return Array.isArray(payload.points) ? payload.points.filter(isRelayPoint) : [];
}
