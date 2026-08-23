export type RelayPoint = {
  kind: "relay";
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export function isRelayPoint(value: unknown): value is RelayPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.kind === "relay" &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.lat === "number" &&
    typeof candidate.lng === "number"
  );
}
