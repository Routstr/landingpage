import { verifyEvent, type Event } from "nostr-tools";
import type { ModelUsageMixMetric } from "../components/stats/top-models-usage-chart";

export const DAY_MS = 86_400_000;
export const ANALYTICS_KIND = 38422;
export const WINDOW_OPTIONS = [
  { id: "1d", label: "Yesterday", days: 1 },
  { id: "7d", label: "7d", days: 7 },
  { id: "30d", label: "30d", days: 30 },
  { id: "90d", label: "90d", days: 90 },
  { id: "365d", label: "365d", days: 365 },
] as const;
export type WindowKey = (typeof WINDOW_OPTIONS)[number]["id"];
export type CompletedRange = { start: number; end: number; days: number };
export type StatsGrouping = "daily" | "weekly";

export const V2_COLUMNS = [
  "completed_requests", "input_tokens", "output_tokens",
  "cache_read_input_tokens", "cache_creation_input_tokens", "revenue_msats",
] as const;

export type StatsDay = ModelUsageMixMetric & {
  coverage: "complete" | "partial" | "missing";
  legacy: boolean;
  coveredMinutes: number;
  sourceInterval: number;
};
export type StatsReport = {
  event: Event;
  coordinate: string;
  providerId: string;
  providerLabel: string;
  format: "v2" | "legacy";
  epoch: number | null;
  days: StatsDay[];
  weeks?: StatsDay[];
};
export type StatsProvider = {
  providerId: string;
  providerLabel: string;
  reports: StatsReport[];
};

const LEGACY_SCHEMAS = new Set([
  "routstr.analytics.usage.v1", "routstr.analytics.usage.v2", "routstr.analytics.snapshot.v1",
]);
const HEX_KEY = /^[0-9a-f]{64}$/;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function dayTime(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : null;
}

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function completedRange(window: WindowKey, now = Date.now()): CompletedRange {
  const days = WINDOW_OPTIONS.find((option) => option.id === window)!.days;
  const end = Math.floor(now / DAY_MS) * DAY_MS;
  return { start: end - days * DAY_MS, end, days };
}

export function emptyDay(ms: number): StatsDay {
  return {
    timestamp: `${dayKey(ms)}T00:00:00Z`, total_successful: 0, total_revenue_msats: 0,
    total_tokens: 0, others: 0, others_revenue_msats: 0, others_tokens: 0,
    model_counts: {}, model_revenue_msats: {}, model_tokens: {}, coverage: "missing",
    legacy: false, coveredMinutes: 0, sourceInterval: 1440,
  };
}

function vector(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== V2_COLUMNS.length ||
      !value.every((item) => Number.isSafeInteger(item) && item >= 0)) return null;
  if (!Number.isSafeInteger(value[1] + value[2] + value[3] + value[4])) return null;
  return value;
}

function addModels(target: Record<string, number>, source: Record<string, number>) {
  for (const [model, value] of Object.entries(source)) {
    Object.defineProperty(target, model, { value: (Object.hasOwn(target, model) ? target[model] : 0) + value, writable: true, configurable: true, enumerable: true });
  }
}

export function addDay(target: StatsDay, source: StatsDay): void {
  target.total_successful += source.total_successful;
  target.total_revenue_msats += source.total_revenue_msats;
  target.total_tokens += source.total_tokens;
  target.others += source.others;
  target.others_revenue_msats += source.others_revenue_msats;
  target.others_tokens += source.others_tokens;
  target.legacy ||= source.legacy;
  addModels(target.model_counts, source.model_counts);
  addModels(target.model_revenue_msats, source.model_revenue_msats);
  addModels(target.model_tokens, source.model_tokens);
}

