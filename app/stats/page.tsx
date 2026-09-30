"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, CircleHelp } from "lucide-react";
import { verifyEvent, type Event } from "nostr-tools";
import { AbstractSimplePool } from "nostr-tools/abstract-pool";
import {
  ANALYTICS_KIND, DAY_MS, WINDOW_OPTIONS, buildProviders, completedRange,
  dayKey, parseStatsEvent, reportWins, selectStats,
  type StatsGrouping, type StatsProvider, type StatsReport, type WindowKey,
} from "@/lib/stats-reports";
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
  readBucketTotal,
  type ModelUsageMix,
  type ModelUsageMixMetric,
} from "@/components/stats/top-models-usage-chart";
import { Button } from "@/components/ui/button";
import { getDefaultRelays } from "@/lib/nostr";
import { formatCompactCount, formatCompactNumber } from "@/lib/number-format";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type RelayState = "connecting" | "active" | "done" | "no-data" | "timeout" | "error";
type ProviderTimeline = StatsProvider;
type WindowPayload = { metrics: ModelUsageMixMetric[] };
type RelayStatus = { url: string; state: RelayState };
type StatsQueryData = {
  timelines: ProviderTimeline[];
  relayStatuses: Record<string, RelayStatus>;
  emptyMessage: string | null;
  historyIncomplete: boolean;
  refreshedAt: number | null;
};
type CachedCoord = { lastObservedAtMs: number; report: StatsReport };
type StatsFetchData = { relayStatuses: Record<string, RelayStatus>; coords: Record<string, CachedCoord>; historyIncomplete: boolean };

// relay.ditto.pub accepts 4 MB events, so it holds provider reports that the
// 128 KiB relays reject outright. Stats only, other features do not need it.
const configuredRelays = process.env.NEXT_PUBLIC_STATS_RELAYS?.split(",").map((url) => url.trim()).filter((url) => {
  try { return ["ws:", "wss:"].includes(new URL(url).protocol); } catch { return false; }
});
const RELAYS = Array.from(
  new Set(configuredRelays?.length ? configuredRelays : [
    ...getDefaultRelays(),
    "wss://relay.routstr.com",
    "wss://nos.lol",
    "wss://relay.ditto.pub",
  ]),
);

const ALL_PROVIDERS_ID = "__all_providers__";
const STATS_CACHE_KEY = "stats_snapshots_cache_v3";
const LEGACY_STATS_CACHE_KEY = "stats_snapshots_cache_v2";
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
  done: { label: "received", answered: true },
  "no-data": { label: "no reports", answered: false },
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

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getMetricModelValues(
  metric: ModelUsageMixMetric,
  mode: ChartMode,
): Record<string, number> {
  if (mode === "requests") return metric.model_counts ?? {};
  if (mode === "tokens") return metric.model_tokens ?? {};
  const raw = metric.model_revenue_msats ?? {};
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, asNumber(value) / 1000]));
}

function getPayloadRequests(payload: WindowPayload | null): number {
  if (!payload) return 0;
  return payload.metrics.reduce(
    (sum, metric) => sum + readBucketTotal(metric, "requests"),
    0,
  );
}

function getPayloadTokens(payload: WindowPayload | null): number {
  if (!payload) return 0;
  return payload.metrics.reduce(
    (sum, metric) => sum + readBucketTotal(metric, "tokens"),
    0,
  );
}

function getPayloadRevenueSats(payload: WindowPayload | null): number {
  if (!payload) return 0;
  return (
    payload.metrics.reduce(
      (sum, metric) => sum + readBucketTotal(metric, "revenue"),
      0,
    ) / 1000
  );
}

