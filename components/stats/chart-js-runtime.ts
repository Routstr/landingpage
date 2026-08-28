import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale);

type SeriesPalette = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const DARK_SERIES_COLORS: SeriesPalette = [
  "#56b4e9",
  "#e69f00",
  "#009e73",
  "#f0e442",
  "#cc79a7",
  "#a78bfa",
  "#d55e00",
] as const;

const LIGHT_SERIES_COLORS: SeriesPalette = [
  "#0072b2",
  "#9a6000",
  "#007a58",
  "#887800",
  "#a33a7a",
  "#6941c6",
  "#b33f00",
] as const;

const FALLBACK_FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

type ChartThemePalette = {
  card: string;
  foreground: string;
  grid: string;
  seriesColors: SeriesPalette;
  mutedForeground: string;
  other: string;
};

const CHART_THEMES: Record<"dark" | "light", ChartThemePalette> = {
  dark: {
    card: "#161616",
    foreground: "#e5e5e5",
    grid: "#2c2c2c",
    seriesColors: DARK_SERIES_COLORS,
    mutedForeground: "#a1a1a1",
    other: "#777777",
  },
  light: {
    card: "#ffffff",
    foreground: "#0a0a0a",
    grid: "#e2e2e2",
    seriesColors: LIGHT_SERIES_COLORS,
    mutedForeground: "#6b6b6b",
    other: "#6b6b6b",
  },
};

export function useChartTheme(): ChartThemePalette & {
  fontFamily: string;
} {
  const { theme } = useTheme();
  const [fontFamily, setFontFamily] = useState(FALLBACK_FONT_FAMILY);

  useEffect(() => {
    const next = window.getComputedStyle(document.body).fontFamily;
    if (next) setFontFamily(next);
  }, []);

  return useMemo(
    () => ({ ...CHART_THEMES[theme], fontFamily }),
    [fontFamily, theme]
  );
}

function getSeriesColorIndex(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % DARK_SERIES_COLORS.length;
}

export function getSeriesColor(
  key: string,
  palette: readonly string[]
): string {
  return palette[getSeriesColorIndex(key)] ?? palette[0] ?? "#777777";
}

/** Cohort identity is order independent, so reordering keeps every colour. */
function cohortKey(keys: readonly string[]): string {
  return Array.from(new Set(keys)).sort().join("\u0000");
}

type SeriesColorState = {
  cohort: string;
  slots: Map<string, number>;
};

function reconcileSeriesColors(
  previous: SeriesColorState | null,
  keys: readonly string[]
): SeriesColorState {
  const uniqueKeys = Array.from(new Set(keys));
  const slots = new Map<string, number>();
  const used = new Set<number>();

  for (const key of uniqueKeys) {
    const slot = previous?.slots.get(key);
    if (slot === undefined || used.has(slot)) continue;
    slots.set(key, slot);
    used.add(slot);
  }

  for (const key of uniqueKeys.slice().sort()) {
    if (slots.has(key)) continue;
    const start = getSeriesColorIndex(key);
    for (let offset = 0; offset < DARK_SERIES_COLORS.length; offset += 1) {
      const slot = (start + offset) % DARK_SERIES_COLORS.length;
      if (used.has(slot)) continue;
      slots.set(key, slot);
      used.add(slot);
      break;
    }
  }

  return { cohort: cohortKey(uniqueKeys), slots };
}

/** Keeps a colour attached to an entity while the visible cohort changes. */
export function useStableSeriesColors(
  keys: readonly string[],
  palette: readonly string[]
): ReadonlyMap<string, string> {
  const cohort = cohortKey(keys);
  const [committed, setCommitted] = useState<SeriesColorState>(() =>
    reconcileSeriesColors(null, keys)
  );
  const next = useMemo(
    () =>
      committed.cohort === cohort
        ? committed
        : reconcileSeriesColors(committed, keys),
    [committed, cohort, keys]
  );

  useEffect(() => {
    if (next !== committed) setCommitted(next);
  }, [committed, next]);

  return useMemo(() => {
    const colors = new Map<string, string>();
    next.slots.forEach((slot, key) => {
      const color = palette[slot];
      if (color) colors.set(key, color);
    });
    return colors;
  }, [next.slots, palette]);
}