async function parseV2(event: Event, payload: Record<string, unknown>, d: string): Promise<StatsReport | null> {
  if (event.tags.length !== 3 || event.tags.some((tag) => tag.length !== 2) ||
      event.tags.map((tag) => tag[0]).join() !== "d,a,w") return null;
  const providerId = event.tags[1][1];
  const prefix = `38421:${event.pubkey}:`;
  if (!providerId.startsWith(prefix) || providerId.length === prefix.length) return null;
  const week = dayTime(payload.week);
  const start = dayTime(payload.coverage_start);
  const through = dayTime(payload.through);
  const epoch = payload.epoch;
  if (week === null || start === null || through === null || new Date(week).getUTCDay() !== 1 ||
      start < week || through < start || through >= week + 7 * DAY_MS ||
      through >= Math.floor(event.created_at * 1000 / DAY_MS) * DAY_MS ||
      !Number.isSafeInteger(epoch) || Number(epoch) < 0 || typeof payload.complete !== "boolean" ||
      event.tags[2][1] !== payload.week ||
      !Array.isArray(payload.columns) || payload.columns.length !== V2_COLUMNS.length ||
      !payload.columns.every((name, index) => name === V2_COLUMNS[index])) return null;
  if ((payload.corrected !== undefined && payload.corrected !== true) ||
      (payload.corrects !== undefined && (payload.corrected !== true || typeof payload.corrects !== "string" || !HEX_KEY.test(payload.corrects)))) return null;
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(providerId))))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
  if (d !== `routstr.analytics.v2:${hash}:week:${payload.week}:epoch:${epoch}`) return null;
  const totals = record(payload.days);
  const dailyModels = record(payload.daily_models);
  const count = (through - start) / DAY_MS + 1;
  if (!totals || !dailyModels || Object.keys(totals).length !== count || Object.keys(dailyModels).length !== count) return null;
  const days: StatsDay[] = [];
  for (let ms = start; ms <= through; ms += DAY_MS) {
    const date = dayKey(ms);
    const values = vector(totals[date]);
    const models = record(dailyModels[date]);
    if (!values || !models || !Object.hasOwn(models, "_other")) return null;
    const summed = Array<number>(V2_COLUMNS.length).fill(0);
    const day = emptyDay(ms);
    day.coverage = "complete";
    day.coveredMinutes = 1440;
    day.total_successful = values[0];
    day.total_tokens = values[1] + values[2] + values[3] + values[4];
    day.total_revenue_msats = values[5];
    for (const [model, raw] of Object.entries(models)) {
      const row = vector(raw);
      if (!row || !model) return null;
      row.forEach((value, index) => { summed[index] += value; });
      const rowTokens = row[1] + row[2] + row[3] + row[4];
      if (model === "_other") {
        day.others = row[0];
        day.others_tokens = rowTokens;
        day.others_revenue_msats = row[5];
      } else {
        Object.defineProperty(day.model_counts, model, { value: row[0], enumerable: true });
        Object.defineProperty(day.model_tokens, model, { value: rowTokens, enumerable: true });
        Object.defineProperty(day.model_revenue_msats, model, { value: row[5], enumerable: true });
      }
    }
    if (!summed.every((value, index) => Number.isSafeInteger(value) && value === values[index])) return null;
    days.push(day);
  }
  return { event, coordinate: `${event.pubkey}|${d}`, providerId,
    providerLabel: providerId.slice(prefix.length), format: "v2", epoch: Number(epoch), days };
}

function legacyNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= Number.MAX_SAFE_INTEGER ? parsed : null;
}

function legacyModelValues(value: unknown): Record<string, number> | null {
  if (value === undefined) return {};
  const source = record(value);
  if (!source) return null;
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source)) {
    const number = legacyNumber(raw);
    if (number === null) return null;
    Object.defineProperty(result, key, { value: number, enumerable: true });
  }
  return result;
}

