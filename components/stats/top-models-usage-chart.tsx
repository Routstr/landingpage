"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type {
  Chart as ChartJS,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import {
  getSeriesColor,
  useChartTheme,
  useStableSeriesColors,
} from "@/components/stats/chart-js-runtime";
import { ModelCompanyIcon } from "@/components/stats/model-company-icon";
import {
  CHART_MODEL_LIMIT,
  MIN_CHART_MODEL_SHARE,
  type ChartMode,
} from "@/components/stats/stats-chart-domain";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCompactNumber } from "@/lib/number-format";

type DisplayUnit = "msat" | "sat" | "usd";

export interface ModelUsageMixMetric {
  timestamp: string;
  total_successful: number;
  total_revenue_msats: number;
  total_tokens: number;
  others: number;
  others_revenue_msats: number;
  others_tokens: number;
  model_counts: Record<string, number>;
  model_revenue_msats: Record<string, number>;
  model_tokens: Record<string, number>;
}

export interface ModelUsageMix {
  top_models: string[];
  metrics: ModelUsageMixMetric[];
  interval_minutes: number;
  hours_back: number;
  total_buckets: number;
}

interface TopModelsUsageChartProps {
  mix: ModelUsageMix;
  displayUnit?: DisplayUnit;
  usdPerSat?: number | null;
  mode?: ChartMode;
}


interface LeaderboardRow {
  displayName: string;
  model: string;
  provider: string;
  rank: number;
  totalRaw: number;
}

interface PlotSeries {
  color: string;
  key: string;
  label: string;
  model: string | null;
  values: number[];
}

const DEFAULT_LEADERBOARD_LIMIT = 10;
const EXPANDED_LEADERBOARD_LIMIT = 20;

function parseBucketDate(value: string): Date | null {
  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatBucketTimestamp(
  label: string,
  intervalMinutes: number,
  hoursBack: number
): string {
  const date = parseBucketDate(label);
  if (!date) return label;
  if (intervalMinutes >= 28 * 24 * 60) {
    return `${date.toLocaleString([], {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })} UTC`;
  }
  if (intervalMinutes <= 6 * 60 || hoursBack <= 48) {
    return date.toLocaleString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    });
  }
  return `${date.toLocaleString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })} UTC`;
}