function countActiveModels(
  metrics: ModelUsageMixMetric[],
): number {
  const models = new Set<string>();
  for (const metric of metrics) {
    for (const [model, value] of Object.entries(
      metric.model_counts,
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
    let namedTotal = 0;
    for (const [model, value] of Object.entries(
      getMetricModelValues(metric, mode),
    )) {
      if (!model || model === "unknown") continue;
      const parsed = asNumber(value);
      if (!Number.isFinite(parsed) || parsed <= 0) continue;
      totals.set(model, (totals.get(model) ?? 0) + parsed);
      namedTotal += parsed;
    }
    const bucketTotal =
      readBucketTotal(metric, mode) / (mode === "revenue" ? 1000 : 1);
    othersTotal += Math.max(0, bucketTotal - namedTotal);
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

function mergeCachedCoords(
  current: Record<string, CachedCoord>, incoming: Record<string, CachedCoord>,
): Record<string, CachedCoord> {
  const merged = { ...current };
  for (const [key, candidate] of Object.entries(incoming)) {
    const existing = merged[key];
    merged[key] = !existing ? candidate : {
      report: reportWins(candidate.report, existing.report) ? candidate.report : existing.report,
      lastObservedAtMs: Math.max(candidate.lastObservedAtMs, existing.lastObservedAtMs),
    };
  }
  return merged;
}

function retainFreshCachedCoords(coords: Record<string, CachedCoord>, now = Date.now()) {
  return Object.fromEntries(Object.entries(coords).filter(([, coord]) => coord.lastObservedAtMs >= now - STATS_CACHE_TTL_MS));
}

async function readStatsCache(): Promise<Record<string, CachedCoord>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(STATS_CACHE_KEY) ?? "null");
    if (!isRecord(raw) || !isRecord(raw.coords)) return {};
    const coords: Record<string, CachedCoord> = {};
    await Promise.all(Object.entries(raw.coords).map(async ([key, value]) => {
      if (!isRecord(value) || typeof value.lastObservedAtMs !== "number" ||
          value.lastObservedAtMs < Date.now() - STATS_CACHE_TTL_MS || value.lastObservedAtMs > Date.now()) return;
      const report = await parseStatsEvent(value.event);
      if (report?.coordinate === key) coords[key] = { report, lastObservedAtMs: value.lastObservedAtMs };
    }));
    return coords;
  } catch { return {}; }
}

async function updateStatsCache(coords: Record<string, CachedCoord>): Promise<Record<string, CachedCoord>> {
  if (typeof window === "undefined") return coords;
  const persist = async () => {
    const merged = retainFreshCachedCoords(mergeCachedCoords(await readStatsCache(), coords));
    try {
      window.localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ coords: Object.fromEntries(
        Object.entries(merged).map(([key, value]) => [key, { lastObservedAtMs: value.lastObservedAtMs, event: value.report.event }]),
      ) }));
      window.localStorage.removeItem(LEGACY_STATS_CACHE_KEY);
    } catch { /* Relay data remains usable when browser storage is full. */ }
    return merged;
  };
  try { return await window.navigator.locks.request(STATS_CACHE_KEY, persist); }
  catch { return persist(); }
}

function buildTimelinesFromCoords(coords: CachedCoord[]): ProviderTimeline[] {
  return buildProviders(coords.map((coord) => coord.report));
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

function createStatsPool() {
  const sockets = new Set<WebSocket>();
  const pool = new AbstractSimplePool({
    verifyEvent,
    maxWaitForConnection: 3000,
    websocketImplementation: class extends WebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        sockets.add(this);
        this.addEventListener("close", () => sockets.delete(this), { once: true });
      }
    },
  });
  return {
    subscribeMany: pool.subscribeMany.bind(pool),
    close(relays: string[]) {
      pool.close(relays);
      // The SDK drops timed-out connections before closing their pending sockets.
      for (const socket of Array.from(sockets)) {
        if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) socket.close();
      }
    },
  };
}

