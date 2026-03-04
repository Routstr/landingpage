import { isProviderPoint, type ProviderPoint } from "@/lib/globe/provider-points";

type GlobePointsApiResponse = {
  points?: unknown;
};

export async function fetchProviderPointsFromEndpointIpProgressive(
  onPoint: (point: ProviderPoint) => void,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const response = await fetch("/api/providers/globe-points", {
    signal: options?.signal,
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch globe points: ${response.status}`);
  }

  const payload = (await response.json()) as GlobePointsApiResponse;
  const points = Array.isArray(payload.points)
    ? payload.points.filter(isProviderPoint)
    : [];

  for (const point of points) {
    if (options?.signal?.aborted) return;
    onPoint(point);
  }
}