function formatAxisTimestamp(
  timestamp: string,
  hasMultipleDays: boolean,
  intervalMinutes: number,
  hoursBack: number
): string {
  const date = parseBucketDate(timestamp);
  if (!date) return "";

  if (intervalMinutes >= 28 * 24 * 60) {
    return date.toLocaleDateString([], {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  const shouldShowTime = intervalMinutes <= 6 * 60 || hoursBack <= 48;
  if (shouldShowTime && hasMultipleDays) {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  }
  if (shouldShowTime) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  }
  if (hasMultipleDays) {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function convertRevenueMsats(
  amountMsats: number,
  displayUnit: DisplayUnit,
  usdPerSat: number | null
): number {
  if (displayUnit === "msat") return amountMsats;
  const sats = amountMsats / 1000;
  return displayUnit === "usd" ? sats * (usdPerSat ?? 0) : sats;
}

function formatShare(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value < 0.1) return "<0.1%";
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function prettifyProvider(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  const aliasMap: Record<string, string> = {
    "x ai": "x-ai",
    xai: "x-ai",
    "z ai": "z-ai",
    zai: "z-ai",
    open_ai: "openai",
    openai: "openai",
  };
  return aliasMap[normalized] ?? normalized.replace(/[_-]+/g, " ");
}

function detectProviderFromModel(model: string): string {
  const value = model.toLowerCase();
  if (value.includes("claude")) return "anthropic";
  if (value.includes("gpt") || value.includes("openai")) return "openai";
  if (value.includes("gemini")) return "google";
  if (value.includes("grok") || value.includes("x-ai") || value.includes("xai")) {
    return "x-ai";
  }
  if (value.includes("deepseek")) return "deepseek";
  if (value.includes("minimax")) return "minimax";
  if (value.includes("kimi") || value.includes("moonshot")) return "moonshot";
  if (value.includes("mistral")) return "mistral";
  if (value.includes("qwen") || value.includes("alibaba")) return "alibaba";
  if (value.includes("xiaomi") || value.includes("mimo")) return "xiaomi";
  if (value.includes("stepfun")) return "stepfun";
  if (value.includes("venice")) return "venice";
  if (value.includes("text-embedding")) return "openai";
  if (value.includes("glm") || value.includes("z-ai") || value.includes("z ai")) {
    return "z-ai";
  }
  return "unknown";
}

function getModelPresentation(
  model: string
): { displayName: string; provider: string } {
  const trimmed = model.trim();
  const slashIndex = trimmed.indexOf("/");
  if (slashIndex > 0 && slashIndex < trimmed.length - 1) {
    return {
      displayName: trimmed.slice(slashIndex + 1),
      provider: prettifyProvider(trimmed.slice(0, slashIndex)),
    };
  }
  return {
    displayName: trimmed,
    provider: detectProviderFromModel(trimmed),
  };
}

function readModelValue(
  metric: ModelUsageMixMetric,
  model: string,
  mode: ChartMode
): number {
  const source =
    mode === "requests"
      ? metric.model_counts
      : mode === "revenue"
        ? metric.model_revenue_msats
        : metric.model_tokens;
  const value = Number((source ?? {})[model] ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readBucketTotal(metric: ModelUsageMixMetric, mode: ChartMode): number {
  const value =
    mode === "requests"
      ? Number(metric.total_successful ?? 0)
      : mode === "revenue"
        ? Number(metric.total_revenue_msats ?? 0)
        : Number(metric.total_tokens ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** One period total per model, shared by ranking, chart inclusion and the leaderboard. */
function deriveModelTotals(
  metrics: ModelUsageMixMetric[],
  mode: ChartMode
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const metric of metrics) {
    const source =
      mode === "requests"
        ? metric.model_counts ?? {}
        : mode === "revenue"
          ? metric.model_revenue_msats ?? {}
          : metric.model_tokens ?? {};
    for (const [model, rawValue] of Object.entries(source)) {
      if (!model || model === "unknown") continue;
      const value = Number(rawValue || 0);
      if (!Number.isFinite(value) || value <= 0) continue;
      totals.set(model, (totals.get(model) ?? 0) + value);
    }
  }
  return totals;
}

export function TopModelsUsageChart({
  mix,
  displayUnit = "sat",
  usdPerSat = null,
  mode = "requests",
}: TopModelsUsageChartProps) {
  const [showAllModels, setShowAllModels] = useState(false);
  const isMobile = useIsMobile();
  const chartTheme = useChartTheme();
  const readoutId = useId();
  const chartRef = useRef<ChartJS<"bar", number[], string> | null>(null);
  const chartShellRef = useRef<HTMLDivElement | null>(null);
  const guideRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timestampRef = useRef<HTMLParagraphElement | null>(null);
  const totalRef = useRef<HTMLSpanElement | null>(null);
  const emptyTooltipRef = useRef<HTMLParagraphElement | null>(null);
  const liveRegionRef = useRef<HTMLSpanElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rowValueRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const rowShareRefs = useRef<Record<string, HTMLSpanElement | null>>(
    {}
  );
  const selectedIndexRef = useRef(-1);
  const selectedTimestampRef = useRef<string | null>(null);
  const overlayVisibleRef = useRef(false);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerPositionRef = useRef<{ x: number; y: number } | null>(
    null
  );
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const fallbackTopModels = useMemo(
    () => (Array.isArray(mix.top_models) ? mix.top_models : []),
    [mix.top_models]
  );
  const mixMetrics = useMemo(
    () => (Array.isArray(mix.metrics) ? mix.metrics : []),
    [mix.metrics]
  );
  const modelTotals = useMemo(
    () => deriveModelTotals(mixMetrics, mode),
    [mixMetrics, mode]
  );
  const rankedModels = useMemo(() => {
    const ranked = Array.from(modelTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([model]) => model);
    return ranked.length > 0 ? ranked : fallbackTopModels;
  }, [fallbackTopModels, modelTotals]);
  const chartModels = useMemo(() => {
    const scopeTotal = mixMetrics.reduce(
      (sum, metric) => sum + readBucketTotal(metric, mode),
      0
    );
    if (scopeTotal <= 0) return [];
    return rankedModels
      .filter(
        (model) =>
          (modelTotals.get(model) ?? 0) / scopeTotal >= MIN_CHART_MODEL_SHARE
      )
      .slice(0, CHART_MODEL_LIMIT);
  }, [mixMetrics, mode, modelTotals, rankedModels]);
  const chartModelColors = useStableSeriesColors(
    chartModels,
    chartTheme.seriesColors
  );
  const leaderboardModels = useMemo(
    () => rankedModels.slice(0, EXPANDED_LEADERBOARD_LIMIT),
    [rankedModels]
  );
  const revenueDisplayUnit: DisplayUnit =
    displayUnit === "usd" && usdPerSat === null ? "sat" : displayUnit;
  const revenueUnitLabel =
    revenueDisplayUnit === "usd"
      ? "usd"
      : revenueDisplayUnit === "sat"
        ? "sats"
        : "msats";

  const formatValue = useCallback(
    (rawValue: number): string => {
      if (mode !== "revenue") {
        return formatCompactNumber(rawValue, {
          standardMaximumFractionDigits: 0,
          compactMaximumFractionDigits: 2,
        });
      }
      const converted = convertRevenueMsats(
        rawValue,
        revenueDisplayUnit,
        usdPerSat
      );
      const compact = formatCompactNumber(converted, {
        standardMinimumFractionDigits: revenueDisplayUnit === "usd" ? 2 : 0,
        standardMaximumFractionDigits: revenueDisplayUnit === "usd" ? 2 : 0,
        compactMaximumFractionDigits: 2,
      });
      return revenueDisplayUnit === "usd"
        ? `$${compact}`
        : `${compact} ${revenueUnitLabel}`;
    },
    [mode, revenueDisplayUnit, revenueUnitLabel, usdPerSat]
  );

  const bucketTotals = useMemo(
    () => mixMetrics.map((metric) => readBucketTotal(metric, mode)),
    [mixMetrics, mode]
  );
  const plotSeries = useMemo<PlotSeries[]>(() => {
    const named = chartModels.map((model) => {
      const presentation = getModelPresentation(model);
      return {
        color:
          chartModelColors.get(model) ??
          getSeriesColor(model, chartTheme.seriesColors),
        key: `model:${model}`,
        label: presentation.displayName,
        model,
        values: mixMetrics.map((metric) => readModelValue(metric, model, mode)),
      };
    });
    const otherValues = mixMetrics.map((metric, bucketIndex) => {
      const namedTotal = chartModels.reduce(
        (sum, model) => sum + readModelValue(metric, model, mode),
        0
      );
      return Math.max(0, bucketTotals[bucketIndex] - namedTotal);
    });
    return [
      ...named,
      {
        color: chartTheme.other,
        key: "other",
        label: "Other models",
        model: null,
        values: otherValues,
      },
    ];
  }, [
    bucketTotals,
    chartModelColors,
    chartModels,
    chartTheme.seriesColors,
    chartTheme.other,
    mixMetrics,
    mode,
  ]);
  const stackTotals = useMemo(
    () =>
      mixMetrics.map((_, bucketIndex) =>
        plotSeries.reduce(
          (sum, series) => sum + (series.values[bucketIndex] ?? 0),
          0
        )
      ),
    [mixMetrics, plotSeries]
  );

  const hasMultipleDays = useMemo(() => {
    const daySet = new Set(
      mixMetrics.map((item) =>
        parseBucketDate(String(item.timestamp))?.toDateString()
      )
    );
    return daySet.size > 1;
  }, [mixMetrics]);

  const chartData = useMemo<ChartData<"bar", number[], string>>(
    () => ({
      labels: mixMetrics.map((metric) => metric.timestamp),
      datasets: plotSeries.map((series) => ({
        label: series.key,
        data: series.values,
        backgroundColor: series.color,
        borderWidth: 0,
        borderSkipped: false,
        stack: "models",
        maxBarThickness: 38,
        categoryPercentage: 0.92,
        barPercentage: 1,
      })),
    }),
    [mixMetrics, plotSeries]
  );

  const chartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      events: [],
      normalized: true,
      layout: { padding: { top: 8, right: isMobile ? 4 : 10 } },
      scales: {
        x: {
          stacked: true,
          border: { display: false },
          grid: { display: false },
          ticks: {
            autoSkip: true,
            color: chartTheme.mutedForeground,
            font: { family: chartTheme.fontFamily, size: 11 },
            maxRotation: 0,
            maxTicksLimit: isMobile ? 4 : 8,
            callback: (_value, index) =>
              formatAxisTimestamp(
                mixMetrics[index]?.timestamp ?? "",
                hasMultipleDays,
                mix.interval_minutes,
                mix.hours_back
              ),
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          min: 0,
          border: { display: false },
          grid: { color: chartTheme.grid },
          ticks: {
            color: chartTheme.mutedForeground,
            font: { family: chartTheme.fontFamily, size: 11 },
            maxTicksLimit: 5,
            callback: (value) => formatValue(Number(value || 0)),
          },
        },
      },
    }),
    [
      chartTheme.fontFamily,
      chartTheme.grid,
      chartTheme.mutedForeground,
      formatValue,
      hasMultipleDays,
      isMobile,
      mix.hours_back,
      mix.interval_minutes,
      mixMetrics,
    ]
  );

  const hideBucketOverlay = useCallback(() => {
    overlayVisibleRef.current = false;
    pendingPointerPositionRef.current = null;
    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }
    if (guideRef.current) {
      guideRef.current.style.opacity = "0";
      guideRef.current.style.visibility = "hidden";
    }
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = "0";
      tooltipRef.current.style.visibility = "hidden";
    }
  }, []);

  const selectBucket = useCallback(
    (
      index: number,
      {
        announceToScreenReader = false,
        showOverlay = true,
      }: { announceToScreenReader?: boolean; showOverlay?: boolean } = {}
    ) => {
      if (mixMetrics.length === 0) return;
      const boundedIndex = Math.max(0, Math.min(mixMetrics.length - 1, index));
      const metric = mixMetrics[boundedIndex];
      const isSameVisibleBucket =
        selectedIndexRef.current === boundedIndex &&
        selectedTimestampRef.current === metric.timestamp &&
        overlayVisibleRef.current;
      if (isSameVisibleBucket && showOverlay && !announceToScreenReader)
        return;

      selectedIndexRef.current = boundedIndex;
      selectedTimestampRef.current = metric.timestamp;

      if (timestampRef.current) {
        timestampRef.current.textContent = formatBucketTimestamp(
          metric.timestamp,
          mix.interval_minutes,
          mix.hours_back
        );
      }
      if (totalRef.current) {
        totalRef.current.textContent = formatValue(bucketTotals[boundedIndex] ?? 0);
      }
      const orderedSeries = plotSeries
        .map((series) => ({
          series,
          value: series.values[boundedIndex] ?? 0,
        }))
        .sort((a, b) => b.value - a.value);
      let visibleRows = 0;
      const stackTotal = stackTotals[boundedIndex] ?? 0;
      for (const { series, value } of orderedSeries) {
        const rowNode = rowRefs.current[series.key];
        const valueNode = rowValueRefs.current[series.key];
        const shareNode = rowShareRefs.current[series.key];
        const share = stackTotal > 0 ? (value / stackTotal) * 100 : 0;
        if (rowNode) {
          rowNode.hidden = value <= 0;
          if (value > 0) {
            rowNode.style.order = String(visibleRows);
            visibleRows += 1;
          }
        }
        if (valueNode) {
          valueNode.textContent = formatValue(value);
        }
        if (shareNode) {
          shareNode.textContent = `· ${formatShare(share)}`;
        }
      }
      if (emptyTooltipRef.current) {
        emptyTooltipRef.current.hidden = visibleRows > 0;
      }

      const chart = chartRef.current;
      const shell = chartShellRef.current;
      const tooltip = tooltipRef.current;
      if (chart) {
        const timestamp = formatBucketTimestamp(
          metric.timestamp,
          mix.interval_minutes,
          mix.hours_back
        );
        chart.canvas.setAttribute("aria-valuenow", String(boundedIndex + 1));
        chart.canvas.setAttribute(
          "aria-valuetext",
          `${timestamp}, total ${formatValue(bucketTotals[boundedIndex] ?? 0)}`
        );
        if (showOverlay && shell && tooltip) {
          const shellBounds = shell.getBoundingClientRect();
          const canvasBounds = chart.canvas.getBoundingClientRect();
          const x =
            canvasBounds.left - shellBounds.left +
            chart.scales.x.getPixelForValue(boundedIndex);
          const chartTop =
            canvasBounds.top - shellBounds.top + chart.chartArea.top;
          const gap = 12;
          const edge = 8;
          const tooltipWidth = tooltip.offsetWidth;
          const tooltipHeight = tooltip.offsetHeight;
          const rightSide = x + gap;
          const preferredLeft =
            rightSide + tooltipWidth <= shell.clientWidth - edge
              ? rightSide
              : x - gap - tooltipWidth;
          const left = Math.max(
            edge,
            Math.min(preferredLeft, shell.clientWidth - tooltipWidth - edge)
          );
          const maxTop = Math.max(edge, shell.clientHeight - tooltipHeight - edge);
          const top = Math.max(
            edge,
            Math.min(chart.chartArea.top + edge, maxTop)
          );
          tooltip.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
          tooltip.style.visibility = "visible";
          tooltip.style.opacity = "1";
          if (guideRef.current) {
            guideRef.current.style.height = `${Math.round(
              chart.chartArea.bottom - chart.chartArea.top
            )}px`;
            guideRef.current.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(chartTop)}px, 0)`;
            guideRef.current.style.visibility = "visible";
            guideRef.current.style.opacity = "1";
          }
          overlayVisibleRef.current = true;
        } else {
          hideBucketOverlay();
        }
      }

      if (announceToScreenReader && liveRegionRef.current) {
        const details = plotSeries
          .filter((series) => (series.values[boundedIndex] ?? 0) > 0)
          .map(
            (series) => {
              const value = series.values[boundedIndex] ?? 0;
              const share = stackTotal > 0 ? (value / stackTotal) * 100 : 0;
              return `${series.label} ${formatValue(value)}, ${formatShare(share)}`;
            }
          )
          .join(", ");
        liveRegionRef.current.textContent = `${formatBucketTimestamp(
          metric.timestamp,
          mix.interval_minutes,
          mix.hours_back
        )}. Total ${formatValue(bucketTotals[boundedIndex] ?? 0)}. ${details}`;
      }
    },
    [
      bucketTotals,
      formatValue,
      hideBucketOverlay,
      mix.hours_back,
      mix.interval_minutes,
      mixMetrics,
      plotSeries,
      stackTotals,
    ]
  );

  const selectBucketAtPixel = useCallback(
    (
      pixelX: number,
      pixelY: number,
      { announceToScreenReader = false } = {}
    ) => {
      const chart = chartRef.current;
      if (!chart || mixMetrics.length === 0) return;
      if (
        pixelX < chart.chartArea.left ||
        pixelX > chart.chartArea.right ||
        pixelY < chart.chartArea.top ||
        pixelY > chart.chartArea.bottom
      ) {
        hideBucketOverlay();
        return;
      }
      const rawIndex = Number(chart.scales.x.getValueForPixel(pixelX));
      if (!Number.isFinite(rawIndex)) return;
      selectBucket(Math.round(rawIndex), { announceToScreenReader });
    },
    [hideBucketOverlay, mixMetrics.length, selectBucket]
  );

  useEffect(() => {
    const shell = chartShellRef.current;
    if (!shell) return;

    const getCanvasPosition = (event: PointerEvent) => {
      const canvas = chartRef.current?.canvas;
      if (!canvas) return null;
      const bounds = canvas.getBoundingClientRect();
      return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    };
    const scheduleSelection = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const position = getCanvasPosition(event);
      if (position === null) return;
      pendingPointerPositionRef.current = position;
      if (pointerFrameRef.current !== null) return;
      pointerFrameRef.current = window.requestAnimationFrame(() => {
        pointerFrameRef.current = null;
        if (pendingPointerPositionRef.current !== null) {
          selectBucketAtPixel(
            pendingPointerPositionRef.current.x,
            pendingPointerPositionRef.current.y
          );
        }
      });
    };
    const beginSelection = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        touchStartRef.current = { x: event.clientX, y: event.clientY };
        return;
      }
      scheduleSelection(event);
    };
    const finishSelection = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (
        !start ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
      ) {
        return;
      }
      const position = getCanvasPosition(event);
      if (position !== null) {
        selectBucketAtPixel(position.x, position.y, {
          announceToScreenReader: true,
        });
      }
    };
    const cancelTouchSelection = () => {
      touchStartRef.current = null;
      hideBucketOverlay();
    };
    const hideMouseSelection = (event: PointerEvent) => {
      if (event.pointerType !== "touch") hideBucketOverlay();
    };
    const hideOutsideSelection = (event: PointerEvent) => {
      if (event.target instanceof Node && !shell.contains(event.target)) {
        hideBucketOverlay();
      }
    };
    const resizeObserver = new ResizeObserver(hideBucketOverlay);
    resizeObserver.observe(shell);

    shell.addEventListener("pointerdown", beginSelection, { passive: true });
    shell.addEventListener("pointermove", scheduleSelection, { passive: true });
    shell.addEventListener("pointerup", finishSelection, { passive: true });
    shell.addEventListener("pointercancel", cancelTouchSelection, {
      passive: true,
    });
    shell.addEventListener("pointerleave", hideMouseSelection, { passive: true });
    document.addEventListener("pointerdown", hideOutsideSelection, {
      passive: true,
    });
    return () => {
      shell.removeEventListener("pointerdown", beginSelection);
      shell.removeEventListener("pointermove", scheduleSelection);
      shell.removeEventListener("pointerup", finishSelection);
      shell.removeEventListener("pointercancel", cancelTouchSelection);
      shell.removeEventListener("pointerleave", hideMouseSelection);
      document.removeEventListener("pointerdown", hideOutsideSelection);
      resizeObserver.disconnect();
      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = null;
      }
    };
  }, [hideBucketOverlay, selectBucket, selectBucketAtPixel]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const selectedTimestamp = selectedTimestampRef.current;
      const matchingIndex = selectedTimestamp
        ? mixMetrics.findIndex(
            (metric) => metric.timestamp === selectedTimestamp
          )
        : -1;
      selectBucket(matchingIndex >= 0 ? matchingIndex : mixMetrics.length - 1, {
        showOverlay: false,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chartData, mixMetrics, selectBucket]);

  useEffect(() => {
    setShowAllModels(false);
  }, [mode, rankedModels]);

  const handleChartKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      hideBucketOverlay();
      return;
    }
    let nextIndex = selectedIndexRef.current;
    if (event.key === "ArrowLeft") nextIndex -= 1;
    else if (event.key === "ArrowRight") nextIndex += 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = mixMetrics.length - 1;
    else return;
    event.preventDefault();
    selectBucket(nextIndex, { announceToScreenReader: true });
  };

  const formatLeaderboardTotal = (rawValue: number): string => {
    if (mode === "requests") return `${formatValue(rawValue)} requests`;
    if (mode === "tokens") return `${formatValue(rawValue)} tokens`;
    return formatValue(rawValue);
  };

  const leaderboardRows = useMemo<LeaderboardRow[]>(() => {
    if (leaderboardModels.length === 0 || mixMetrics.length === 0) return [];

    return leaderboardModels
      .map((model) => {
        const totalRaw = modelTotals.get(model) ?? 0;
        const presentation = getModelPresentation(model);
        return {
          displayName: presentation.displayName,
          model,
          provider: presentation.provider,
          rank: 0,
          totalRaw,
        };
      })
      .filter((row) => row.totalRaw > 0)
      .sort((a, b) => b.totalRaw - a.totalRaw)
      .slice(0, EXPANDED_LEADERBOARD_LIMIT)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [leaderboardModels, mixMetrics, modelTotals]);

  const visibleLeaderboardRows = leaderboardRows.slice(
    0,
    showAllModels ? EXPANDED_LEADERBOARD_LIMIT : DEFAULT_LEADERBOARD_LIMIT
  );
  const canShowMore = leaderboardRows.length > DEFAULT_LEADERBOARD_LIMIT;
  const remainingModelsCount = Math.max(
    0,
    leaderboardRows.length - DEFAULT_LEADERBOARD_LIMIT
  );

  if (mixMetrics.length === 0) return null;

  return (
    <div>
      <section className="border border-border bg-card px-4 py-5 shadow-sm shadow-black/5 sm:px-6 sm:py-6 dark:shadow-black/20">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-foreground">Model Usage</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Reported {mode} over time, split by model.
          </p>
        </div>

        <div className="pt-2 sm:pt-3">
          <div className="min-w-0">
            <div
              ref={chartShellRef}
              className="relative h-[250px] min-w-0 w-full sm:h-[320px]"
            >
              <Bar
                ref={(chart) => {
                  chartRef.current = chart ?? null;
                }}
                data={chartData}
                options={chartOptions}
                datasetIdKey="label"
                redraw={false}
                role="slider"
                tabIndex={0}
                aria-label={`Model usage by ${mode}. Use Left and Right arrow keys to inspect time buckets.`}
                aria-valuemin={1}
                aria-valuemax={mixMetrics.length}
                aria-valuenow={mixMetrics.length}
                aria-orientation="horizontal"
                aria-describedby={`${readoutId}-instructions`}
                onKeyDown={handleChartKeyDown}
                onFocus={() =>
                  selectBucket(
                    selectedIndexRef.current >= 0
                      ? selectedIndexRef.current
                      : mixMetrics.length - 1
                  )
                }
                onBlur={hideBucketOverlay}
                className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                style={{ touchAction: "pan-y pinch-zoom" }}
                fallbackContent="Model usage chart. Use the arrow keys to inspect time buckets."
              />
              <div
                ref={guideRef}
                aria-hidden="true"
                className="pointer-events-none invisible absolute left-0 top-0 z-[1] w-px bg-foreground/30 opacity-0"
              />
              <div
                id={readoutId}
                ref={tooltipRef}
                data-slot="bucket-tooltip"
                role="tooltip"
                aria-hidden="true"
                className="pointer-events-none invisible absolute left-0 top-0 z-10 w-60 border border-border bg-card p-3 text-xs opacity-0 shadow-elevation"
              >
                <div className="border-b border-border pb-2">
                  <p
                    ref={timestampRef}
                    className="truncate font-medium text-foreground"
                  />
                  <p className="mt-1 text-muted-foreground">
                    Total{" "}
                    <span
                      ref={totalRef}
                      className="font-medium tabular-nums text-foreground"
                    />
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {plotSeries.map((series) => (
                    <div
                      key={series.key}
                      ref={(node) => {
                        rowRefs.current[series.key] = node;
                      }}
                      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: series.color }}
                      />
                      <span
                        className="truncate text-muted-foreground"
                        title={series.model ?? series.label}
                      >
                        {series.label}
                      </span>
                      <span className="whitespace-nowrap text-right">
                        <span
                          ref={(node) => {
                            rowValueRefs.current[series.key] = node;
                          }}
                          className="tabular-nums text-foreground"
                        />
                        <span
                          ref={(node) => {
                            rowShareRefs.current[series.key] = node;
                          }}
                          className="ml-1 text-[10px] tabular-nums text-muted-foreground"
                        />
                      </span>
                    </div>
                  ))}
                  <p
                    ref={emptyTooltipRef}
                    hidden
                    className="text-muted-foreground"
                  >
                    No usage in this bucket.
                  </p>
                </div>
              </div>
              <span ref={liveRegionRef} className="sr-only" aria-live="polite" />
            </div>

            <span id={`${readoutId}-instructions`} className="sr-only">
              Use Left and Right arrow keys to inspect exact bucket values.
            </span>
          </div>

          <section
            className="mt-6 min-w-0 border-t border-border pt-4"
            aria-labelledby={`${readoutId}-models`}
          >
            <div className="mb-3">
              <p
                id={`${readoutId}-models`}
                className="text-sm font-medium text-foreground"
              >
                Top Models
              </p>
            </div>

            {leaderboardRows.length > 0 ? (
              <div>
                <ol className="columns-1 lg:columns-2 lg:gap-10">
                  {visibleLeaderboardRows.map((row) => (
                    <li
                      key={row.model}
                      className="mb-0.5 grid min-h-14 w-full break-inside-avoid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/60 px-2 py-2.5 text-left transition-colors hover:bg-muted/40"
                      title={row.model}
                    >
                      <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">
                        {row.rank}.
                      </span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none flex h-7 w-8 items-center gap-2"
                      >
                        <span
                          className="h-7 w-0.5 shrink-0"
                          style={{
                            backgroundColor:
                              chartModelColors.get(row.model) ??
                              chartTheme.other,
                          }}
                        />
                        <ModelCompanyIcon
                          model={row.model}
                          provider={row.provider}
                          className="size-5 shrink-0 text-foreground"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {row.displayName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {row.provider}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-right">
                        <span className="text-xs font-medium tabular-nums text-foreground">
                          {formatLeaderboardTotal(row.totalRaw)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                {canShowMore ? (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowAllModels((current) => !current)}
                    >
                      {showAllModels
                        ? "Show less"
                        : `Show ${remainingModelsCount} more`}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No model totals available for this range.
              </p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