async function fetchStatsSnapshots(
  seedCoords: Record<string, CachedCoord>,
  signal?: AbortSignal,
  onProgress?: (data: StatsFetchData) => void,
): Promise<StatsFetchData> {
  if (signal?.aborted) throw createAbortError();
  const pool = createStatsPool();
  const coords = { ...seedCoords };
  const relayStatuses = createInitialRelayStatuses();
  const seen = new Set<string>();
  let historyIncomplete = false;
  const now = Math.floor(Date.now() / 1000);
  const oldest = Math.floor(completedRange("365d").start / 1000) - 7 * DAY_MS / 1000;
  type Page = { count: number; fresh: number; oldest: number; failure?: "error" | "timeout" };
  const fetchPage = (url: string, until: number, known: Set<string>) => new Promise<Page>((resolve, reject) => {
    const key = normalizeRelayUrl(url);
    const page: Page = { count: 0, fresh: 0, oldest: until };
    const parsing: Promise<void>[] = [];
    let finished = false;
    const finish = async (failure?: Page["failure"]) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(cap);
      signal?.removeEventListener("abort", abort);
      subscription.close();
      await Promise.all(parsing);
      if (signal?.aborted) reject(createAbortError());
      else resolve({ ...page, failure });
    };
    const abort = () => { void finish(); };
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = () => { void finish("timeout"); };
    // 7s of silence ends a page; a relay still sending gets up to 30s.
    let timer = setTimeout(timeout, 7000);
    const cap = setTimeout(timeout, 30_000);
    const subscription = pool.subscribeMany([url], { kinds: [ANALYTICS_KIND], since: oldest, until, limit: 1000 }, {
      // Our deadline must run before the SDK synthesizes EOSE on its own timeout.
      maxWait: 31_000,
      receivedEvent(_relay, id) {
        if (finished) return;
        clearTimeout(timer);
        timer = setTimeout(timeout, 7000);
        page.count++;
        if (!known.has(id)) page.fresh++;
        known.add(id);
        relayStatuses[key] = { url, state: "active" };
      },
      onevent(event: Event) {
        if (finished) return;
        page.oldest = Math.min(page.oldest, event.created_at);
        if (seen.has(event.id)) return;
        seen.add(event.id);
        parsing.push(parseStatsEvent(event).then((report) => {
          if (!report) return;
          const candidate = { report, lastObservedAtMs: Date.now() };
          const current = coords[report.coordinate];
          coords[report.coordinate] = current && !reportWins(report, current.report)
            ? { ...current, lastObservedAtMs: candidate.lastObservedAtMs } : candidate;
        }));
      },
      oneose() {
        // A pool emits EOSE immediately before onclose when a relay fails.
        void Promise.resolve().then(() => finish());
      },
      onclose(reasons) {
        const reason = reasons[0];
        if (reason && !reason.includes("closed by caller")) void finish(/timeout|timed out/i.test(reason) ? "timeout" : "error");
      },
    });
  });
  // A relay may return fewer reports than the limit asks for, so a short page
  // proves nothing. Walk back from the oldest report seen, keeping its second.
  const walkRelay = async (url: string) => {
    const key = normalizeRelayUrl(url);
    const known = new Set<string>();
    let until = now;
    let largest = 0;
    let steppedPastTies = false;
    for (let pages = 0; until >= oldest; pages++) {
      const page = pages < 50 ? await fetchPage(url, until, known) : null;
      if (!page || page.failure) {
        historyIncomplete = true;
        if (page?.failure) relayStatuses[key] = { url, state: page.failure };
        break;
      }
      // Older reports after a page that only repeated one second mean that page
      // was cut short, so more reports from that second may exist.
      if (steppedPastTies && page.count > 0) historyIncomplete = true;
      onProgress?.({ coords: { ...coords }, relayStatuses: { ...relayStatuses }, historyIncomplete });
      if (page.count === 0) break;
      steppedPastTies = page.fresh === 0;
      if (page.fresh > 0) {
        largest = Math.max(largest, page.count);
        until = page.oldest;
        continue;
      }
      // Nothing older may exist to reveal the cut, so a repeat as large as any
      // earlier page is already suspect.
      if (page.count > 1 && page.count >= largest) historyIncomplete = true;
      until -= 1;
    }
    const state = relayStatuses[key].state;
    if (state === "active" || state === "connecting") relayStatuses[key] = { url, state: state === "active" ? "done" : "no-data" };
  };
  try {
    await Promise.all(Object.values(relayStatuses).map((relay) => walkRelay(relay.url)));
    return { coords, relayStatuses, historyIncomplete };
  } finally { pool.close(RELAYS); }
}

function queryDataFromFetch(data: StatsFetchData, refreshedAt: number | null): StatsQueryData {
  const timelines = buildTimelinesFromCoords(Object.values(data.coords));
  const delivered = Object.values(data.relayStatuses).some((relay) => relay.state === "active" || relay.state === "done");
  return { timelines, relayStatuses: data.relayStatuses, historyIncomplete: data.historyIncomplete, refreshedAt,
    emptyMessage: timelines.length ? null : delivered ? "No supported analytics reports found yet." : "No relay returned analytics stats. Retrying shortly." };
}

async function fetchStatsSnapshotsWithFallback(
  signal?: AbortSignal,
  onProgress?: (data: StatsQueryData) => void,
): Promise<StatsQueryData> {
  const cachedCoords = await readStatsCache();
  if (Object.keys(cachedCoords).length) onProgress?.(queryDataFromFetch({ coords: cachedCoords, relayStatuses: createInitialRelayStatuses(), historyIncomplete: false }, null));
  try {
    const live = await fetchStatsSnapshots(cachedCoords, signal, (data) => {
      if (Object.keys(data.coords).length) onProgress?.(queryDataFromFetch(data, null));
    });
    return queryDataFromFetch({ ...live, coords: await updateStatsCache(live.coords) }, Date.now());
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (Object.keys(cachedCoords).length) return queryDataFromFetch({ coords: cachedCoords, relayStatuses: createInitialRelayStatuses(), historyIncomplete: true }, null);
    throw error;
  }
}