function parseLegacy(event: Event, payload: Record<string, unknown>, d: string): StatsReport | null {
  if (d.includes(":checkpoint:")) return null;
  const providerD = d.replace(/:(?:stats|usage(?::latest|:(?:day:)?\d{4}-\d{2}-\d{2}|:month:\d{4}-\d{2})?)$/, "");
  if (!providerD || providerD === d) return null;
  const providerId = `38421:${event.pubkey}:${providerD}`;
  const endpoint = Array.isArray(payload.endpoint_urls) ? payload.endpoint_urls.find((value) => typeof value === "string") : null;
  let providerLabel = providerD;
  try { if (endpoint) providerLabel = new URL(endpoint).host.replace(/^www\./, ""); } catch { /* Keep signed node identifier. */ }
  const windows = record(payload.windows);
  const sources = [payload, ...Object.values(windows ?? {}).map(record).filter((value): value is Record<string, unknown> => value !== null)];
  const byDay = new Map<number, StatsDay>();
  const byWeek = new Map<number, StatsDay>();
  for (const source of sources) {
    const mix = record(source.model_usage_mix);
    const interval = legacyNumber(mix?.interval_minutes ?? source.interval_minutes);
    const weekly = interval === 10080;
    if (!mix || !Array.isArray(mix.metrics) || interval === null || interval <= 0 ||
        (!weekly && (interval > 1440 || 1440 % interval !== 0))) continue;
    const intervalMs = interval * 60_000;
    const generatedAt = legacyNumber(payload.generated_at);
    const end = Math.min(event.created_at * 1000, (generatedAt ?? event.created_at) * 1000);
    const hours = legacyNumber(source.window_hours ?? mix.hours_back ?? payload.window_hours);
    let start = hours === null ? Number.NEGATIVE_INFINITY : end - hours * 3_600_000;
    let sourceEnd = end;
    if (payload.period_type === "day") {
      const day = dayTime(payload.period_key);
      if (day === null) continue;
      start = day;
      sourceEnd = Math.min(end, day + DAY_MS);
    } else if (payload.period_type === "month" && typeof payload.period_key === "string") {
      const month = dayTime(`${payload.period_key}-01`);
      if (month === null) continue;
      start = month;
      const date = new Date(month);
      sourceEnd = Math.min(end, Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    }
    const sourceDays = new Map<number, StatsDay>();
    const seen = new Set<number>();
    for (const raw of mix.metrics) {
      const metric = record(raw);
      if (!metric || typeof metric.timestamp !== "string") continue;
      const timestamp = metric.timestamp.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:\d{2})?$/);
      if (!timestamp || dayTime(timestamp[1]) === null) continue;
      const ms = Date.parse(`${timestamp[1]}T${timestamp[2]}${timestamp[3] ?? "Z"}`);
      const dayMs = Math.floor(ms / DAY_MS) * DAY_MS;
      if (!Number.isFinite(ms) || ms < start || ms + intervalMs > sourceEnd || seen.has(ms) ||
          (weekly ? ms !== dayMs || new Date(ms).getUTCDay() !== 4 : ms + intervalMs > dayMs + DAY_MS)) continue;
      const requests = legacyNumber(metric.total_successful);
      const revenue = legacyNumber(metric.total_revenue_msats);
      const tokens = legacyNumber(metric.total_tokens);
      const counts = legacyModelValues(metric.model_counts);
      const modelRevenue = legacyModelValues(metric.model_revenue_msats);
      const modelTokens = legacyModelValues(metric.model_tokens);
      if (requests === null || revenue === null || tokens === null || !counts || !modelRevenue || !modelTokens) continue;
      const countSum = Object.values(counts).reduce((sum, value) => sum + value, 0);
      const revenueSum = Object.values(modelRevenue).reduce((sum, value) => sum + value, 0);
      const tokenSum = Object.values(modelTokens).reduce((sum, value) => sum + value, 0);
      if (countSum > requests || revenueSum > revenue + 0.001 || tokenSum > tokens) continue;
      const part = emptyDay(dayMs);
      Object.assign(part, { total_successful: requests, total_revenue_msats: revenue, total_tokens: tokens,
        model_counts: counts, model_revenue_msats: modelRevenue, model_tokens: modelTokens,
        others: requests - countSum, others_revenue_msats: Math.max(0, revenue - revenueSum), others_tokens: tokens - tokenSum });
      if (weekly) {
        Object.assign(part, { coverage: "partial", legacy: true, coveredMinutes: interval, sourceInterval: interval,
          period_end: `${dayKey(ms + intervalMs)}T00:00:00Z` });
        if (!byWeek.has(ms)) byWeek.set(ms, part);
        seen.add(ms);
        continue;
      }
      const day = sourceDays.get(dayMs) ?? emptyDay(dayMs);
      addDay(day, part);
      day.coverage = "partial";
      day.legacy = true;
      day.sourceInterval = interval;
      day.coveredMinutes += interval;
      seen.add(ms);
      sourceDays.set(dayMs, day);
    }
    for (const [ms, day] of Array.from(sourceDays)) {
      const current = byDay.get(ms);
      if (!current || day.coveredMinutes > current.coveredMinutes ||
          (day.coveredMinutes === current.coveredMinutes && day.sourceInterval < current.sourceInterval)) byDay.set(ms, day);
    }
  }
  return { event, coordinate: `${event.pubkey}|${d}`, providerId, providerLabel, format: "legacy", epoch: null,
    days: Array.from(byDay.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    ...(byWeek.size ? { weeks: Array.from(byWeek.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp)) } : {}) };
}

