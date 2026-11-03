import assert from "node:assert/strict";
import test from "node:test";
import { finalizeEvent } from "nostr-tools";
import {
  BLOCKED_STATS_PUBKEYS, DAY_MS, STATS_SANITY, buildProviders, completedRange,
  isBlockedStatsPubkey, parseStatsEvent, sanitizeStatsProviders, selectStats,
} from "../lib/stats-reports.ts";

const NOW = Date.parse("2026-09-18T12:30:00Z");
const CREATED_AT = Math.floor(Date.parse("2026-09-18T12:00:00Z") / 1000);
const KEY = new Uint8Array(32).fill(23);

async function parse(event) {
  const report = await parseStatsEvent(event, NOW);
  assert.ok(report, "fixture must pass actual signature and report validation");
  return report;
}

/** A legacy snapshot with one 30d daily bucket and, optionally, a 1y weekly one. */
function snapshot({ node = "node", endpoints, day, week, created_at = CREATED_AT } = {}) {
  const windows = {};
  if (day) windows["30d"] = { interval_minutes: 1440, window_hours: 720, model_usage_mix: { interval_minutes: 1440, metrics: [day] } };
  if (week) windows["1y"] = { interval_minutes: 10080, window_hours: 8760, model_usage_mix: { interval_minutes: 10080, metrics: [week] } };
  return finalizeEvent({
    kind: 38422,
    created_at,
    tags: [["d", `${node}:stats`]],
    content: JSON.stringify({
      schema: "routstr.analytics.snapshot.v1", provider_id: node, generated_at: created_at,
      ...(endpoints ? { endpoint_urls: endpoints } : {}),
      windows,
    }),
  }, KEY);
}

/** Realistic provider-day: ~11 sats per request, ~5.5 msats per token. */
const normalDay = (date, { requests = 1_000, tokens = 2_000_000, msats = 11_000_000 } = {}) => ({
  timestamp: `${date}T00:00:00Z`, total_successful: requests, total_revenue_msats: msats,
  total_tokens: tokens, model_counts: {}, model_revenue_msats: {}, model_tokens: {},
});

async function providersFrom(specs) {
  const reports = [];
  for (const spec of specs) reports.push(await parse(snapshot(spec)));
  return buildProviders(reports);
}

/** One provider per spec, all reporting the same day, plus extra normal providers. */
async function baseline(specs, { normal = 9 } = {}) {
  const filler = Array.from({ length: normal }, (_, index) => ({ node: `filler-${index}`, day: normalDay("2026-09-17") }));
  return providersFrom([...filler, ...specs]);
}

const range = completedRange("1d", NOW);
const total = (selection, field) => selection.metrics.reduce((sum, day) => sum + day[field], 0);

test("the known test signer is matched by full key and by its 12-char node id", () => {
  const blocked = BLOCKED_STATS_PUBKEYS[0];
  assert.equal(isBlockedStatsPubkey(blocked), true);
  assert.equal(isBlockedStatsPubkey(blocked.slice(0, 12)), true);
  assert.equal(isBlockedStatsPubkey("0".repeat(64)), false);
  assert.equal(isBlockedStatsPubkey("not-a-pubkey"), false);
});

test("a blocked signer never reaches totals, even with ordinary-looking numbers", async () => {
  const providers = await providersFrom([{ node: "test-node", day: normalDay("2026-09-17") }]);
  const spoofed = providers.map((provider) => ({ ...provider, providerId: `38421:${BLOCKED_STATS_PUBKEYS[0]}:test-node` }));
  const { providers: visible, sanity } = sanitizeStatsProviders(spoofed, range);
  assert.equal(visible.length, 0);
  assert.equal(sanity.hiddenBlockedProviders, 1);
  assert.equal(sanity.hiddenProviders, 1);
  assert.equal(selectStats(visible, range).hasData, false);
});

