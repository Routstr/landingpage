export type ChartMode = "requests" | "revenue" | "tokens";

/** Named model series plotted at once, and the minimum share to earn one. */
export const CHART_MODEL_LIMIT = 7;
export const MIN_CHART_MODEL_SHARE = 0.01;

export const CHART_MODES: ReadonlyArray<{
  id: ChartMode;
  label: string;
  unit: string;
}> = [
  { id: "revenue", label: "Revenue", unit: "sats" },
  { id: "requests", label: "Requests", unit: "requests" },
  { id: "tokens", label: "Tokens", unit: "tokens" },
];

const MODE_BY_ID = new Map(CHART_MODES.map((entry) => [entry.id, entry]));

/**
 * The short identifier shown beside a provider's row when two providers share a
 * display label. A provider id is `38421:<pubkey>:<signed node id>`, so the
 * public key prefix distinguishes them; slicing the raw id would render the
 * constant `38421:` for every row, which distinguishes nothing.
 */
export function providerShortId(providerId: string): string {
  const [kind, pubkey] = providerId.split(":");
  if (kind === "38421" && pubkey) return pubkey.slice(0, 12);
  return providerId.slice(0, 12);
}

export function isChartMode(value: string): value is ChartMode {
  return MODE_BY_ID.has(value as ChartMode);
}

export function getModeLabel(mode: ChartMode): string {
  return MODE_BY_ID.get(mode)?.label ?? "Requests";
}

export function getModeUnit(mode: ChartMode): string {
  return MODE_BY_ID.get(mode)?.unit ?? "requests";
}
