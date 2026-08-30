"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, CircleHelp } from "lucide-react";
import type { Event } from "nostr-tools";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
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
  ModelShareChart,
  ProviderComparisonChart,
  type ModelSharePoint,
  type ProviderComparisonPoint,
} from "@/components/stats/stats-analytics-charts";
import {
  CHART_MODEL_LIMIT,
  CHART_MODES,
  MIN_CHART_MODEL_SHARE,
  type ChartMode,
} from "@/components/stats/stats-chart-domain";
import {
  TopModelsUsageChart,
  type ModelUsageMix,
  type ModelUsageMixMetric,
} from "@/components/stats/top-models-usage-chart";
import { Button } from "@/components/ui/button";
import { createPool, getDefaultRelays } from "@/lib/nostr";
import { formatCompactCount, formatCompactNumber } from "@/lib/number-format";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type WindowKey = "24h" | "7d" | "30d" | "3m" | "1y";
type RelayState =
  | "connecting"
  | "active"
  | "done"
  | "no-data"
  | "timeout"
  | "error";
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
  eventId: string;
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
};

type StatsQueryData = {
  timelines: ProviderTimeline[];
  relayStatuses: Record<string, RelayStatus>;
  emptyMessage: string | null;
};

type StatsFetchData = {
  relayStatuses: Record<string, RelayStatus>;
  coords: Record<string, CachedCoord>;
};

// One retained snapshot per Nostr address (pubkey + d tag). The cache merges
// per coordinate so partial relay responses cannot replace the whole dataset.
type CachedCoord = {
  d: string;
  lastObservedAtMs: number;
  snapshot: PeriodSnapshot;
};

type StatsCacheEnvelope = {
  coords: Record<string, CachedCoord>;
};

const ANALYTICS_KIND = 38422;
const ANALYTICS_SCHEMAS = new Set([
  "routstr.analytics.usage.v1",
  "routstr.analytics.usage.v2",
  "routstr.analytics.snapshot.v1",
]);
const RELAYS = Array.from(
  new Set([...getDefaultRelays(), "wss://relay.routstr.com", "wss://nos.lol"]),
);

const WINDOW_OPTIONS: Array<{ id: WindowKey; label: string }> = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "3m", label: "90d" },
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
const STATS_CACHE_KEY = "stats_snapshots_cache_v2";
const LEGACY_STATS_CACHE_KEY = "stats_snapshots_cache_v1";
const STATS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STATS_QUERY_KEY = ["stats-snapshots"] as const;
const STATS_REFETCH_MS = 15 * 60_000;
const STATS_EMPTY_RETRY_MS = 60_000;

function normalizeRelayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

const RELAY_STATE_META: Record<
  RelayState,
  { label: string; answered: boolean }
> = {
  connecting: { label: "connecting", answered: false },
  active: { label: "receiving", answered: true },
  done: { label: "synced", answered: true },
  "no-data": { label: "no data", answered: true },
  timeout: { label: "timed out", answered: false },
  error: { label: "failed", answered: false },
};

