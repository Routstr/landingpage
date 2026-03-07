type CompactNumberOptions = {
  threshold?: number;
  standardMinimumFractionDigits?: number;
  standardMaximumFractionDigits?: number;
  compactMinimumFractionDigits?: number;
  compactMaximumFractionDigits?: number;
  fallback?: string;
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  notation: "standard" | "compact",
  minimumFractionDigits: number,
  maximumFractionDigits: number
): Intl.NumberFormat {
  const key = `${notation}:${minimumFractionDigits}:${maximumFractionDigits}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat("en-US", {
    notation,
    compactDisplay: notation === "compact" ? "short" : undefined,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  formatterCache.set(key, formatter);
  return formatter;
}

function normalizeCompactSuffix(value: string): string {
  return value.replace(/[a-z]+/g, (match) => match.toUpperCase());
}

export function formatCompactNumber(
  value: number,
  {
    threshold = 1_000,
    standardMinimumFractionDigits = 0,
    standardMaximumFractionDigits = 0,
    compactMinimumFractionDigits = 0,
    compactMaximumFractionDigits = 1,
    fallback = "0",
  }: CompactNumberOptions = {}
): string {
  if (!Number.isFinite(value)) return fallback;

  const useCompact = Math.abs(value) >= threshold;
  const minimumFractionDigits = useCompact
    ? compactMinimumFractionDigits
    : standardMinimumFractionDigits;
  const maximumFractionDigits = useCompact
    ? compactMaximumFractionDigits
    : standardMaximumFractionDigits;

  const formatted = getFormatter(
    useCompact ? "compact" : "standard",
    minimumFractionDigits,
    maximumFractionDigits
  ).format(value);

  return useCompact ? normalizeCompactSuffix(formatted) : formatted;
}

export function formatCompactCount(value: number): string {
  return formatCompactNumber(value, {
    standardMaximumFractionDigits: 0,
    compactMaximumFractionDigits: 1,
  });
}

export function formatCompactContextLength(value: number): string {
  return formatCompactNumber(value, {
    standardMaximumFractionDigits: 0,
    compactMaximumFractionDigits: 1,
  });
}

export function formatCompactPriceValue(
  value: number,
  { fixedSmallDecimals = false }: { fixedSmallDecimals?: boolean } = {}
): string {
  return formatCompactNumber(value, {
    standardMinimumFractionDigits: fixedSmallDecimals ? 2 : 0,
    standardMaximumFractionDigits: 2,
    compactMaximumFractionDigits: 1,
  });
}