test("a staging endpoint hides a provider, an empty endpoint list does not", async () => {
  const staging = await providersFrom([
    { node: "staging-node", endpoints: ["https://staging.routstr.com"], day: normalDay("2026-09-17") },
    { node: "bare-node", endpoints: [], day: normalDay("2026-09-17") },
    { node: "public-node", endpoints: ["https://api.example-provider.com"], day: normalDay("2026-09-17") },
  ]);
  const { providers: visible, sanity } = sanitizeStatsProviders(staging, range);
  assert.deepEqual(visible.map((provider) => provider.providerLabel).sort(),
    ["api.example-provider.com", "bare-node"]);
  assert.equal(sanity.hiddenStagingProviders, 1);
});

test("a provider-day priced orders of magnitude off the window median is dropped", async () => {
  const junk = {
    node: "pricing-mistake",
    day: normalDay("2026-09-17", { msats: 12_500_000_000 }),
  };
  const providers = await baseline([junk]);
  const before = selectStats(providers, range);
  assert.equal(total(before, "total_revenue_msats"), 9 * 11_000_000 + 12_500_000_000);

  const { providers: visible, sanity } = sanitizeStatsProviders(providers, range);
  const after = selectStats(visible, range);
  assert.equal(sanity.droppedBuckets, 1);
  assert.equal(total(after, "total_revenue_msats"), 9 * 11_000_000);
  assert.equal(total(after, "total_successful"), 9 * 1_000);
  assert.equal(after.reportingProviders, 9);
  assert.ok(sanity.limits);
});

test("legitimately expensive days stay: image revenue and a single spiky ratio", async () => {
  const imageHeavy = { node: "image-provider", day: normalDay("2026-09-17", { requests: 500, tokens: 100_000, msats: 53_664_000 }) };
  const spiky = { node: "spiky-provider", day: normalDay("2026-09-17", { requests: 1_000, tokens: 20_000, msats: 33_000_000 }) };
  const providers = await baseline([imageHeavy, spiky]);
  const { providers: visible, sanity } = sanitizeStatsProviders(providers, range);
  assert.equal(sanity.droppedBuckets, 0);
  assert.equal(visible.length, 11);
});

test("a token-less blowout is still caught by the wider single-ratio limit", async () => {
  const noTokens = { node: "image-blowout", day: normalDay("2026-09-17", { tokens: 0, msats: 100_000_000_000 }) };
  const providers = await baseline([noTokens]);
  const { providers: visible, sanity } = sanitizeStatsProviders(providers, range);
  assert.equal(sanity.droppedBuckets, 1);
  assert.equal(total(selectStats(visible, range), "total_revenue_msats"), 9 * 11_000_000);
});

test("too few provider-days leave the guard off instead of guessing a median", async () => {
  const providers = await baseline([{ node: "lonely", day: normalDay("2026-09-17", { msats: 10_000_000_000 }) }], { normal: 2 });
  const { providers: visible, sanity } = sanitizeStatsProviders(providers, range);
  assert.equal(sanity.limits, null);
  assert.equal(sanity.droppedBuckets, 0);
  assert.equal(visible.length, 3);
});

test("weekly buckets are filtered by the same limits as daily ones", async () => {
  const thursday = "2026-09-10";
  const report = await parse(snapshot({
    node: "weekly-pricing-mistake",
    day: normalDay("2026-09-17"),
    week: normalDay(thursday, { requests: 7_000, tokens: 14_000_000, msats: 87_500_000_000 }),
  }));
  const providers = await baseline([], { normal: 9 }).then((base) => [...base, ...buildProviders([report])]);
  const { providers: visible, sanity } = sanitizeStatsProviders(providers, completedRange("7d", NOW));
  const cleaned = visible.find((provider) => provider.providerLabel === "weekly-pricing-mistake");
  assert.ok(cleaned);
  assert.equal(cleaned.reports[0].weeks.length, 0);
  assert.equal(cleaned.reports[0].days.length, 1);
  assert.equal(sanity.droppedBuckets, 1);
});

test("the guard's multiples keep real data and junk on opposite sides", () => {
  assert.ok(STATS_SANITY.eitherRatio > STATS_SANITY.bothRatio);
  assert.ok(STATS_SANITY.minSamples >= 4);
  assert.ok(STATS_SANITY.minRequests > 0 && STATS_SANITY.minTokens > 0);
  assert.ok(DAY_MS > 0);
});
