export type ProviderPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  createdAt?: number;
  mints?: string[];
};

export interface ProviderPointsResponse {
  points?: ProviderPoint[];
}

export function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function hasValidCoordinates(lat: unknown, lng: unknown): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

export function isProviderPoint(value: unknown): value is ProviderPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    hasValidCoordinates(candidate.lat, candidate.lng)
  );
}

export function mergeProviderPoints(
  existing: ProviderPoint[],
  incoming: ProviderPoint[]
): ProviderPoint[] {
  if (incoming.length === 0) return existing;

  const byId = new Map(existing.map((point) => [point.id, point]));
  let changed = false;

  for (const point of incoming) {
    const prev = byId.get(point.id);
    if (
      !prev ||
      prev.lat !== point.lat ||
      prev.lng !== point.lng ||
      prev.name !== point.name ||
      prev.description !== point.description ||
      prev.createdAt !== point.createdAt
    ) {
      byId.set(point.id, point);
      changed = true;
    }
  }

  return changed ? Array.from(byId.values()) : existing;
}
