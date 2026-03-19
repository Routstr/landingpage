"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, CircleHelp } from "lucide-react";
import type { Event } from "nostr-tools";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TopModelsUsageChart,
  type ChartMode,
  type ModelUsageMix,
  type ModelUsageMixMetric,
} from "@/components/stats/top-models-usage-chart";
import { Button } from "@/components/ui/button";
import { createPool, getDefaultRelays } from "@/lib/nostr";
import { formatCompactCount } from "@/lib/number-format";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type WindowKey = "24h" | "7d" | "30d" | "3m" | "1y";
type RelayState = "connecting" | "active" | "done" | "no-data" | "timeout" | "error";
type PeriodType = "latest" | "day" | "month";

type AnalyticsPayload = {
  schema?: string;
  provider_id?: string;
  endpoint_urls?: string[];
  windows?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  model_usage_mix?: Record<string, unknown>;
  top_model_usage?: unknown[];
  period_type?: string;
  period_key?: string;
  interval_minutes?: number;
  window_hours?: number;
};

type PeriodSnapshot = {
  providerId: string;
  providerLabel: string;
  eventCreatedAt: number;
  periodType: PeriodType;
  periodKey: string;
  payload: AnalyticsPayload;
};

type ProviderTimeline = {
  providerId: string;
  providerLabel: string;
  latest: PeriodSnapshot | null;
  day: PeriodSnapshot[];
  month: PeriodSnapshot[];
};

type WindowPayload = {
  intervalMinutes: number;
  mixIntervalMinutes: number;
  summary: Record<string, unknown>;
  metrics: ModelUsageMixMetric[];
  topModels: string[];
};

type RelayStatus = {
  url: string;
  state: RelayState;
  events: number;
  reason: string | null;
};

type StatsQueryData = {
  timelines: ProviderTimeline[];
  relayStatuses: Record<string, RelayStatus>;
  emptyMessage: string | null;
};

const ANALYTICS_KIND = 38422;
const ANALYTICS_SCHEMAS = new Set([
  "routstr.analytics.usage.v1",
  "routstr.analytics.usage.v2",
  "routstr.analytics.snapshot.v1",
]);
const RELAYS = Array.from(
  new Set([...getDefaultRelays(), "wss://relay.routstr.com", "wss://nos.lol"])
);

const WINDOW_OPTIONS: Array<{ id: WindowKey; label: string }> = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "3m", label: "3m" },
  { id: "1y", label: "1y" },
];

const WINDOW_HOURS: Record<WindowKey, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "3m": 24 * 90,
  "1y": 24 * 365,
};

const ALL_PROVIDERS_ID = "__all_providers__";
const MODE_OPTIONS: Array<{ id: ChartMode; label: string }> = [
  { id: "requests", label: "Requests" },
  { id: "revenue", label: "Revenue" },
  { id: "tokens", label: "Tokens" },
];

function normalizeRelayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

function formatRelayLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.host}${pathname}`;
  } catch {
    return url;
  }
}

function getRelayStateMeta(state: RelayState): {
  label: string;
  dotClass: string;
  textClass: string;
} {
  switch (state) {
    case "active":
      return {
        label: "receiving",
        dotClass: "bg-green-500",
        textClass: "text-emerald-300",
      };
    case "done":
      return {
        label: "synced",
        dotClass: "bg-lime-400",
        textClass: "text-lime-300",
      };
    case "no-data":
      return {
        label: "no data",
        dotClass: "bg-muted-foreground",
        textClass: "text-muted-foreground",
      };
    case "timeout":
      return {
        label: "timeout",
        dotClass: "bg-amber-500",
        textClass: "text-amber-300",
      };
    case "error":
      return {
        label: "error",
        dotClass: "bg-red-500",
        textClass: "text-rose-300",
      };
    case "connecting":
    default:
      return {
        label: "connecting",
        dotClass: "bg-muted-foreground",
        textClass: "text-muted-foreground",
      };
  }
}

function createInitialRelayStatuses(): Record<string, RelayStatus> {
  const next: Record<string, RelayStatus> = {};
  for (const relay of RELAYS) {
    const key = normalizeRelayUrl(relay);
    next[key] = {
      url: relay,
      state: "connecting",
      events: 0,
      reason: null,
    };
  }
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNumberRecord(value: unknown): Record<string, number> {
  const source = asRecord(value);
  const parsed: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source)) {
    const next = asNumber(raw);
    if (Number.isFinite(next)) {
      parsed[key] = next;
    }
  }
  return parsed;
}

function parseModelUsageMetric(value: unknown): ModelUsageMixMetric | null {
  const metric = asRecord(value);
  const timestamp = asString(metric.timestamp);
  if (!timestamp) return null;

  return {
    timestamp,
    total_successful: asNumber(metric.total_successful),
    total_revenue_msats: asNumber(metric.total_revenue_msats),
    total_tokens: asNumber(metric.total_tokens),
    others: asNumber(metric.others),
    others_revenue_msats: asNumber(metric.others_revenue_msats),
    others_tokens: asNumber(metric.others_tokens),
    model_counts: toNumberRecord(metric.model_counts),
    model_revenue_msats: toNumberRecord(metric.model_revenue_msats),
    model_tokens: toNumberRecord(metric.model_tokens),
  };
}

function deriveTopModels(metrics: ModelUsageMixMetric[]): string[] {
  const totals = new Map<string, number>();

  for (const metric of metrics) {
    for (const [model, value] of Object.entries(metric.model_counts)) {
      totals.set(model, (totals.get(model) ?? 0) + asNumber(value));
    }
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([model]) => model);
}

function isNumericLike(value: unknown): boolean {
  if (typeof value === "number" && Number.isFinite(value)) return true;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed);
}

function getMetricTimestampKey(timestamp: string): string {
  const normalized = timestamp.includes("T")
    ? timestamp
    : `${timestamp.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(timestamp);
    if (Number.isNaN(fallback.getTime())) {
      return `raw:${timestamp}`;
    }
    return `ms:${fallback.getTime()}`;
  }
  return `ms:${parsed.getTime()}`;
}