function StatsPageContent() {
  const [selectedWindow, setSelectedWindow] = useState<WindowKey>("30d");
  const [grouping, setGrouping] = useState<StatsGrouping>("daily");
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
    // A refresh keeps the last checked result on screen, not unchecked progress.
    queryFn: ({ signal }) => fetchStatsSnapshotsWithFallback(signal, queryClient.getQueryData(STATS_QUERY_KEY)
      ? undefined : (progress) => { queryClient.setQueryData(STATS_QUERY_KEY, progress); }),
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
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(dayKey(Date.now()));
    const timer = window.setInterval(() => setToday(dayKey(Date.now())), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const range = useMemo(() => completedRange(selectedWindow, today ? Date.parse(`${today}T00:00:00Z`) : 0), [selectedWindow, today]);
  const selection = useMemo(() => selectStats(
    selectedProviderId === ALL_PROVIDERS_ID ? timelines : selectedTimeline ? [selectedTimeline] : [], range, grouping,
  ), [range, grouping, selectedProviderId, selectedTimeline, timelines]);
  const selectedWindowPayload: WindowPayload | null = selection.hasData ? { metrics: selection.metrics } : null;
  const modelUsageMix: ModelUsageMix | null = selection.hasData ? {
    top_models: [], metrics: selection.metrics, interval_minutes: grouping === "weekly" ? 10080 : 1440,
    hours_back: range.days * 24, total_buckets: selection.metrics.length,
  } : null;

  const inputEstimated = selection.metrics.reduce((sum, day) => sum + day.inputEstimated, 0);
  const outputEstimated = selection.metrics.reduce((sum, day) => sum + day.outputEstimated, 0);
  const inputMissing = selection.metrics.reduce((sum, day) => sum + day.inputMissing, 0);
  const outputMissing = selection.metrics.reduce((sum, day) => sum + day.outputMissing, 0);
  const measuredRequests = selection.metrics.reduce((sum, day) => sum + day.measuredRequests, 0);
  const measuredTokens = selection.metrics.reduce((sum, day) => sum + day.measuredTokens, 0);
  const hasLegacy = selection.metrics.some((day) => day.legacy);
  const requests = selectedWindowPayload ? getPayloadRequests(selectedWindowPayload) : null;
  const tokens = selectedWindowPayload && !(requests && inputMissing + outputMissing === requests * 2 && !hasLegacy)
    ? getPayloadTokens(selectedWindowPayload) : null;
  const revenueSats = selectedWindowPayload
    ? getPayloadRevenueSats(selectedWindowPayload)
    : null;
  const modelShare = useMemo<ModelSharePoint[]>(
    () => buildModelShare(selection.metrics, selectedMode),
    [selectedMode, selection.metrics],
  );
  const providerComparison = useMemo<ProviderComparisonPoint[]>(() => {
    const rows = timelines
      .map((timeline) => {
        const providerSelection = selectStats([timeline], range, grouping);
        const payload: WindowPayload | null = providerSelection.hasData ? { metrics: providerSelection.metrics } : null;
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
          activeModels: countActiveModels(payload.metrics),
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
  }, [selectedMode, range, grouping, timelines]);
  const showProviderComparison =
    selectedProviderId === ALL_PROVIDERS_ID && providerComparison.length > 0;
  const activeModelCount = selectedWindowPayload?.metrics.length
    ? countActiveModels(selectedWindowPayload.metrics)
    : 0;
  // Older reports cannot identify their measured requests, so until a measured
  // sample exists the card divides their reported totals and says so.
  const avgTokensApproximate = measuredRequests === 0 && hasLegacy && !!requests && !!tokens;
  const avgTokensPerRequest =
    measuredRequests > 0
      ? measuredTokens / measuredRequests
      : avgTokensApproximate
        ? (tokens ?? 0) / (requests ?? 1)
        : null;
  const avgTokensEmptyLabel = requests === null ? "No data" : requests === 0 ? "No requests" : "Not reported";
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
  const rangeLabel = `${dayKey(range.start)} to ${dayKey(range.end - DAY_MS)} UTC`;
  const hasPartialCoverage = selection.reportedProviderDays < selection.expectedProviderDays || selection.completeProviderDays < selection.reportedProviderDays;
  const hasPartialData = hasPartialCoverage || data?.historyIncomplete || hasLegacy || inputMissing + outputMissing > 0;


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
                      Providers with data in this selected period. This does
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
                  {formatCompactCount(selection.reportingProviders)}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                {selectedWindowLabel} Completed requests
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-20" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {requests === null ? "Unavailable" : formatCompactCount(requests)}
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
                  {tokens === null ? "Unavailable" : formatCompactCount(tokens)}
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
                  {revenueSats === null ? "Unavailable" : formatCompactNumber(revenueSats, { standardMaximumFractionDigits: 3 })}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                Named models
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {selection.hasData ? formatCompactCount(activeModelCount) : "Unavailable"}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                  Avg tokens / request
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label="How is the token average calculated?" className="text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] space-y-2 text-xs text-muted-foreground">
                    {avgTokensApproximate ? (
                      <p>Approximate: reported tokens divided by completed requests. Older reports can include estimated or missing token counts, and do not say which requests were measured.</p>
                    ) : (
                      <>
                        <p>Provider-reported token usage only. Estimates and missing counts are excluded.</p>
                        <p>{requests === null ? "No reports received for this period." : `Based on ${measuredRequests.toLocaleString("en-US")} of ${requests.toLocaleString("en-US")} completed requests.`}</p>
                      </>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-20" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {avgTokensPerRequest === null
                    ? avgTokensEmptyLabel
                    : `${avgTokensApproximate ? "~" : ""}${formatCompactNumber(avgTokensPerRequest, {
                        standardMaximumFractionDigits: 0,
                        compactMaximumFractionDigits: 1,
                      })}`}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] tracking-[0.04em] text-muted-foreground">
                Avg sats / completion
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className="mt-1 text-2xl text-foreground sm:text-3xl">
                  {avgRevenuePerRequest === null
                    ? "Unavailable"
                    : avgRevenuePerRequest > 0 && avgRevenuePerRequest < 0.001
                      ? "<0.001"
                    : formatCompactNumber(avgRevenuePerRequest, {
                        standardMaximumFractionDigits: 3,
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
                    ? "Unavailable"
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
                        (selectedProviderOption.providerId.split(":")[1] ?? selectedProviderOption.providerId).slice(0, 12) ? (
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                          {(selectedProviderOption.providerId.split(":")[1] ?? selectedProviderOption.providerId).slice(0, 12)}
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
                                (option.providerId.split(":")[1] ?? option.providerId).slice(0, 12) ? (
                                <span className="ml-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                                  {(option.providerId.split(":")[1] ?? option.providerId).slice(0, 12)}
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
                  onValueChange={(value) => {
                    setSelectedWindow(value as WindowKey);
                    setGrouping(value === "365d" ? "weekly" : "daily");
                  }}
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

          <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <p>{today ? rangeLabel : "Loading period..."}</p>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="inline-flex items-center gap-1 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                  {selection.hasData && hasPartialData ? "Partial data" : "Data details"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] space-y-3 text-xs text-muted-foreground">
                <p>Periods include completed UTC days. Today is excluded.</p>
                <p>Weekly bars run Thursday to Wednesday to preserve older reports. Only the selected dates are counted. Weekly view can include older totals with no daily breakdown, so its totals may be higher than Daily. Missing records are never filled with zeros or estimates.</p>
                {data ? <p>{data.refreshedAt ? `Checked ${formatUpdatedAt(data.refreshedAt / 1000)} UTC.` : "Showing saved reports that relays have not confirmed yet."}</p> : null}
                {selection.hasData && hasPartialCoverage ? <p>Some providers have no report for parts of this period. Totals and shares use the reports received.</p> : null}
                {data?.historyIncomplete ? <p>Some reports could not be retrieved.</p> : null}
                {hasLegacy ? <p>Older reports contribute to totals and charts. They do not identify the fully measured requests needed for the token average.</p> : null}
                {inputEstimated + outputEstimated > 0 ? <p>Token totals include estimates.{avgTokensApproximate ? "" : " The average excludes estimated usage."}</p> : null}
                {inputMissing + outputMissing > 0 ? <p>Some requests have incomplete token counts: {inputMissing} missing input counts and {outputMissing} missing output counts. Known counts remain in totals{avgTokensApproximate ? "." : "; these requests are excluded from the average."}</p> : null}
              </PopoverContent>
            </Popover>
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
            <div className="space-y-4 py-24 text-center text-sm text-muted-foreground">
              <p>No usable {grouping === "weekly" ? "weekly" : "daily"} records were received for this period. Missing reports do not mean zero activity.</p>
              {selectedWindow !== "1d" ? (
                <Button variant="outline" onClick={() => setGrouping(grouping === "daily" ? "weekly" : "daily")}>
                  {grouping === "daily" ? "Show weekly totals" : "Show daily totals"}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              <TopModelsUsageChart
                mix={modelUsageMix}
                displayUnit="sat"
                usdPerSat={null}
                mode={selectedMode}
                grouping={grouping}
                onGroupingChange={selectedWindow === "1d" ? undefined : setGrouping}
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