export async function parseStatsEvent(value: unknown, now = Date.now()): Promise<StatsReport | null> {
  const raw = record(value);
  if (!raw || raw.kind !== ANALYTICS_KIND || typeof raw.id !== "string" || !HEX_KEY.test(raw.id) ||
      typeof raw.pubkey !== "string" || !HEX_KEY.test(raw.pubkey) || typeof raw.sig !== "string" || !/^[0-9a-f]{128}$/.test(raw.sig) ||
      !Number.isSafeInteger(raw.created_at) || Number(raw.created_at) < 0 || Number(raw.created_at) * 1000 > now + 300_000 ||
      typeof raw.content !== "string" || raw.content.length > 4 * 1024 * 1024 || !Array.isArray(raw.tags) ||
      raw.tags.some((tag) => !Array.isArray(tag) || !tag.every((item) => typeof item === "string"))) return null;
  // A fresh object prevents an inherited library verification cache from bypassing the signature check.
  const event: Event = { id: raw.id, pubkey: raw.pubkey, sig: raw.sig, created_at: Number(raw.created_at),
    kind: ANALYTICS_KIND, tags: raw.tags, content: raw.content };
  // A producer's signed v2 EVENT frame is at most 96 KiB of UTF-8, tags and
  // escaping included, so this page does no further work on a larger one.
  if (event.tags.some((tag) => tag[0] === "d" && tag[1]?.startsWith("routstr.analytics.v2:")) &&
      new TextEncoder().encode(JSON.stringify(["EVENT", event])).length > 96 * 1024) return null;
  try {
    if (!verifyEvent(event)) return null;
    const payload = record(JSON.parse(event.content));
    const dTags = event.tags.filter((tag) => tag[0] === "d");
    const d = dTags[0]?.[1];
    if (!payload || dTags.length !== 1 || !d) return null;
    if (payload.schema === "routstr.analytics.v2") return await parseV2(event, payload, d);
    if (typeof payload.schema === "string" && LEGACY_SCHEMAS.has(payload.schema)) return parseLegacy(event, payload, d);
  } catch { return null; }
  return null;
}

export function reportWins(candidate: StatsReport, current: StatsReport): boolean {
  return candidate.event.created_at > current.event.created_at ||
    (candidate.event.created_at === current.event.created_at && candidate.event.id < current.event.id);
}

export function buildProviders(reports: StatsReport[]): StatsProvider[] {
  const coordinates = new Map<string, StatsReport>();
  for (const report of reports) {
    const current = coordinates.get(report.coordinate);
    if (!current || reportWins(report, current)) coordinates.set(report.coordinate, report);
  }
  const providers = new Map<string, StatsProvider>();
  for (const report of Array.from(coordinates.values())) {
    const provider: StatsProvider = providers.get(report.providerId) ?? { providerId: report.providerId, providerLabel: report.providerLabel, reports: [] };
    if (report.format === "legacy") provider.providerLabel = report.providerLabel;
    provider.reports.push(report);
    providers.set(report.providerId, provider);
  }
  return Array.from(providers.values()).sort((a, b) => a.providerLabel.localeCompare(b.providerLabel));
}

export function selectProviderDays(provider: StatsProvider, range: CompletedRange): StatsDay[] {
  const candidates = new Map<number, { report: StatsReport; day: StatsDay }[]>();
  for (const report of provider.reports) {
    for (const day of report.days) {
      const ms = Date.parse(day.timestamp);
      if (ms < range.start || ms >= range.end) continue;
      const list = candidates.get(ms) ?? [];
      list.push({ report, day });
      candidates.set(ms, list);
    }
  }
  const result: StatsDay[] = [];
  for (let ms = range.start; ms < range.end; ms += DAY_MS) {
    const rows = candidates.get(ms) ?? [];
    const v2 = rows.filter((row) => row.report.format === "v2");
    if (v2.length > 1) { result.push(emptyDay(ms)); continue; }
    if (v2.length === 1) { result.push(v2[0].day); continue; }
    rows.sort((a, b) => b.day.coveredMinutes - a.day.coveredMinutes || a.day.sourceInterval - b.day.sourceInterval ||
      b.report.event.created_at - a.report.event.created_at || a.report.event.id.localeCompare(b.report.event.id));
    result.push(rows[0]?.day ?? emptyDay(ms));
  }
  return result;
}