function parseMetricTimestampMs(timestamp: string): number | null {
  const normalized = timestamp.includes("T")
    ? timestamp
    : `${timestamp.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  const fallback = new Date(timestamp);
  return Number.isNaN(fallback.getTime()) ? null : fallback.getTime();
}

function alignMetricTimestamp(ms: number, intervalMinutes: number): string {
  const bucketMs = Math.max(1, intervalMinutes) * 60 * 1000;
  const bucketStart = Math.floor(ms / bucketMs) * bucketMs;
  return new Date(bucketStart).toISOString().replace(".000Z", "Z");
}

const INTERVAL_STEPS_MINUTES = [
  60,
  120,
  180,
  240,
  360,
  480,
  720,
  1440,
  2880,
  4320,
  10080,
  20160,
  43200,
] as const;

const MAX_CHART_POINTS: Record<WindowKey, number> = {
  "24h": 48,
  "7d": 84,
  "30d": 96,
  "3m": 120,
  "1y": 120,
};

function roundUpIntervalMinutes(value: number): number {
  const safe = Math.max(1, Math.ceil(value));
  const found = INTERVAL_STEPS_MINUTES.find((step) => step >= safe);
  return found ?? INTERVAL_STEPS_MINUTES[INTERVAL_STEPS_MINUTES.length - 1];
}

function chooseDisplayIntervalMinutes(
  metrics: ModelUsageMixMetric[],
  baseIntervalMinutes: number,
  window: WindowKey
): number {
  const base = Math.max(1, baseIntervalMinutes);
  if (metrics.length <= 1) return base;

  const times = metrics
    .map((metric) => parseMetricTimestampMs(metric.timestamp))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (times.length <= 1) return base;

  const spanMinutes = Math.max(
    1,
    Math.ceil((times[times.length - 1] - times[0]) / (60 * 1000))
  );
  const maxPoints = MAX_CHART_POINTS[window];
  const needed = Math.ceil(spanMinutes / Math.max(1, maxPoints));
  return roundUpIntervalMinutes(Math.max(base, needed));
}

function rebucketMetrics(
  metrics: ModelUsageMixMetric[],
  intervalMinutes: number
): ModelUsageMixMetric[] {
  if (metrics.length <= 1) return metrics;

  const bucketMap = new Map<string, ModelUsageMixMetric>();
  for (const metric of metrics) {
    const ms = parseMetricTimestampMs(metric.timestamp);
    if (ms === null) {
      const fallbackKey = `raw:${metric.timestamp}`;
      bucketMap.set(fallbackKey, {
        timestamp: metric.timestamp,
        total_successful: asNumber(metric.total_successful),
        total_revenue_msats: asNumber(metric.total_revenue_msats),
        total_tokens: asNumber(metric.total_tokens),
        others: asNumber(metric.others),
        others_revenue_msats: asNumber(metric.others_revenue_msats),
        others_tokens: asNumber(metric.others_tokens),
        model_counts: { ...(metric.model_counts ?? {}) },
        model_revenue_msats: { ...(metric.model_revenue_msats ?? {}) },
        model_tokens: { ...(metric.model_tokens ?? {}) },
      });
      continue;
    }

    const alignedTimestamp = alignMetricTimestamp(ms, intervalMinutes);
    const existing = bucketMap.get(alignedTimestamp);
    if (!existing) {
      bucketMap.set(alignedTimestamp, {
        timestamp: alignedTimestamp,
        total_successful: asNumber(metric.total_successful),
        total_revenue_msats: asNumber(metric.total_revenue_msats),
        total_tokens: asNumber(metric.total_tokens),
        others: asNumber(metric.others),
        others_revenue_msats: asNumber(metric.others_revenue_msats),
        others_tokens: asNumber(metric.others_tokens),
        model_counts: { ...(metric.model_counts ?? {}) },
        model_revenue_msats: { ...(metric.model_revenue_msats ?? {}) },
        model_tokens: { ...(metric.model_tokens ?? {}) },
      });
      continue;
    }

    existing.total_successful += asNumber(metric.total_successful);
    existing.total_revenue_msats += asNumber(metric.total_revenue_msats);
    existing.total_tokens += asNumber(metric.total_tokens);
    existing.others += asNumber(metric.others);
    existing.others_revenue_msats += asNumber(metric.others_revenue_msats);
    existing.others_tokens += asNumber(metric.others_tokens);
    mergeNumberRecords(existing.model_counts, metric.model_counts ?? {});
    mergeNumberRecords(existing.model_revenue_msats, metric.model_revenue_msats ?? {});
    mergeNumberRecords(existing.model_tokens, metric.model_tokens ?? {});
  }

  return Array.from(bucketMap.values()).sort((a, b) => {
    const aMs = parseMetricTimestampMs(a.timestamp);
    const bMs = parseMetricTimestampMs(b.timestamp);
    if (aMs !== null && bMs !== null) return aMs - bMs;
    if (aMs !== null) return -1;
    if (bMs !== null) return 1;
    return a.timestamp.localeCompare(b.timestamp);
  });
}

function coarsenWindowPayloadForDisplay(
  payload: WindowPayload,
  window: WindowKey
): WindowPayload {
  const targetInterval = chooseDisplayIntervalMinutes(
    payload.metrics,
    payload.mixIntervalMinutes,
    window
  );
  if (targetInterval <= payload.mixIntervalMinutes) {
    return payload;
  }

  const metrics = rebucketMetrics(payload.metrics, targetInterval);
  return {
    ...payload,
    metrics,
    mixIntervalMinutes: targetInterval,
    topModels: deriveTopModels(metrics),
  };
}

function mergeNumberRecords(
  target: Record<string, number>,
  source: Record<string, number>
): void {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + asNumber(value);
  }
}

function mergeWindowPayloads(payloads: WindowPayload[]): WindowPayload | null {
  if (payloads.length === 0) {
    return null;
  }

  const summary: Record<string, number> = {};
  const mergedByTimestamp = new Map<string, ModelUsageMixMetric>();

  for (const payload of payloads) {
    for (const [key, rawValue] of Object.entries(payload.summary)) {
      if (!isNumericLike(rawValue)) continue;
      summary[key] = (summary[key] ?? 0) + asNumber(rawValue);
    }

    for (const metric of payload.metrics) {
      const timestampKey = getMetricTimestampKey(metric.timestamp);
      const existing = mergedByTimestamp.get(timestampKey);
      if (!existing) {
        mergedByTimestamp.set(timestampKey, {
          timestamp: metric.timestamp,
          total_successful: asNumber(metric.total_successful),
          total_revenue_msats: asNumber(metric.total_revenue_msats),
          total_tokens: asNumber(metric.total_tokens),
          others: asNumber(metric.others),
          others_revenue_msats: asNumber(metric.others_revenue_msats),
          others_tokens: asNumber(metric.others_tokens),
          model_counts: { ...(metric.model_counts ?? {}) },
          model_revenue_msats: { ...(metric.model_revenue_msats ?? {}) },
          model_tokens: { ...(metric.model_tokens ?? {}) },
        });
        continue;
      }

      existing.total_successful += asNumber(metric.total_successful);
      existing.total_revenue_msats += asNumber(metric.total_revenue_msats);
      existing.total_tokens += asNumber(metric.total_tokens);
      existing.others += asNumber(metric.others);
      existing.others_revenue_msats += asNumber(metric.others_revenue_msats);
      existing.others_tokens += asNumber(metric.others_tokens);
      mergeNumberRecords(existing.model_counts, metric.model_counts ?? {});
      mergeNumberRecords(
        existing.model_revenue_msats,
        metric.model_revenue_msats ?? {}
      );
      mergeNumberRecords(existing.model_tokens, metric.model_tokens ?? {});
    }
  }

  const metrics = Array.from(mergedByTimestamp.entries())
    .sort(([a], [b]) => {
      const aMs = a.startsWith("ms:") ? Number(a.slice(3)) : Number.NaN;
      const bMs = b.startsWith("ms:") ? Number(b.slice(3)) : Number.NaN;
      if (Number.isFinite(aMs) && Number.isFinite(bMs)) return aMs - bMs;
      return a.localeCompare(b);
    })
    .map(([, metric]) => metric);

  const totalRequestsFromMetrics = metrics.reduce(
    (sum, metric) => sum + asNumber(metric.total_successful),
    0
  );
  const totalTokensFromMetrics = metrics.reduce(
    (sum, metric) => sum + asNumber(metric.total_tokens),
    0
  );
  const totalRevenueMsatsFromMetrics = metrics.reduce(
    (sum, metric) => sum + asNumber(metric.total_revenue_msats),
    0
  );

  if (!Number.isFinite(summary.total_requests)) {
    summary.total_requests = totalRequestsFromMetrics;
  }
  if (!Number.isFinite(summary.successful_chat_completions)) {
    summary.successful_chat_completions = totalRequestsFromMetrics;
  }
  if (!Number.isFinite(summary.total_tokens)) {
    summary.total_tokens = totalTokensFromMetrics;
  }
  if (!Number.isFinite(summary.revenue_msats) && !Number.isFinite(summary.revenue_sats)) {
    summary.revenue_msats = totalRevenueMsatsFromMetrics;
  }

  const intervalMinutes = payloads
    .map((payload) => payload.intervalMinutes)
    .filter((value) => value > 0)
    .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
  const mixIntervalMinutes = payloads
    .map((payload) => payload.mixIntervalMinutes)
    .filter((value) => value > 0)
    .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);

  return {
    intervalMinutes: Number.isFinite(intervalMinutes) ? intervalMinutes : 60,
    mixIntervalMinutes: Number.isFinite(mixIntervalMinutes)
      ? mixIntervalMinutes
      : 60,
    summary,
    metrics,
    topModels: deriveTopModels(metrics),
  };
}

function formatUpdatedAt(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getWindowPayload(payload: AnalyticsPayload, key: WindowKey): WindowPayload | null {
  const windows = asRecord(payload.windows);
  const selectedWindow =
    key === "3m" ? asRecord(windows["3m"] ?? windows["90d"]) : asRecord(windows[key]);
  const hasSelectedWindow =
    selectedWindow.interval_minutes !== undefined ||
    selectedWindow.summary !== undefined ||
    selectedWindow.model_usage_mix !== undefined;
  const windowRaw =
    hasSelectedWindow
      ? selectedWindow
      : key === "24h"
        ? {
            summary: payload.summary ?? {},
            model_usage_mix: payload.model_usage_mix ?? {},
            top_model_usage: payload.top_model_usage ?? [],
            interval_minutes: 60,
          }
        : null;

  if (!windowRaw) return null;

  const modelUsageMix = asRecord(windowRaw.model_usage_mix);
  const metrics = asArray(modelUsageMix.metrics)
    .map(parseModelUsageMetric)
    .filter((metric): metric is ModelUsageMixMetric => metric !== null);
  const declaredTopModels = asArray(modelUsageMix.top_models)
    .map(asString)
    .filter((model) => model.length > 0);
  const topModels =
    declaredTopModels.length > 0 ? declaredTopModels : deriveTopModels(metrics);

  return {
    intervalMinutes: Math.max(1, asNumber(windowRaw.interval_minutes) || 60),
    mixIntervalMinutes: Math.max(
      1,
      asNumber(modelUsageMix.interval_minutes) ||
        asNumber(windowRaw.interval_minutes) ||
        60
    ),
    summary: asRecord(windowRaw.summary),
    metrics,
    topModels,
  };
}

function getPrimaryPayload(payload: AnalyticsPayload): WindowPayload | null {
  const modelUsageMix = asRecord(payload.model_usage_mix);
  const summary = asRecord(payload.summary);
  if (Object.keys(modelUsageMix).length === 0 && Object.keys(summary).length === 0) {
    return null;
  }
  const metrics = asArray(modelUsageMix.metrics)
    .map(parseModelUsageMetric)
    .filter((metric): metric is ModelUsageMixMetric => metric !== null);
  const declaredTopModels = asArray(modelUsageMix.top_models)
    .map(asString)
    .filter((model) => model.length > 0);
  const topModels =
    declaredTopModels.length > 0 ? declaredTopModels : deriveTopModels(metrics);

  return {
    intervalMinutes: Math.max(1, asNumber(payload.interval_minutes) || 60),
    mixIntervalMinutes: Math.max(1, asNumber(modelUsageMix.interval_minutes) || 60),
    summary,
    metrics,
    topModels,
  };
}

function resolveProviderLabel(payload: AnalyticsPayload, providerId: string): string {
  const endpointUrls = Array.isArray(payload.endpoint_urls)
    ? payload.endpoint_urls
    : [];
  const first = endpointUrls.find(
    (url) => typeof url === "string" && url.length > 0
  );
  if (!first) return providerId;
  try {
    return new URL(first).host.replace(/^www\./, "");
  } catch {
    return providerId;
  }
}

function getTagValue(event: Event, name: string): string {
  return event.tags.find((tag) => tag[0] === name)?.[1] ?? "";
}

function parsePeriodFromEvent(
  event: Event,
  payload: AnalyticsPayload,
  providerId: string
): { periodType: PeriodType; periodKey: string } | null {
  const periodTypeRaw = asString(payload.period_type);
  const periodKeyRaw = asString(payload.period_key);
  if (
    (periodTypeRaw === "latest" || periodTypeRaw === "day" || periodTypeRaw === "month") &&
    periodKeyRaw
  ) {
    return { periodType: periodTypeRaw, periodKey: periodKeyRaw };
  }

  const dTag = getTagValue(event, "d");
  if (!dTag || dTag.includes(":checkpoint:")) return null;

  if (dTag === `${providerId}:usage` || dTag.endsWith(":usage:latest")) {
    return { periodType: "latest", periodKey: "latest" };
  }
  if (dTag === `${providerId}:stats` || dTag.endsWith(":stats")) {
    return { periodType: "latest", periodKey: "latest" };
  }

  const monthMatch = dTag.match(/:usage:month:([0-9]{4}-[0-9]{2})$/);
  if (monthMatch) {
    return { periodType: "month", periodKey: monthMatch[1] };
  }

  const dayMatch = dTag.match(/:usage(?::day)?:([0-9]{4}-[0-9]{2}-[0-9]{2})$/);
  if (dayMatch) {
    return { periodType: "day", periodKey: dayMatch[1] };
  }

  return { periodType: "latest", periodKey: "latest" };
}

function parseDayKeyToMs(dayKey: string): number | null {
  const parsed = new Date(`${dayKey}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function parseMonthKeyToMs(monthKey: string): number | null {
  const parsed = new Date(`${monthKey}-01T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function keepRecentByDays(events: PeriodSnapshot[], days: number): PeriodSnapshot[] {
  const now = Date.now();
  const cutoffMs = now - days * 24 * 60 * 60 * 1000;
  return events.filter((event) => {
    const keyMs = parseDayKeyToMs(event.periodKey);
    return keyMs !== null && keyMs >= cutoffMs;
  });
}

function keepRecentByMonths(events: PeriodSnapshot[], months: number): PeriodSnapshot[] {
  const now = new Date();
  const cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1);
  return events.filter((event) => {
    const keyMs = parseMonthKeyToMs(event.periodKey);
    return keyMs !== null && keyMs >= cutoff;
  });
}

function getPayloadsForTimeline(timeline: ProviderTimeline, window: WindowKey): WindowPayload[] {
  if (timeline.latest) {
    const latestWindow = getWindowPayload(timeline.latest.payload, window);
    if (latestWindow) return [latestWindow];
  }

  if (window === "24h" || window === "7d" || window === "30d") {
    return [];
  }

  if (window === "3m") {
    const recentMonths = keepRecentByMonths(timeline.month, 3)
      .map((snapshot) => getPrimaryPayload(snapshot.payload))
      .filter((payload): payload is WindowPayload => payload !== null);
    if (recentMonths.length > 0) return recentMonths;

    return keepRecentByDays(timeline.day, 90)
      .map((snapshot) => getPrimaryPayload(snapshot.payload))
      .filter((payload): payload is WindowPayload => payload !== null);
  }

  if (window === "1y") {
    const recentMonths = keepRecentByMonths(timeline.month, 12)
      .map((snapshot) => getPrimaryPayload(snapshot.payload))
      .filter((payload): payload is WindowPayload => payload !== null);
    if (recentMonths.length > 0) return recentMonths;

    return keepRecentByDays(timeline.day, 365)
      .map((snapshot) => getPrimaryPayload(snapshot.payload))
      .filter((payload): payload is WindowPayload => payload !== null);
  }
  return [];
}

function createAbortError(): Error {
  if (typeof DOMException === "function") {
    return new DOMException("Query cancelled", "AbortError");
  }
  const error = new Error("Query cancelled");
  error.name = "AbortError";
  return error;
}

function fetchStatsSnapshots(signal?: AbortSignal): Promise<StatsQueryData> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    let active = true;
    let settled = false;
    let hardTimeout: ReturnType<typeof setTimeout> | null = null;
    let eoseTimer: ReturnType<typeof setTimeout> | null = null;
    let relayStatuses = createInitialRelayStatuses();
    const pool = createPool();
    let sub: ReturnType<typeof pool.subscribeMany> | null = null;

    const latestByProvider = new Map<string, PeriodSnapshot>();
    const dayByProvider = new Map<string, Map<string, PeriodSnapshot>>();
    const monthByProvider = new Map<string, Map<string, PeriodSnapshot>>();

    const cleanup = () => {
      active = false;
      if (hardTimeout) clearTimeout(hardTimeout);
      if (eoseTimer) clearTimeout(eoseTimer);
      if (signal) signal.removeEventListener("abort", handleAbort);
      try {
        sub?.close();
      } catch {
        // ignore
      }
      try {
        pool.close(RELAYS);
      } catch {
        // ignore
      }
    };

    const updateRelayStatuses = (
      updater: (
        current: Record<string, RelayStatus>
      ) => Record<string, RelayStatus>
    ) => {
      if (!active) return;
      relayStatuses = updater(relayStatuses);
    };

    const finish = (finishReason: "eose" | "timeout") => {
      if (!active || settled) return;
      settled = true;

      const connectionMap = new Map<string, boolean>();
      Array.from(pool.listConnectionStatus().entries()).forEach(([url, isConnected]) => {
        connectionMap.set(normalizeRelayUrl(url), Boolean(isConnected));
      });

      updateRelayStatuses((current) => {
        const next = { ...current };
        for (const relay of RELAYS) {
          const key = normalizeRelayUrl(relay);
          const status = next[key] ?? {
            url: relay,
            state: "connecting" as RelayState,
            events: 0,
            reason: null,
          };
          if (status.state === "active") {
            next[key] = { ...status, state: "done", reason: null };
            continue;
          }
          if (status.state !== "connecting") {
            continue;
          }
          if (finishReason === "timeout") {
            next[key] = {
              ...status,
              state: "timeout",
              reason: status.reason ?? "request timed out",
            };
            continue;
          }
          const connected = connectionMap.get(key) ?? false;
          next[key] = {
            ...status,
            state: connected ? "no-data" : "error",
            reason: status.reason ?? (connected ? "no events returned" : "connection failed"),
          };
        }
        return next;
      });

      cleanup();

      const providerIds = new Set<string>([
        ...Array.from(latestByProvider.keys()),
        ...Array.from(dayByProvider.keys()),
        ...Array.from(monthByProvider.keys()),
      ]);

      const timelines: ProviderTimeline[] = Array.from(providerIds).map((providerId) => {
        const latest = latestByProvider.get(providerId) ?? null;
        const day = Array.from(dayByProvider.get(providerId)?.values() ?? []).sort((a, b) =>
          a.periodKey.localeCompare(b.periodKey)
        );
        const month = Array.from(monthByProvider.get(providerId)?.values() ?? []).sort((a, b) =>
          a.periodKey.localeCompare(b.periodKey)
        );

        const labelSource = latest ?? day[day.length - 1] ?? month[month.length - 1] ?? null;
        const providerLabel = labelSource
          ? resolveProviderLabel(labelSource.payload, providerId)
          : providerId;

        return {
          providerId,
          providerLabel,
          latest,
          day,
          month,
        };
      });

      timelines.sort((a, b) => a.providerLabel.localeCompare(b.providerLabel));

      resolve({
        timelines,
        relayStatuses,
        emptyMessage: timelines.length === 0 ? "No analytics snapshots found yet." : null,
      });
    };

    function handleAbort() {
      if (settled) return;
      settled = true;
      cleanup();
      reject(createAbortError());
    }

    signal?.addEventListener("abort", handleAbort, { once: true });

    sub = pool.subscribeMany(RELAYS, { kinds: [ANALYTICS_KIND], limit: 20000 }, {
      receivedEvent(relay) {
        updateRelayStatuses((current) => {
          const key = normalizeRelayUrl(relay.url);
          const existing = current[key] ?? {
            url: relay.url,
            state: "connecting" as RelayState,
            events: 0,
            reason: null,
          };
          return {
            ...current,
            [key]: {
              ...existing,
              url: relay.url,
              state: "active",
              events: existing.events + 1,
              reason: null,
            },
          };
        });
      },
      onevent(event: Event) {
        if (!active) return;
        if (eoseTimer) {
          clearTimeout(eoseTimer);
          eoseTimer = null;
        }

        let parsed: unknown = null;
        try {
          parsed = JSON.parse(event.content);
        } catch {
          return;
        }
        if (!isRecord(parsed)) return;

        const schema = asString(parsed.schema);
        if (!ANALYTICS_SCHEMAS.has(schema)) return;

        const providerIdFromTag = getTagValue(event, "provider");
        const providerId =
          asString(parsed.provider_id) ||
          providerIdFromTag ||
          event.pubkey.slice(0, 12);
        if (!providerId) return;

        const payload: AnalyticsPayload = {
          schema,
          provider_id: providerId,
          endpoint_urls: Array.isArray(parsed.endpoint_urls)
            ? parsed.endpoint_urls.filter(
                (value): value is string => typeof value === "string"
              )
            : undefined,
          windows: isRecord(parsed.windows) ? parsed.windows : undefined,
          summary: isRecord(parsed.summary) ? parsed.summary : undefined,
          model_usage_mix: isRecord(parsed.model_usage_mix)
            ? parsed.model_usage_mix
            : undefined,
          top_model_usage: Array.isArray(parsed.top_model_usage)
            ? parsed.top_model_usage
            : undefined,
          period_type: asString(parsed.period_type) || undefined,
          period_key: asString(parsed.period_key) || undefined,
          interval_minutes:
            typeof parsed.interval_minutes === "number" ? parsed.interval_minutes : undefined,
          window_hours:
            typeof parsed.window_hours === "number" ? parsed.window_hours : undefined,
        };

        const period = parsePeriodFromEvent(event, payload, providerId);
        if (!period) return;

        const snapshot: PeriodSnapshot = {
          providerId,
          providerLabel: resolveProviderLabel(payload, providerId),
          eventCreatedAt: event.created_at,
          periodType: period.periodType,
          periodKey: period.periodKey,
          payload,
        };

        if (period.periodType === "latest") {
          const current = latestByProvider.get(providerId);
          if (!current || current.eventCreatedAt < snapshot.eventCreatedAt) {
            latestByProvider.set(providerId, snapshot);
          }
          return;
        }

        if (period.periodType === "day") {
          const byDay = dayByProvider.get(providerId) ?? new Map<string, PeriodSnapshot>();
          const current = byDay.get(period.periodKey);
          if (!current || current.eventCreatedAt < snapshot.eventCreatedAt) {
            byDay.set(period.periodKey, snapshot);
          }
          dayByProvider.set(providerId, byDay);
          return;
        }

        const byMonth = monthByProvider.get(providerId) ?? new Map<string, PeriodSnapshot>();
        const current = byMonth.get(period.periodKey);
        if (!current || current.eventCreatedAt < snapshot.eventCreatedAt) {
          byMonth.set(period.periodKey, snapshot);
        }
        monthByProvider.set(providerId, byMonth);
      },
      onclose(reasons) {
        updateRelayStatuses((current) => {
          const next = { ...current };
          reasons.forEach((reason, index) => {
            const relay = RELAYS[index];
            if (!relay || !reason) return;
            const key = normalizeRelayUrl(relay);
            const status = next[key] ?? {
              url: relay,
              state: "connecting" as RelayState,
              events: 0,
              reason: null,
            };
            const lower = reason.toLowerCase();
            if (lower.includes("timeout") || lower.includes("timed out")) {
              next[key] = { ...status, state: "timeout", reason };
              return;
            }
            if (
              lower.includes("auth-required") ||
              lower.includes("failed") ||
              lower.includes("error") ||
              lower.includes("disconnect") ||
              lower.includes("refused")
            ) {
              next[key] = { ...status, state: "error", reason };
              return;
            }
            if (lower.includes("closed by caller")) {
              next[key] = {
                ...status,
                state: status.state === "active" ? "done" : "no-data",
                reason: null,
              };
              return;
            }
            next[key] = { ...status, reason };
          });
          return next;
        });
      },
      oneose() {
        if (eoseTimer) clearTimeout(eoseTimer);
        eoseTimer = setTimeout(() => finish("eose"), 500);
      },
    });

    hardTimeout = setTimeout(() => finish("timeout"), 9000);
  });
}

function StatsPageContent() {
  const [selectedWindow, setSelectedWindow] = useState<WindowKey>("30d");
  const [selectedMode, setSelectedMode] = useState<ChartMode>("requests");
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    ALL_PROVIDERS_ID
  );
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [relayStatusOpen, setRelayStatusOpen] = useState(false);
  const emptyTimelines = useMemo<ProviderTimeline[]>(() => [], []);
  const fallbackRelayStatuses = useMemo(() => createInitialRelayStatuses(), []);
  const {
    data,
    error: queryError,
    isFetching,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ["stats-snapshots"],
    queryFn: ({ signal }) => fetchStatsSnapshots(signal),
    placeholderData: (previousData) => previousData,
    refetchInterval: 90_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
  const timelines = data?.timelines ?? emptyTimelines;
  const relayStatuses = data?.relayStatuses ?? fallbackRelayStatuses;
  const loading = isPending && !data;
  const error =
    data?.emptyMessage ??
    (loading
      ? null
      : queryError instanceof Error
        ? queryError.message
        : queryError
          ? "Unable to load analytics snapshots."
          : null);

  useEffect(() => {
    if (timelines.length === 0) {
      setSelectedProviderId(ALL_PROVIDERS_ID);
      return;
    }
    if (selectedProviderId === ALL_PROVIDERS_ID) {
      return;
    }
    const exists = timelines.some((timeline) => timeline.providerId === selectedProviderId);
    if (!exists) {
      setSelectedProviderId(ALL_PROVIDERS_ID);
    }
  }, [selectedProviderId, timelines]);

  const providerOptions = useMemo(
    () => [{ providerId: ALL_PROVIDERS_ID, providerLabel: "All providers" }, ...timelines],
    [timelines]
  );

  const selectedProviderOption =
    providerOptions.find((option) => option.providerId === selectedProviderId) ??
    providerOptions[0];

  const selectedTimeline = useMemo(() => {
    if (selectedProviderId === ALL_PROVIDERS_ID) return null;
    return timelines.find((timeline) => timeline.providerId === selectedProviderId) ?? null;
  }, [selectedProviderId, timelines]);
  const latestSnapshotUnixSeconds = useMemo(() => {
    const targetTimelines =
      selectedProviderId === ALL_PROVIDERS_ID
        ? timelines
        : selectedTimeline
          ? [selectedTimeline]
          : [];
    let latest = 0;
    for (const timeline of targetTimelines) {
      latest = Math.max(
        latest,
        timeline.latest?.eventCreatedAt ?? 0,
        timeline.day[timeline.day.length - 1]?.eventCreatedAt ?? 0,
        timeline.month[timeline.month.length - 1]?.eventCreatedAt ?? 0
      );
    }
    return latest > 0 ? latest : null;
  }, [selectedProviderId, selectedTimeline, timelines]);

  const selectedWindowPayload = useMemo(() => {
    const coarsen = (payload: WindowPayload | null): WindowPayload | null =>
      payload ? coarsenWindowPayloadForDisplay(payload, selectedWindow) : null;

    if (selectedProviderId === ALL_PROVIDERS_ID) {
      const payloads = timelines.flatMap((timeline) =>
        getPayloadsForTimeline(timeline, selectedWindow)
      );
      return coarsen(mergeWindowPayloads(payloads));
    }

    if (!selectedTimeline) return null;
    return coarsen(
      mergeWindowPayloads(getPayloadsForTimeline(selectedTimeline, selectedWindow))
    );
  }, [selectedProviderId, selectedTimeline, selectedWindow, timelines]);

  const modelUsageMix = useMemo<ModelUsageMix | null>(() => {
    if (!selectedWindowPayload) return null;

    return {
      top_models: selectedWindowPayload.topModels,
      metrics: selectedWindowPayload.metrics,
      interval_minutes: selectedWindowPayload.mixIntervalMinutes,
      hours_back: WINDOW_HOURS[selectedWindow],
      total_buckets: selectedWindowPayload.metrics.length,
    };
  }, [selectedWindow, selectedWindowPayload]);

  const summary = selectedWindowPayload?.summary ?? null;
  const requests = summary
    ? asNumber(summary.total_requests || summary.successful_chat_completions)
    : null;
  const tokens = summary ? asNumber(summary.total_tokens) : null;
  const revenueSats = summary
    ? asNumber(summary.revenue_sats) > 0
      ? asNumber(summary.revenue_sats)
      : asNumber(summary.revenue_msats) / 1000
    : null;
  const updatedStatusText = latestSnapshotUnixSeconds
    ? `Updated ${formatUpdatedAt(latestSnapshotUnixSeconds)}`
    : loading
      ? "Loading snapshots..."
      : "No snapshots yet";

  const relayStatusList = RELAYS.map((relay) => {
    const key = normalizeRelayUrl(relay);
    return (
      relayStatuses[key] ?? {
        url: relay,
        state: "connecting" as RelayState,
        events: 0,
        reason: null,
      }
    );
  });
  const respondingRelays = relayStatusList.filter(
    (relay) => relay.state === "active" || relay.state === "done" || relay.state === "no-data"
  ).length;
  const relayDots = relayStatusList.slice(0, 8);
  const hiddenRelayDotsCount = Math.max(0, relayStatusList.length - relayDots.length);

  const relayStatusControl = (
    <Popover open={relayStatusOpen} onOpenChange={setRelayStatusOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Show relay statuses"
          className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
        >
          <span>
            Relays {respondingRelays}/{relayStatusList.length}
          </span>
          <span className="inline-flex items-center gap-1">
            {relayDots.map((relay) => {
              const meta = getRelayStateMeta(relay.state);
              return (
                <span
                  key={`relay-dot-${relay.url}`}
                  className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)}
                />
              );
            })}
            {hiddenRelayDotsCount > 0 ? (
              <span className="text-[10px] leading-none text-muted-foreground">
                +{hiddenRelayDotsCount}
              </span>
            ) : null}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(88vw,20rem)] border-border bg-card p-2 shadow-xl"
      >
        <div className="space-y-1">
          {relayStatusList.map((relay) => {
            const meta = getRelayStateMeta(relay.state);
            return (
              <div
                key={relay.url}
                title={relay.reason ?? `${relay.events} events`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-1 py-0.5 text-[10px]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} />
                  <span className="truncate text-muted-foreground">
                    {formatRelayLabel(relay.url)}
                  </span>
                </span>
                <span className={cn("shrink-0 capitalize", meta.textClass)}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <SiteShell useMain={false}>
      <section className="w-full relative">
        <PageContainer className="pb-14 pt-20">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-4 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                Network Stats
              </h1>
              <p className="max-w-2xl text-base font-light leading-relaxed text-muted-foreground md:text-lg">
                Shared usage analytics published by Routstr nodes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start md:self-end">
              <p className="text-xs text-muted-foreground">{updatedStatusText}</p>
              <Button
                variant="outline"
                className="h-9 w-auto border-border bg-transparent px-3 text-xs text-foreground hover:bg-muted"
                onClick={() => {
                  void refetch();
                }}
                disabled={isFetching}
              >
                {isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                  Active providers
                </p>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="What counts as an active provider?"
                    className="peer text-muted-foreground/80 transition-colors hover:text-foreground"
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                  </button>
                  <div
                    id="active-providers-tooltip"
                    role="tooltip"
                    className="pointer-events-none invisible absolute left-0 top-full z-20 mt-2 w-56 border border-border bg-card/95 p-3 opacity-0 shadow-md transition-all duration-150 peer-hover:visible peer-hover:opacity-100"
                  >
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      This only counts providers that have enabled analytics sharing.
                    </p>
                  </div>
                </div>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-12 bg-border" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">{formatCompactCount(timelines.length)}</p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                {selectedWindow} Requests
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-20 bg-border" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {requests === null ? "—" : formatCompactCount(requests)}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                {selectedWindow} Tokens
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-20 bg-border" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {tokens === null ? "—" : formatCompactCount(tokens)}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                {selectedWindow} Revenue (sats)
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-24 bg-border" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {revenueSats === null ? "—" : formatCompactCount(revenueSats)}
                </p>
              )}
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="relative w-full flex-grow">
        <PageContainer className="py-14">
          <div className="mb-10 flex flex-col gap-8">
            <div className="grid gap-6 md:grid-cols-3 md:items-start">
              <div className="min-w-0">
                <p className="mb-3 text-[10px] tracking-[0.04em] text-muted-foreground">
                  Provider
                </p>
                <Popover open={providerDropdownOpen} onOpenChange={setProviderDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="stats-provider-select"
                      variant="outline"
                      role="combobox"
                      aria-expanded={providerDropdownOpen}
                      className="h-10 w-full justify-between border-border bg-card px-3 text-left text-sm font-normal text-foreground hover:bg-muted hover:text-foreground"
                    >
                      <span className="truncate">{selectedProviderOption.providerLabel}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[--radix-popover-trigger-width] border-border bg-card p-0"
                  >
                    <Command className="bg-card text-foreground">
                      <CommandInput
                        placeholder="Find provider..."
                        className="text-sm text-foreground placeholder:text-muted-foreground"
                      />
                      <CommandList className="max-h-64">
                        <CommandEmpty className="py-4 text-sm text-muted-foreground">
                          No providers found.
                        </CommandEmpty>
                        <CommandGroup className="p-1">
                          {providerOptions.map((option) => (
                            <CommandItem
                              key={option.providerId}
                              value={`${option.providerLabel} ${option.providerId}`}
                              onSelect={() => {
                                setSelectedProviderId(option.providerId);
                                setProviderDropdownOpen(false);
                              }}
                              className="rounded px-2 py-2 text-sm text-muted-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                            >
                              <span className="truncate">{option.providerLabel}</span>
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedProviderId === option.providerId
                                    ? "opacity-100 text-foreground"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="min-w-0">
                <p className="mb-3 text-[10px] tracking-[0.04em] text-muted-foreground">
                  Window
                </p>
                <Tabs
                  value={selectedWindow}
                  onValueChange={(value) => setSelectedWindow(value as WindowKey)}
                >
                  <TabsList variant="line">
                    {WINDOW_OPTIONS.map((option) => (
                      <TabsTrigger key={option.id} value={option.id}>
                        {option.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div className="min-w-0">
                <p className="mb-3 text-[10px] tracking-[0.04em] text-muted-foreground">
                  Metric
                </p>
                <Tabs
                  value={selectedMode}
                  onValueChange={(value) => setSelectedMode(value as ChartMode)}
                >
                  <TabsList variant="line">
                    {MODE_OPTIONS.map((option) => (
                      <TabsTrigger key={option.id} value={option.id}>
                        {option.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-8 py-4">
              <div className="space-y-3">
                <Skeleton className="h-8 w-40 bg-border" />
                <Skeleton className="h-4 w-80 max-w-full bg-border" />
              </div>

              <div className="h-[250px] rounded-md border border-border/40 bg-card p-4 sm:h-[320px]">
                <div className="flex h-full items-end gap-2">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="flex-1 bg-border"
                      style={{ height: `${20 + ((index * 17) % 65)}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3"
                  >
                    <Skeleton className="h-3 w-4 bg-border" />
                    <Skeleton className="h-3 w-56 max-w-full bg-border" />
                    <Skeleton className="h-3 w-20 bg-border" />
                    <Skeleton className="h-3 w-12 bg-border" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="py-24 text-center text-sm text-muted-foreground">{error}</div>
          ) : !modelUsageMix || modelUsageMix.metrics.length === 0 ? (
            <div className="py-24 text-center text-sm text-muted-foreground">
              Provider snapshots were found, but no usage was recorded in this window.
            </div>
          ) : (
            <TopModelsUsageChart
              mix={modelUsageMix}
              displayUnit="sat"
              usdPerSat={null}
              mode={selectedMode}
              headerRight={relayStatusControl}
            />
          )}
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>
    </SiteShell>
  );
}

export default function StatsPage() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StatsPageContent />
    </QueryClientProvider>
  );
}