function createInitialRelayStatuses(): Record<string, RelayStatus> {
  const next: Record<string, RelayStatus> = {};
  for (const relay of RELAYS) {
    const key = normalizeRelayUrl(relay);
    next[key] = {
      url: relay,
      state: "connecting",
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
  60, 120, 180, 240, 360, 480, 720, 1440, 2880, 4320, 10080, 20160, 43200,
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
  window: WindowKey,
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
    Math.ceil((times[times.length - 1] - times[0]) / (60 * 1000)),
  );
  const maxPoints = MAX_CHART_POINTS[window];
  const needed = Math.ceil(spanMinutes / Math.max(1, maxPoints));
  return roundUpIntervalMinutes(Math.max(base, needed));
}

function rebucketMetrics(
  metrics: ModelUsageMixMetric[],
  intervalMinutes: number,
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
    mergeNumberRecords(
      existing.model_revenue_msats,
      metric.model_revenue_msats ?? {},
    );
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
  window: WindowKey,
): WindowPayload {
  const targetInterval = chooseDisplayIntervalMinutes(
    payload.metrics,
    payload.mixIntervalMinutes,
    window,
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
  source: Record<string, number>,
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
        metric.model_revenue_msats ?? {},
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
    0,
  );
  const totalTokensFromMetrics = metrics.reduce(
    (sum, metric) => sum + asNumber(metric.total_tokens),
    0,
  );
  const totalRevenueMsatsFromMetrics = metrics.reduce(
    (sum, metric) => sum + asNumber(metric.total_revenue_msats),
    0,
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
  if (
    !Number.isFinite(summary.revenue_msats) &&
    !Number.isFinite(summary.revenue_sats)
  ) {
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

function getMetricOthersValue(
  metric: ModelUsageMixMetric,
  mode: ChartMode,
): number {
  if (mode === "requests") return asNumber(metric.others);
  if (mode === "tokens") return asNumber(metric.others_tokens);
  return asNumber(metric.others_revenue_msats) / 1000;
}

function getMetricModelValues(
  metric: ModelUsageMixMetric,
  mode: ChartMode,
): Record<string, number> {
  if (mode === "requests") return metric.model_counts ?? {};
  if (mode === "tokens") return metric.model_tokens ?? {};
  const raw = metric.model_revenue_msats ?? {};
  const values: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    values[key] = asNumber(value) / 1000;
  }
  return values;
}

function getPayloadRequests(payload: WindowPayload | null): number {
  if (!payload) return 0;
  const summaryValue = asNumber(
    payload.summary.total_requests ||
      payload.summary.successful_chat_completions,
  );
  if (summaryValue > 0) return summaryValue;
  return payload.metrics.reduce(
    (sum, metric) => sum + asNumber(metric.total_successful),
    0,
  );
}

function getPayloadTokens(payload: WindowPayload | null): number {
  if (!payload) return 0;
  const summaryValue = asNumber(payload.summary.total_tokens);
  if (summaryValue > 0) return summaryValue;
  return payload.metrics.reduce(
    (sum, metric) => sum + asNumber(metric.total_tokens),
    0,
  );
}

function getPayloadRevenueSats(payload: WindowPayload | null): number {
  if (!payload) return 0;
  const revenueSats = asNumber(payload.summary.revenue_sats);
  if (revenueSats > 0) return revenueSats;
  const revenueMsats = asNumber(payload.summary.revenue_msats);
  if (revenueMsats > 0) return revenueMsats / 1000;
  return (
    payload.metrics.reduce(
      (sum, metric) => sum + asNumber(metric.total_revenue_msats),
      0,
    ) / 1000
  );
}

function countActiveModels(
  metrics: ModelUsageMixMetric[],
  mode: ChartMode,
): number {
  const models = new Set<string>();
  for (const metric of metrics) {
    for (const [model, value] of Object.entries(
      getMetricModelValues(metric, mode),
    )) {
      if (!model || model === "unknown" || asNumber(value) <= 0) continue;
      models.add(model);
    }
  }
  return models.size;
}

function buildModelShare(
  metrics: ModelUsageMixMetric[],
  mode: ChartMode,
): ModelSharePoint[] {
  const totals = new Map<string, number>();
  let othersTotal = 0;

  for (const metric of metrics) {
    for (const [model, value] of Object.entries(
      getMetricModelValues(metric, mode),
    )) {
      if (!model || model === "unknown") continue;
      const parsed = asNumber(value);
      if (!Number.isFinite(parsed) || parsed <= 0) continue;
      totals.set(model, (totals.get(model) ?? 0) + parsed);
    }
    othersTotal += getMetricOthersValue(metric, mode);
  }

  const ranked = Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const total = ranked.reduce((sum, row) => sum + row.value, 0) + othersTotal;

  if (total <= 0) return [];

  // Same cohort rule as the timeline, so a model is never named here while the
  // chart folds it into Other.
  const topRows = ranked
    .filter((row) => row.value / total >= MIN_CHART_MODEL_SHARE)
    .slice(0, CHART_MODEL_LIMIT);
  const named = new Set(topRows.map((row) => row.label));
  const remainingTotal =
    othersTotal +
    ranked
      .filter((row) => !named.has(row.label))
      .reduce((sum, row) => sum + row.value, 0);

  const rows: ModelSharePoint[] = topRows.map((row) => ({
    kind: "model",
    label: row.label,
    value: row.value,
    share: row.value / total,
  }));

  if (remainingTotal > 0) {
    rows.push({
      kind: "other",
      label: "Other models",
      value: remainingTotal,
      share: remainingTotal / total,
    });
  }

  return rows;
}

function formatUpdatedAt(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function getWindowPayload(
  payload: AnalyticsPayload,
  key: WindowKey,
): WindowPayload | null {
  const windows = asRecord(payload.windows);
  const selectedWindow =
    key === "3m"
      ? asRecord(windows["3m"] ?? windows["90d"])
      : asRecord(windows[key]);
  const hasSelectedWindow =
    selectedWindow.interval_minutes !== undefined ||
    selectedWindow.summary !== undefined ||
    selectedWindow.model_usage_mix !== undefined;
  const windowRaw = hasSelectedWindow
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
        60,
    ),
    summary: asRecord(windowRaw.summary),
    metrics,
    topModels,
  };
}

function getPrimaryPayload(payload: AnalyticsPayload): WindowPayload | null {
  const modelUsageMix = asRecord(payload.model_usage_mix);
  const summary = asRecord(payload.summary);
  if (
    Object.keys(modelUsageMix).length === 0 &&
    Object.keys(summary).length === 0
  ) {
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
    mixIntervalMinutes: Math.max(
      1,
      asNumber(modelUsageMix.interval_minutes) || 60,
    ),
    summary,
    metrics,
    topModels,
  };
}

function resolveProviderLabel(
  payload: AnalyticsPayload,
  providerId: string,
): string {
  const endpointUrls = Array.isArray(payload.endpoint_urls)
    ? payload.endpoint_urls
    : [];
  const first = endpointUrls.find(
    (url) => typeof url === "string" && url.length > 0,
  );
  if (!first) return providerId;
  try {
    return new URL(first).host.replace(/^www\./, "");
  } catch {
    return providerId;
  }
}

function getCoordKey(pubkey: string, d: string): string {
  return `${pubkey}|${d}`;
}

function shouldReplaceSnapshot(
  candidate: PeriodSnapshot,
  current: PeriodSnapshot,
): boolean {
  if (candidate.eventCreatedAt !== current.eventCreatedAt) {
    return candidate.eventCreatedAt > current.eventCreatedAt;
  }
  return candidate.eventId < current.eventId;
}

function mergeCachedCoord(
  current: CachedCoord | undefined,
  candidate: CachedCoord,
): CachedCoord {
  if (!current) return candidate;

  const candidateWins = shouldReplaceSnapshot(candidate.snapshot, current.snapshot);
  const snapshot = candidateWins ? candidate.snapshot : current.snapshot;
  const lastObservedAtMs = Math.max(
    current.lastObservedAtMs,
    candidate.lastObservedAtMs,
  );
  if (
    snapshot === current.snapshot &&
    lastObservedAtMs === current.lastObservedAtMs
  ) {
    return current;
  }
  return {
    d: candidateWins ? candidate.d : current.d,
    lastObservedAtMs,
    snapshot,
  };
}

function mergeCachedCoords(
  current: Record<string, CachedCoord>,
  incoming: Record<string, CachedCoord>,
): Record<string, CachedCoord> {
  const merged = { ...current };
  for (const [key, candidate] of Object.entries(incoming)) {
    merged[key] = mergeCachedCoord(merged[key], candidate);
  }
  return merged;
}

function retainFreshCachedCoords(
  coords: Record<string, CachedCoord>,
  nowMs = Date.now(),
): Record<string, CachedCoord> {
  const cutoffMs = nowMs - STATS_CACHE_TTL_MS;
  return Object.fromEntries(
    Object.entries(coords).filter(
      ([, coord]) => coord.lastObservedAtMs >= cutoffMs,
    ),
  );
}

function parsePeriodFromEvent(
  payload: AnalyticsPayload,
  dTag: string,
): { periodType: PeriodType; periodKey: string } | null {
  const periodTypeRaw = asString(payload.period_type);
  const periodKeyRaw = asString(payload.period_key);
  if (
    (periodTypeRaw === "latest" ||
      periodTypeRaw === "day" ||
      periodTypeRaw === "month") &&
    periodKeyRaw
  ) {
    return { periodType: periodTypeRaw, periodKey: periodKeyRaw };
  }

  if (dTag.includes(":checkpoint:")) return null;

  if (dTag.endsWith(":usage") || dTag.endsWith(":usage:latest")) {
    return { periodType: "latest", periodKey: "latest" };
  }
  if (dTag.endsWith(":stats")) {
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

function keepRecentByDays(
  events: PeriodSnapshot[],
  days: number,
): PeriodSnapshot[] {
  const now = Date.now();
  const cutoffMs = now - days * 24 * 60 * 60 * 1000;
  return events.filter((event) => {
    const keyMs = parseDayKeyToMs(event.periodKey);
    return keyMs !== null && keyMs >= cutoffMs;
  });
}

function keepRecentByMonths(
  events: PeriodSnapshot[],
  months: number,
): PeriodSnapshot[] {
  const now = new Date();
  const cutoff = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - months + 1,
    1,
  );
  return events.filter((event) => {
    const keyMs = parseMonthKeyToMs(event.periodKey);
    return keyMs !== null && keyMs >= cutoff;
  });
}

function getPayloadsForTimeline(
  timeline: ProviderTimeline,
  window: WindowKey,
): WindowPayload[] {
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

function readStatsCache(): Record<string, CachedCoord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Partial<StatsCacheEnvelope> | null;
    if (!parsed || !isRecord(parsed.coords)) return {};

    const coords: Record<string, CachedCoord> = {};
    for (const [key, value] of Object.entries(parsed.coords)) {
      if (!isRecord(value) || !isRecord(value.snapshot)) continue;
      const snapshot = value.snapshot;
      if (
        typeof value.d !== "string" ||
        value.d.length === 0 ||
        typeof value.lastObservedAtMs !== "number" ||
        !Number.isFinite(value.lastObservedAtMs) ||
        typeof snapshot.eventId !== "string" ||
        !/^[0-9a-f]{64}$/.test(snapshot.eventId) ||
        typeof snapshot.providerId !== "string" ||
        !/^[0-9a-f]{64}$/.test(snapshot.providerId) ||
        typeof snapshot.providerLabel !== "string" ||
        typeof snapshot.eventCreatedAt !== "number" ||
        !Number.isFinite(snapshot.eventCreatedAt) ||
        (snapshot.periodType !== "latest" &&
          snapshot.periodType !== "day" &&
          snapshot.periodType !== "month") ||
        typeof snapshot.periodKey !== "string" ||
        !isRecord(snapshot.payload)
      ) {
        continue;
      }
      const coord = value as unknown as CachedCoord;
      if (key !== getCoordKey(coord.snapshot.providerId, coord.d)) continue;
      coords[key] = coord;
    }
    return retainFreshCachedCoords(coords);
  } catch {
    return {};
  }
}

async function updateStatsCache(
  coords: Record<string, CachedCoord>,
): Promise<Record<string, CachedCoord>> {
  if (typeof window === "undefined") return coords;

  const persist = () => {
    const merged = retainFreshCachedCoords(
      mergeCachedCoords(readStatsCache(), coords),
    );
    if (Object.keys(merged).length === 0) return merged;
    try {
      const payload: StatsCacheEnvelope = {
        coords: merged,
      };
      window.localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(payload));
      window.localStorage.removeItem(LEGACY_STATS_CACHE_KEY);
    } catch {
      // ignore storage errors
    }
    return merged;
  };

  try {
    return await window.navigator.locks.request(STATS_CACHE_KEY, persist);
  } catch {
    return persist();
  }
}

function buildTimelinesFromCoords(coords: CachedCoord[]): ProviderTimeline[] {
  const latestByProvider = new Map<string, PeriodSnapshot>();
  const dayByProvider = new Map<string, Map<string, PeriodSnapshot>>();
  const monthByProvider = new Map<string, Map<string, PeriodSnapshot>>();

  for (const coord of coords) {
    const snapshot = coord.snapshot;
    if (snapshot.periodType === "latest") {
      const current = latestByProvider.get(snapshot.providerId);
      if (!current || shouldReplaceSnapshot(snapshot, current)) {
        latestByProvider.set(snapshot.providerId, snapshot);
      }
      continue;
    }
    const byPeriod =
      snapshot.periodType === "day" ? dayByProvider : monthByProvider;
    const map =
      byPeriod.get(snapshot.providerId) ?? new Map<string, PeriodSnapshot>();
    const current = map.get(snapshot.periodKey);
    if (!current || shouldReplaceSnapshot(snapshot, current)) {
      map.set(snapshot.periodKey, snapshot);
    }
    byPeriod.set(snapshot.providerId, map);
  }

  const providerIds = new Set<string>([
    ...Array.from(latestByProvider.keys()),
    ...Array.from(dayByProvider.keys()),
    ...Array.from(monthByProvider.keys()),
  ]);

  const timelines: ProviderTimeline[] = Array.from(providerIds).map(
    (providerId) => {
      const latest = latestByProvider.get(providerId) ?? null;
      const day = Array.from(
        dayByProvider.get(providerId)?.values() ?? [],
      ).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
      const month = Array.from(
        monthByProvider.get(providerId)?.values() ?? [],
      ).sort((a, b) => a.periodKey.localeCompare(b.periodKey));

      const labelSource =
        latest ?? day[day.length - 1] ?? month[month.length - 1] ?? null;
      const providerLabel = labelSource
        ? labelSource.providerLabel
        : providerId.slice(0, 12);

      return {
        providerId,
        providerLabel,
        latest,
        day,
        month,
      };
    },
  );

  timelines.sort((a, b) => a.providerLabel.localeCompare(b.providerLabel));
  return timelines;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function createAbortError(): Error {
  if (typeof DOMException === "function") {
    return new DOMException("Query cancelled", "AbortError");
  }
  const error = new Error("Query cancelled");
  error.name = "AbortError";
  return error;
}

function fetchStatsSnapshots(
  seedCoords: Record<string, CachedCoord>,
  signal?: AbortSignal,
): Promise<StatsFetchData> {
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

    // Seed live results from fresh cached coordinates, so a partial relay
    // response cannot drop coordinates it does not observe.
    const coords = new Map<string, CachedCoord>(Object.entries(seedCoords));

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
        current: Record<string, RelayStatus>,
      ) => Record<string, RelayStatus>,
    ) => {
      if (!active) return;
      relayStatuses = updater(relayStatuses);
    };

    const finish = (finishReason: "eose" | "timeout") => {
      if (!active || settled) return;
      settled = true;

      const connectionMap = new Map<string, boolean>();
      Array.from(pool.listConnectionStatus().entries()).forEach(
        ([url, isConnected]) => {
          connectionMap.set(normalizeRelayUrl(url), Boolean(isConnected));
        },
      );

      updateRelayStatuses((current) => {
        const next = { ...current };
        for (const relay of RELAYS) {
          const key = normalizeRelayUrl(relay);
          const status: RelayStatus = next[key] ?? {
            url: relay,
            state: "connecting",
          };
          if (status.state === "active") {
            next[key] = { ...status, state: "done" };
            continue;
          }
          if (status.state !== "connecting") {
            continue;
          }
          if (finishReason === "timeout") {
            next[key] = { ...status, state: "timeout" };
            continue;
          }
          const connected = connectionMap.get(key) ?? false;
          next[key] = {
            ...status,
            state: connected ? "no-data" : "error",
          };
        }
        return next;
      });

      cleanup();

      resolve({
        relayStatuses,
        coords: Object.fromEntries(coords),
      });
    };

    function handleAbort() {
      if (settled) return;
      settled = true;
      cleanup();
      reject(createAbortError());
    }

    signal?.addEventListener("abort", handleAbort, { once: true });

    sub = pool.subscribeMany(
      RELAYS,
      { kinds: [ANALYTICS_KIND], limit: 20000 },
      {
        receivedEvent(relay) {
          updateRelayStatuses((current) => {
            const key = normalizeRelayUrl(relay.url);
            const existing: RelayStatus = current[key] ?? {
              url: relay.url,
              state: "connecting",
            };
            return {
              ...current,
              [key]: {
                ...existing,
                url: relay.url,
                state: "active",
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

          const dTags = event.tags.filter((tag) => tag[0] === "d");
          const dTag = dTags[0]?.[1] ?? "";
          if (dTags.length !== 1 || !dTag) return;

          // Identity is the signing pubkey. The payload's provider_id is a
          // self-reported string and is only ever used as a display label.
          const claimedProviderId = asString(parsed.provider_id);

          const payload: AnalyticsPayload = { schema };
          if (claimedProviderId) payload.provider_id = claimedProviderId;
          if (Array.isArray(parsed.endpoint_urls)) {
            payload.endpoint_urls = parsed.endpoint_urls.filter(
              (value): value is string => typeof value === "string",
            );
          }
          if (isRecord(parsed.windows)) payload.windows = parsed.windows;
          if (isRecord(parsed.summary)) payload.summary = parsed.summary;
          if (isRecord(parsed.model_usage_mix)) {
            payload.model_usage_mix = parsed.model_usage_mix;
          }
          if (Array.isArray(parsed.top_model_usage)) {
            payload.top_model_usage = parsed.top_model_usage;
          }
          const periodType = asString(parsed.period_type);
          if (periodType) payload.period_type = periodType;
          const periodKey = asString(parsed.period_key);
          if (periodKey) payload.period_key = periodKey;
          if (typeof parsed.interval_minutes === "number") {
            payload.interval_minutes = parsed.interval_minutes;
          }
          if (typeof parsed.window_hours === "number") {
            payload.window_hours = parsed.window_hours;
          }

          const period = parsePeriodFromEvent(payload, dTag);
          if (!period) return;

          const snapshot: PeriodSnapshot = {
            eventId: event.id,
            providerId: event.pubkey,
            providerLabel: resolveProviderLabel(
              payload,
              claimedProviderId || event.pubkey.slice(0, 12),
            ),
            eventCreatedAt: event.created_at,
            periodType: period.periodType,
            periodKey: period.periodKey,
            payload,
          };

          const key = getCoordKey(event.pubkey, dTag);
          const candidate: CachedCoord = {
            d: dTag,
            lastObservedAtMs: Date.now(),
            snapshot,
          };
          coords.set(key, mergeCachedCoord(coords.get(key), candidate));
        },
        onclose(reasons) {
          updateRelayStatuses((current) => {
            const next = { ...current };
            reasons.forEach((reason, index) => {
              const relay = RELAYS[index];
              if (!relay || !reason) return;
              const key = normalizeRelayUrl(relay);
              const status: RelayStatus = next[key] ?? {
                url: relay,
                state: "connecting",
              };
              const lower = reason.toLowerCase();
              if (lower.includes("timeout") || lower.includes("timed out")) {
                next[key] = { ...status, state: "timeout" };
                return;
              }
              if (
                lower.includes("auth-required") ||
                lower.includes("failed") ||
                lower.includes("error") ||
                lower.includes("disconnect") ||
                lower.includes("refused")
              ) {
                next[key] = { ...status, state: "error" };
                return;
              }
              if (lower.includes("closed by caller")) {
                next[key] = {
                  ...status,
                  state: status.state === "active" ? "done" : "no-data",
                };
                return;
              }
            });
            return next;
          });
        },
        oneose() {
          if (eoseTimer) clearTimeout(eoseTimer);
          eoseTimer = setTimeout(() => finish("eose"), 500);
        },
      },
    );

    hardTimeout = setTimeout(() => finish("timeout"), 9000);
  });
}

async function fetchStatsSnapshotsWithFallback(
  signal?: AbortSignal,
): Promise<StatsQueryData> {
  const cachedCoords = readStatsCache();

  try {
    const liveData = await fetchStatsSnapshots(cachedCoords, signal);
    const mergedCoords = await updateStatsCache(liveData.coords);
    const timelines = buildTimelinesFromCoords(Object.values(mergedCoords));
    return {
      relayStatuses: liveData.relayStatuses,
      timelines,
      emptyMessage:
        timelines.length === 0 ? "No analytics snapshots found yet." : null,
    };
  } catch (error) {
    if (isAbortError(error)) throw error;

    const fallbackCoords = retainFreshCachedCoords(
      mergeCachedCoords(cachedCoords, readStatsCache()),
    );
    const timelines = buildTimelinesFromCoords(Object.values(fallbackCoords));
    if (timelines.length > 0) {
      return {
        timelines,
        relayStatuses: createInitialRelayStatuses(),
        emptyMessage: null,
      };
    }

    throw error;
  }
}

function StatsPageContent() {
  const [selectedWindow, setSelectedWindow] = useState<WindowKey>("30d");
  const [selectedMode, setSelectedMode] = useState<ChartMode>("requests");
  const [selectedProviderId, setSelectedProviderId] =
    useState<string>(ALL_PROVIDERS_ID);
  const selectedWindowLabel =
    WINDOW_OPTIONS.find((option) => option.id === selectedWindow)?.label ??
    selectedWindow;
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [relayDetailOpen, setRelayDetailOpen] = useState(false);
  const queryClient = useQueryClient();
  const emptyTimelines = useMemo<ProviderTimeline[]>(() => [], []);
  const {
    data,
    error: queryError,
    isPending,
  } = useQuery({
    queryKey: STATS_QUERY_KEY,
    queryFn: ({ signal }) => fetchStatsSnapshotsWithFallback(signal),
    placeholderData: (previousData) => previousData,
    gcTime: STATS_CACHE_TTL_MS,
    refetchInterval: (query) =>
      (query.state.data?.timelines?.length ?? 0) > 0
        ? STATS_REFETCH_MS
        : STATS_EMPTY_RETRY_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
  const timelines = data?.timelines ?? emptyTimelines;
  const relaySummary = useMemo(() => {
    const list = Object.values(data?.relayStatuses ?? {});
    if (list.length === 0) return null;
    const relays = list.map((relay) => ({
      url: relay.url,
      host: relay.url.replace(/^wss:\/\//, "").replace(/\/$/, ""),
      ...RELAY_STATE_META[relay.state],
    }));
    return {
      answered: relays.filter((relay) => relay.answered).length,
      total: relays.length,
      relays,
    };
  }, [data?.relayStatuses]);
  const loading = isPending && !data;
  const hasUsableTimelines = timelines.length > 0;
  const error = !hasUsableTimelines
    ? (data?.emptyMessage ??
      (loading
        ? null
        : queryError instanceof Error
          ? queryError.message
          : queryError
            ? "Unable to load analytics snapshots."
            : null))
    : null;

  useEffect(() => {
    const timelines = buildTimelinesFromCoords(
      Object.values(readStatsCache()),
    );
    if (timelines.length === 0) return;

    queryClient.setQueryData<StatsQueryData>(STATS_QUERY_KEY, (current) =>
      current
        ? current
        : {
            timelines,
            relayStatuses: createInitialRelayStatuses(),
            emptyMessage: null,
          },
    );
  }, [queryClient]);

  useEffect(() => {
    if (timelines.length === 0) {
      setSelectedProviderId(ALL_PROVIDERS_ID);
      return;
    }
    if (selectedProviderId === ALL_PROVIDERS_ID) {
      return;
    }
    const exists = timelines.some(
      (timeline) => timeline.providerId === selectedProviderId,
    );
    if (!exists) {
      setSelectedProviderId(ALL_PROVIDERS_ID);
    }
  }, [selectedProviderId, timelines]);

  const providerOptions = useMemo(
    () => [
      { providerId: ALL_PROVIDERS_ID, providerLabel: "All providers" },
      ...timelines,
    ],
    [timelines],
  );

  const selectedProviderOption =
    providerOptions.find(
      (option) => option.providerId === selectedProviderId,
    ) ?? providerOptions[0];

  const selectedTimeline = useMemo(() => {
    if (selectedProviderId === ALL_PROVIDERS_ID) return null;
    return (
      timelines.find(
        (timeline) => timeline.providerId === selectedProviderId,
      ) ?? null
    );
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
        timeline.month[timeline.month.length - 1]?.eventCreatedAt ?? 0,
      );
    }
    return latest > 0 ? latest : null;
  }, [selectedProviderId, selectedTimeline, timelines]);

  const selectedWindowPayload = useMemo(() => {
    const coarsen = (payload: WindowPayload | null): WindowPayload | null =>
      payload ? coarsenWindowPayloadForDisplay(payload, selectedWindow) : null;

    if (selectedProviderId === ALL_PROVIDERS_ID) {
      const payloads = timelines.flatMap((timeline) =>
        getPayloadsForTimeline(timeline, selectedWindow),
      );
      return coarsen(mergeWindowPayloads(payloads));
    }

    if (!selectedTimeline) return null;
    return coarsen(
      mergeWindowPayloads(
        getPayloadsForTimeline(selectedTimeline, selectedWindow),
      ),
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
  const requests = summary ? getPayloadRequests(selectedWindowPayload) : null;
  const tokens = summary ? getPayloadTokens(selectedWindowPayload) : null;
  const revenueSats = summary
    ? getPayloadRevenueSats(selectedWindowPayload)
    : null;
  const modelShare = useMemo<ModelSharePoint[]>(
    () => buildModelShare(selectedWindowPayload?.metrics ?? [], selectedMode),
    [selectedMode, selectedWindowPayload],
  );
  const providerComparison = useMemo<ProviderComparisonPoint[]>(() => {
    const rows = timelines
      .map((timeline) => {
        const mergedPayload = mergeWindowPayloads(
          getPayloadsForTimeline(timeline, selectedWindow),
        );
        const payload = mergedPayload
          ? coarsenWindowPayloadForDisplay(mergedPayload, selectedWindow)
          : null;
        if (!payload) return null;

        const requestsValue = getPayloadRequests(payload);
        const tokensValue = getPayloadTokens(payload);
        const revenueSatsValue = getPayloadRevenueSats(payload);
        const value =
          selectedMode === "requests"
            ? requestsValue
            : selectedMode === "tokens"
              ? tokensValue
              : revenueSatsValue;
        if (value <= 0) return null;

        return {
          providerId: timeline.providerId,
          providerLabel: timeline.providerLabel,
          value,
          share: 0,
          activeModels: countActiveModels(payload.metrics, selectedMode),
          requests: requestsValue,
          revenueSats: revenueSatsValue,
          tokens: tokensValue,
        } satisfies ProviderComparisonPoint;
      })
      .filter((row): row is ProviderComparisonPoint => row !== null)
      .sort((a, b) => b.value - a.value);

    const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
    if (totalValue <= 0) return rows;
    return rows.map((row) => ({
      ...row,
      share: row.value / totalValue,
    }));
  }, [selectedMode, selectedWindow, timelines]);
  const showProviderComparison =
    selectedProviderId === ALL_PROVIDERS_ID && providerComparison.length > 0;
  const activeModelCount = selectedWindowPayload?.metrics.length
    ? countActiveModels(selectedWindowPayload.metrics, selectedMode)
    : 0;
  const avgTokensPerRequest =
    requests !== null && tokens !== null && requests > 0
      ? tokens / requests
      : null;
  const avgRevenuePerRequest =
    requests !== null && revenueSats !== null && requests > 0
      ? revenueSats / requests
      : null;
  const leadingShare =
    selectedProviderId === ALL_PROVIDERS_ID
      ? (providerComparison[0]?.share ?? null)
      : (modelShare[0]?.share ?? null);
  const leadingShareLabel =
    selectedProviderId === ALL_PROVIDERS_ID
      ? "Top provider share"
      : "Top model share";
  const updatedStatusText = latestSnapshotUnixSeconds
    ? `Updated ${formatUpdatedAt(latestSnapshotUnixSeconds)} UTC`
    : loading
      ? "Loading snapshots..."
      : "No snapshots yet";

  return (
    <SiteShell>
      <section className="w-full relative">
        <PageContainer className="py-12 md:py-20">
          <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="text-left">
              <h1 className="mb-4 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                Network Stats
              </h1>
              <p className="max-w-2xl text-base font-light leading-relaxed text-muted-foreground md:text-lg">
                Shared usage analytics published by Routstr nodes.
              </p>
            </div>
            <p className="self-start text-xs text-muted-foreground md:self-end">
              {updatedStatusText}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                  Providers
                </p>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Which providers are counted?"
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
                      Providers represented in the reports received. This does
                      not indicate current availability, and sharing is
                      optional.
                    </p>
                  </div>
                </div>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {formatCompactCount(timelines.length)}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                {selectedWindowLabel} Requests
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-20" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {requests === null ? "—" : formatCompactCount(requests)}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                {selectedWindowLabel} Tokens
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-20" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {tokens === null ? "—" : formatCompactCount(tokens)}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                {selectedWindowLabel} Revenue (sats)
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-24" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {revenueSats === null ? "—" : formatCompactCount(revenueSats)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                Active models
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {formatCompactCount(activeModelCount)}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                Avg tokens / request
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-20" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {avgTokensPerRequest === null
                    ? "—"
                    : formatCompactNumber(avgTokensPerRequest, {
                        standardMaximumFractionDigits: 0,
                        compactMaximumFractionDigits: 1,
                      })}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                Avg sats / request
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {avgRevenuePerRequest === null
                    ? "—"
                    : formatCompactNumber(avgRevenuePerRequest, {
                        standardMaximumFractionDigits: 1,
                        compactMaximumFractionDigits: 1,
                      })}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                {leadingShareLabel}
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {leadingShare === null
                    ? "—"
                    : `${(leadingShare * 100).toFixed(1)}%`}
                </p>
              )}
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="relative w-full flex-grow">
        <PageContainer className="py-14">
          <div className="mb-10 flex flex-col gap-8">
            <div className="grid gap-6 md:grid-cols-[1fr_1fr_1fr_auto] md:items-start">
              <div className="min-w-0">
                <p className="mb-3 text-[10px] tracking-[0.04em] text-muted-foreground">
                  Provider
                </p>
                <Popover
                  open={providerDropdownOpen}
                  onOpenChange={setProviderDropdownOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="stats-provider-select"
                      variant="outline"
                      role="combobox"
                      aria-expanded={providerDropdownOpen}
                      className="h-10 w-full justify-between border-border bg-card px-3 text-left text-sm font-normal text-foreground hover:bg-muted hover:text-foreground"
                    >
                      <span className="min-w-0 truncate">
                        {selectedProviderOption.providerLabel}
                      </span>
                      {selectedProviderOption.providerId !== ALL_PROVIDERS_ID &&
                      selectedProviderOption.providerLabel !==
                        selectedProviderOption.providerId.slice(0, 12) ? (
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                          {selectedProviderOption.providerId.slice(0, 12)}
                        </span>
                      ) : null}
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
                      <CommandList className="scrollbar-subtle max-h-64">
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
                              <span className="min-w-0 flex-1 truncate">
                                {option.providerLabel}
                              </span>
                              {option.providerId !== ALL_PROVIDERS_ID &&
                              option.providerLabel !==
                                option.providerId.slice(0, 12) ? (
                                <span className="ml-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                                  {option.providerId.slice(0, 12)}
                                </span>
                              ) : null}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedProviderId === option.providerId
                                    ? "opacity-100 text-foreground"
                                    : "opacity-0",
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
                  Period
                </p>
                <Tabs
                  value={selectedWindow}
                  onValueChange={(value) =>
                    setSelectedWindow(value as WindowKey)
                  }
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
                    {CHART_MODES.map((option) => (
                      <TabsTrigger key={option.id} value={option.id}>
                        {option.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {relaySummary ? (
                <div className="min-w-0 md:text-right">
                  <p className="mb-3 text-[10px] tracking-[0.04em] text-muted-foreground">
                    Relays
                  </p>
                  <Popover
                    open={relayDetailOpen}
                    onOpenChange={setRelayDetailOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onPointerEnter={() => setRelayDetailOpen(true)}
                        onPointerLeave={() => setRelayDetailOpen(false)}
                        onFocus={() => setRelayDetailOpen(true)}
                        onBlur={() => setRelayDetailOpen(false)}
                        aria-label={`${relaySummary.answered} of ${relaySummary.total} relays responded`}
                        className="flex h-8 items-center gap-1.5 rounded-full px-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:ml-auto"
                      >
                        {relaySummary.relays.map((relay) => (
                          <span
                            key={relay.url}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              relay.answered ? "bg-muted-foreground" : "bg-border",
                            )}
                          />
                        ))}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      onOpenAutoFocus={(event) => event.preventDefault()}
                      onCloseAutoFocus={(event) => event.preventDefault()}
                      onPointerEnter={() => setRelayDetailOpen(true)}
                      onPointerLeave={() => setRelayDetailOpen(false)}
                      className="w-[min(88vw,18rem)] border-border bg-card p-2 shadow-xl"
                    >
                      <div className="space-y-1">
                        {relaySummary.relays.map((relay) => (
                          <div
                            key={relay.url}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-1 py-0.5 text-[10px]"
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
                                  relay.answered
                                    ? "bg-muted-foreground"
                                    : "bg-border",
                                )}
                              />
                              <span className="truncate text-muted-foreground">
                                {relay.host}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "shrink-0",
                                relay.answered
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {relay.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="space-y-6">
              <section className="border border-border bg-card px-4 py-5 shadow-sm shadow-black/5 sm:px-6 sm:py-6 dark:shadow-black/20">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground">
                    Model Usage
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reported {selectedMode} over time, split by model.
                  </p>
                </div>

                <div className="pt-2 sm:pt-3">
                  <div className="min-w-0">
                    <div className="h-[250px] w-full sm:h-[320px]">
                      <div className="flex h-full items-end gap-2">
                        {Array.from({ length: 12 }).map((_, index) => (
                          <Skeleton
                            key={`model-usage-bar-${index}`}
                            className="flex-1"
                            style={{ height: `${24 + ((index * 13) % 64)}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 min-w-0 border-t border-border pt-4">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-foreground">
                        Top Models
                      </p>
                    </div>
                    <div className="columns-1 lg:columns-2 lg:gap-10">
                      {Array.from({ length: 10 }).map((_, index) => (
                        <div
                          key={`top-model-row-${index}`}
                          className="mb-0.5 grid min-h-14 break-inside-avoid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/60 px-2 py-2.5"
                        >
                          <Skeleton className="h-3 w-5" />
                          <div className="flex h-7 w-8 items-center gap-2">
                            <Skeleton className="h-7 w-0.5 shrink-0" />
                            <Skeleton className="size-5 shrink-0" />
                          </div>
                          <div className="min-w-0 space-y-1.5">
                            <Skeleton className="h-3 w-40 max-w-full" />
                            <Skeleton className="h-2.5 w-20 max-w-full" />
                          </div>
                          <Skeleton className="ml-auto h-3 w-20" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="border border-border bg-card px-4 py-5 shadow-sm shadow-black/5 sm:px-6 sm:py-6 dark:shadow-black/20">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground">
                    Provider Share
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share of reported {selectedMode} by provider in this period.
                  </p>
                </div>
                <div className="mt-5 flex h-3 w-full overflow-hidden bg-muted">
                  {[28, 22, 18, 14, 10, 8].map((width, index) => (
                    <Skeleton
                      key={`provider-share-segment-${index}`}
                      className="h-full"
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
                <div className="grid gap-x-8 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`provider-share-row-${index}`}
                      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/60 py-2.5"
                    >
                      <Skeleton className="h-7 w-0.5" />
                      <div className="min-w-0 space-y-1.5">
                        <Skeleton className="h-3 w-32 max-w-full" />
                        <Skeleton className="h-2.5 w-20 max-w-full" />
                      </div>
                      <div className="space-y-1.5">
                        <Skeleton className="ml-auto h-3 w-16" />
                        <Skeleton className="ml-auto h-2.5 w-10" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-border py-3">
                  <Skeleton className="h-3 w-32" />
                </div>
              </section>

              <section className="border border-border bg-card px-4 py-5 shadow-sm shadow-black/5 sm:px-6 sm:py-6 dark:shadow-black/20">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground">
                    Model Share
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    How {selectedMode} concentrates across models in the
                    selected period.
                  </p>
                </div>
                <div className="grid gap-6 pt-2 sm:pt-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
                  <Skeleton className="mx-auto aspect-square h-[220px] w-[220px] rounded-full sm:h-[240px] sm:w-[240px]" />
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-foreground">
                        Share Breakdown
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Percent of selected total
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={`model-share-row-${index}`}
                          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-1.5 py-2 text-xs"
                        >
                          <div className="flex h-7 w-8 items-center gap-2">
                            <Skeleton className="h-7 w-0.5 shrink-0" />
                            <Skeleton className="size-5 shrink-0" />
                          </div>
                          <div className="space-y-1">
                            <Skeleton className="h-3 w-44 max-w-full" />
                            <Skeleton className="h-3 w-28 max-w-full" />
                          </div>
                          <Skeleton className="h-3 w-12" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : error ? (
            <div className="py-24 text-center text-sm text-muted-foreground">
              {error}
            </div>
          ) : !modelUsageMix || modelUsageMix.metrics.length === 0 ? (
            <div className="py-24 text-center text-sm text-muted-foreground">
              Provider snapshots were found, but no usage was recorded in this
              window.
            </div>
          ) : (
            <div className="space-y-6">
              <TopModelsUsageChart
                mix={modelUsageMix}
                displayUnit="sat"
                usdPerSat={null}
                mode={selectedMode}
              />

              {showProviderComparison ? (
                <ProviderComparisonChart
                  data={providerComparison}
                  mode={selectedMode}
                  description={`Share of reported ${selectedMode} by provider in this period.`}
                />
              ) : null}
              <ModelShareChart
                data={modelShare}
                mode={selectedMode}
                description={`How ${selectedMode} concentrates across models in the selected period.`}
              />
            </div>
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
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StatsPageContent />
    </QueryClientProvider>
  );
}