function selectWeeklyStats(providers: StatsProvider[], range: CompletedRange) {
  const selected = providers.map((provider) => ({ provider, days: selectProviderDays(provider, range) }));
  const metrics: StatsDay[] = [];
  const reporting = new Set<string>();
  let completeProviderDays = 0;
  let reportedProviderDays = 0;
  let latestDataDay: string | null = null;
  const weekMs = 7 * DAY_MS;
  // The Unix epoch was a Thursday, matching the legacy publisher's weekly buckets.
  for (let weekStart = Math.floor(range.start / weekMs) * weekMs; weekStart < range.end; weekStart += weekMs) {
    const start = Math.max(range.start, weekStart);
    const end = Math.min(range.end, weekStart + weekMs);
    const bucketDays = (end - start) / DAY_MS;
    const metric = emptyDay(start);
    metric.period_end = `${dayKey(end)}T00:00:00Z`;
    metric.sourceInterval = bucketDays * 1440;
    let reported = 0;
    let complete = 0;
    for (const { provider, days } of selected) {
      let source = emptyDay(start);
      let sourceReported = 0;
      let sourceFullDays = 0;
      let sourceComplete = 0;
      for (let index = (start - range.start) / DAY_MS; index < (end - range.start) / DAY_MS; index++) {
        const day = days[index];
        if (day.coverage === "missing") continue;
        addDay(source, day);
        sourceReported++;
        if (day.coveredMinutes === 1440) sourceFullDays++;
        if (day.coverage === "complete") sourceComplete++;
        const date = day.timestamp.slice(0, 10);
        if (latestDataDay === null || date > latestDataDay) latestDataDay = date;
      }
      if (bucketDays === 7 && sourceFullDays < 7 && !provider.reports.some((report) => report.format === "v2" &&
          report.days.some((day) => Date.parse(day.timestamp) >= weekStart && Date.parse(day.timestamp) < end))) {
        let replacement: { report: StatsReport; week: StatsDay } | null = null;
        for (const report of provider.reports) {
          if (report.format !== "legacy") continue;
          const week = report.weeks?.find((row) => Date.parse(row.timestamp) === weekStart);
          if (!week || week.total_successful < source.total_successful || week.total_revenue_msats < source.total_revenue_msats ||
              week.total_tokens < source.total_tokens) continue;
          if (!replacement || reportWins(report, replacement.report)) replacement = { report, week };
        }
        if (replacement) {
          source = replacement.week;
          sourceReported = 7;
          sourceComplete = 0;
          const date = dayKey(end - DAY_MS);
          if (latestDataDay === null || date > latestDataDay) latestDataDay = date;
        }
      }
      if (sourceReported > 0) reporting.add(provider.providerId);
      addDay(metric, source);
      reported += sourceReported;
      complete += sourceComplete;
    }
    metric.coverage = reported === 0 ? "missing" : complete === providers.length * bucketDays ? "complete" : "partial";
    metric.token_coverage = metric.coverage === "missing" ? "missing"
      : metric.legacy || metric.coverage === "partial" ? "partial" : "complete";
    completeProviderDays += complete;
    reportedProviderDays += reported;
    metrics.push(metric);
  }
  return { metrics, completeProviderDays, reportedProviderDays, expectedProviderDays: providers.length * range.days,
    reportingProviders: reporting.size, latestDataDay, hasData: reportedProviderDays > 0 };
}

export function selectStats(providers: StatsProvider[], range: CompletedRange, grouping: StatsGrouping = "daily") {
  if (grouping === "weekly") return selectWeeklyStats(providers, range);
  const selected = providers.map((provider) => ({ provider, days: selectProviderDays(provider, range) }));
  const metrics: StatsDay[] = [];
  let completeProviderDays = 0;
  let reportedProviderDays = 0;
  for (let index = 0; index < range.days; index++) {
    const day = emptyDay(range.start + index * DAY_MS);
    let reported = 0;
    let complete = 0;
    for (const selection of selected) {
      const source = selection.days[index];
      if (source.coverage === "missing") continue;
      addDay(day, source);
      reported++;
      if (source.coverage === "complete") complete++;
    }
    day.coverage = reported === 0 ? "missing" : complete === providers.length ? "complete" : "partial";
    day.token_coverage = day.coverage === "missing" ? "missing"
      : day.legacy || day.coverage === "partial" ? "partial" : "complete";
    reportedProviderDays += reported;
    completeProviderDays += complete;
    metrics.push(day);
  }
  return { metrics, completeProviderDays, reportedProviderDays, expectedProviderDays: providers.length * range.days,
    reportingProviders: selected.filter(({ days }) => days.some((day) => day.coverage !== "missing")).length,
    latestDataDay: metrics.findLast((day) => day.coverage !== "missing")?.timestamp.slice(0, 10) ?? null,
    hasData: reportedProviderDays > 0,
  };
}
