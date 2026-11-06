import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import {
  DAY_MS, V2_COLUMNS, buildProviders, completedRange, dayKey, parseStatsEvent,
  selectStats,
} from "../lib/stats-reports.ts";

const NOW = Date.parse("2026-09-18T12:30:00Z");
const KEY = new Uint8Array(32).fill(23);
const PUBKEY = getPublicKey(KEY);
const CREATED = Date.parse("2026-09-18T00:00:00Z") / 1000;
const ms = (date) => Date.parse(`${date}T00:00:00Z`);
const range = (start, end) => ({ start: ms(start), end: ms(end), days: (ms(end) - ms(start)) / DAY_MS });
const sum = (selection, field = "total_successful") => selection.metrics.reduce((total, row) => total + row[field], 0);
const row = (date, requests = 10, revenue = requests * 100, tokens = requests * 20) => ({
  timestamp: `${date}T00:00:00Z`, total_successful: requests, total_revenue_msats: revenue,
  total_tokens: tokens, model_counts: { "model/one": requests },
  model_revenue_msats: { "model/one": revenue }, model_tokens: { "model/one": tokens },
});

function legacy({ weeks = [], days = [], interval = 10080, hours = 365 * 24, created_at = CREATED,
  node = "provider", suffix = "stats", ...payload } = {}) {
  return finalizeEvent({ kind: 38422, created_at, tags: [["d", `${node}:${suffix}`]], content: JSON.stringify({
    schema: "routstr.analytics.snapshot.v1", generated_at: created_at,
    windows: {
      "365d": { window_hours: hours, model_usage_mix: { interval_minutes: interval, metrics: weeks } },
      "daily": { window_hours: 365 * 24, model_usage_mix: { interval_minutes: 1440, metrics: days } },
    }, ...payload,
  }) }, KEY);
}

function modern(date, requests = 2, { epoch = 0, node = "provider", tokens = requests * 20 } = {}) {
  const week = dayKey(ms(date) - ((new Date(ms(date)).getUTCDay() + 6) % 7) * DAY_MS);
  const provider = `38421:${PUBKEY}:${node}`;
  const hash = createHash("sha256").update(provider).digest("hex").slice(0, 16);
  const values = [requests, tokens, 0, 0, 0, requests * 100];
  return finalizeEvent({ kind: 38422, created_at: CREATED, tags: [
    ["d", `routstr.analytics.v2:${hash}:week:${week}:epoch:${epoch}`], ["a", provider], ["w", week],
  ], content: JSON.stringify({ schema: "routstr.analytics.v2", week, epoch, coverage_start: date,
    through: date, complete: false, columns: [...V2_COLUMNS], days: { [date]: values },
    daily_models: { [date]: { "model/one": values, _other: Array(V2_COLUMNS.length).fill(0) } },
  }) }, KEY);
}

async function providers(...events) {
  const reports = await Promise.all(events.map((event) => parseStatsEvent(event, NOW)));
  assert.ok(reports.every(Boolean), "signed fixtures must pass the real parser");
  return buildProviders(reports);
}

function assertPartitions(selection) {
  for (const metric of selection.metrics) {
    for (const [total, models, other] of [
      ["total_successful", "model_counts", "others"],
      ["total_revenue_msats", "model_revenue_msats", "others_revenue_msats"],
      ["total_tokens", "model_tokens", "others_tokens"],
    ]) {
      assert.equal(Object.values(metric[models]).reduce((a, b) => a + b, 0) + metric[other], metric[total]);
    }
  }
}

test("Weekly restores signed older totals that Daily cannot display, without inventing daily values", async () => {
  const metric = row("2026-06-04", 140, 7000, 1400);
  metric.model_counts = { "model/one": 100 };
  metric.model_revenue_msats = { "model/one": 5000 };
  metric.model_tokens = { "model/one": 1000 };
  const parsed = await providers(legacy({ weeks: [metric] }));
  const selection = completedRange("365d", NOW);
  const daily = selectStats(parsed, selection);
  assert.equal(daily.hasData, false);
  assert.equal(sum(daily), 0);
  assert.deepEqual(selectStats(parsed, selection, "daily"), daily);
  const weekly = selectStats(parsed, selection, "weekly");
  assert.equal(weekly.hasData, true);
  assert.equal(sum(weekly), 140);
  assert.equal(sum(weekly, "total_revenue_msats"), 7000);
  assert.equal(sum(weekly, "total_tokens"), 1400);
  assert.equal(sum(weekly, "total_tokens"), 1400);
  assert.equal(weekly.completeProviderDays, 0);
  assert.equal(weekly.reportedProviderDays, 7);
  assert.equal(weekly.expectedProviderDays, 365);
  assert.equal(weekly.reportingProviders, 1);
  assert.equal(weekly.latestDataDay, "2026-06-10");
  const restored = weekly.metrics.find((metric) => metric.timestamp === "2026-06-04T00:00:00Z");
  assert.equal(restored.period_end, "2026-06-11T00:00:00Z");
  assert.equal(restored.coverage, "partial");
  assert.equal(restored.token_coverage, "partial");
  assert.equal(restored.legacy, true);
  assertPartitions(weekly);
  assert.equal(selectStats(parsed, selection).hasData, false, "weekly selection must not mutate daily data");
});

test("Weekly replaces a provider's incomplete daily subtotal once and conserves every model metric", async () => {
  const weeklyRow = row("2026-06-04", 14, 700, 1400);
  weeklyRow.model_counts = { "model/two": 10 };
  weeklyRow.model_revenue_msats = { "model/two": 500 };
  weeklyRow.model_tokens = { "model/two": 1000 };
  const parsed = await providers(legacy({ weeks: [weeklyRow], days: [row("2026-06-04", 2), row("2026-06-05", 3)] }));
  const selectedRange = range("2026-06-04", "2026-06-11");
  const dailyBefore = selectStats(parsed, selectedRange);
  const selected = selectStats(parsed, selectedRange, "weekly");
  assert.equal(sum(dailyBefore), 5);
  assert.equal(sum(selected), 14);
  assert.equal(sum(selected, "total_revenue_msats"), 700);
  assert.equal(sum(selected, "total_tokens"), 1400);
  assert.deepEqual(selected.metrics[0].model_counts, { "model/two": 10 });
  assert.equal(selected.metrics[0].others, 4);
  assertPartitions(selected);
  assert.deepEqual(selectStats(parsed, selectedRange), dailyBefore);
});

test("Seven recorded days, including observed zeros, keep their exact daily subtotal", async () => {
  for (const requests of [0, 1]) {
    const days = Array.from({ length: 7 }, (_, i) => row(dayKey(ms("2026-06-04") + i * DAY_MS), requests));
    const parsed = await providers(legacy({ weeks: [row("2026-06-04", 100)], days }));
    const selected = selectStats(parsed, range("2026-06-04", "2026-06-11"), "weekly");
    assert.equal(sum(selected), requests * 7);
    assert.equal(selected.hasData, true);
    assert.equal(selected.reportedProviderDays, 7);
    assert.equal(selected.metrics[0].coverage, "partial");
  }
});

test("Weekly restores a full total when seven daily records include a partial day", async () => {
  const selectedRange = range("2026-06-04", "2026-06-11");
  for (const interval of [60, 360]) {
    const parsed = await providers(legacy({
      created_at: (selectedRange.end + interval * 60_000) / 1000,
      windows: {
        "365d": { window_hours: 365 * 24, model_usage_mix: {
          interval_minutes: 10080, metrics: [row("2026-06-04", 168)],
        } },
        "7d": { window_hours: 7 * 24, model_usage_mix: {
          interval_minutes: interval,
          metrics: Array.from({ length: 7 * 1440 / interval }, (_, index) => ({
            ...row("2026-06-04", interval / 60),
            timestamp: new Date(selectedRange.start + index * interval * 60_000).toISOString(),
          })),
        } },
      },
    }));
    const daily = selectStats(parsed, selectedRange);
    assert.equal(daily.reportedProviderDays, 7);
    assert.equal(sum(daily), 168 - interval / 60);
    const weekly = selectStats(parsed, selectedRange, "weekly");
    assert.equal(sum(weekly), 168);
    assert.equal(sum(weekly, "total_revenue_msats"), 16800);
    assert.equal(sum(weekly, "total_tokens"), 3360);
    assertPartitions(weekly);
    assert.deepEqual(selectStats(parsed, selectedRange), daily);
  }
});

test("Weekly rows cannot cross selected-range edges, and daily edge contributions stay exact", async () => {
  const parsed = await providers(legacy({ weeks: [row("2026-06-04", 70)], days: [row("2026-06-05", 3), row("2026-06-10", 4)] }));
  for (const [start, end, expected] of [["2026-06-05", "2026-06-11", 7], ["2026-06-04", "2026-06-10", 3]]) {
    const selected = selectStats(parsed, range(start, end), "weekly");
    assert.equal(sum(selected), expected);
    assert.equal(selected.metrics[0].timestamp, `${start}T00:00:00Z`);
    assert.equal(selected.metrics[0].period_end, `${end}T00:00:00Z`);
  }
  assert.equal(sum(selectStats(parsed, range("2026-06-04", "2026-06-11"), "weekly")), 70);
});

test("A saved week must fit its original source window and publication time in full", async () => {
  const selectedRange = range("2026-06-04", "2026-06-11");
  for (const options of [
    { hours: 168, created_at: ms("2026-06-11") / 1000 + 1 },
    { hours: 168, created_at: ms("2026-06-11") / 1000 - 1 },
    { hours: 168, created_at: ms("2026-06-11") / 1000, generated_at: ms("2026-06-11") / 1000 - 1 },
    { period_type: "day", period_key: "2026-06-04" },
    { weeks: [row("2026-05-28")], period_type: "month", period_key: "2026-06" },
  ]) {
    const parsed = await providers(legacy({ weeks: [row("2026-06-04")], ...options }));
    assert.equal(selectStats(parsed, completedRange("365d", NOW), "weekly").hasData, false);
  }
  const exact = await providers(legacy({ weeks: [row("2026-06-04")], hours: 168, created_at: ms("2026-06-11") / 1000 }));
  assert.equal(sum(selectStats(exact, selectedRange, "weekly")), 10);
});

test("Display weeks start Thursday UTC and clip both selected edges without moving daily usage", async () => {
  const parsed = await providers(legacy({ days: [row("2026-09-11", 1), row("2026-09-16", 2), row("2026-09-17", 3)] }));
  const selected = selectStats(parsed, completedRange("7d", NOW), "weekly");
  assert.deepEqual(selected.metrics.map((metric) => [metric.timestamp, metric.period_end, metric.total_successful]), [
    ["2026-09-11T00:00:00Z", "2026-09-17T00:00:00Z", 3],
    ["2026-09-17T00:00:00Z", "2026-09-18T00:00:00Z", 3],
  ]);
  assert.equal(selected.latestDataDay, "2026-09-17");
  const one = selectStats(parsed, completedRange("1d", NOW), "weekly");
  assert.equal(one.metrics.length, 1);
  assert.equal(sum(one), 3);
  const year = selectStats([], range("2025-12-31", "2026-01-02"), "weekly");
  assert.deepEqual(year.metrics.map(({ timestamp, period_end }) => [timestamp, period_end]), [
    ["2025-12-31T00:00:00Z", "2026-01-01T00:00:00Z"],
    ["2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"],
  ]);
});

test("A daily-only weekly display does not claim the missing final days were reported", async () => {
  const parsed = await providers(legacy({ days: [row("2026-09-11", 1)] }));
  const selected = selectStats(parsed, completedRange("7d", NOW), "weekly");
  assert.equal(selected.latestDataDay, "2026-09-11");
  assert.equal(selected.reportedProviderDays, 1);
  assert.equal(selected.metrics[0].coverage, "partial");
  assert.equal(selected.metrics[1].coverage, "missing");
});

test("Each lower weekly metric blocks replacement of a larger known daily subtotal", async () => {
  for (const values of [[1, 100, 100], [10, 29, 100], [10, 100, 39]]) {
    const parsed = await providers(legacy({ weeks: [row("2026-06-04", ...values)], days: [row("2026-06-05", 2, 30, 40)] }));
    const selected = selectStats(parsed, range("2026-06-04", "2026-06-11"), "weekly");
    assert.deepEqual([sum(selected), sum(selected, "total_revenue_msats"), sum(selected, "total_tokens")], [2, 30, 40]);
    assert.equal(selected.reportedProviderDays, 1);
  }
});

test("Newest eligible weekly report wins deterministically without adding older versions", async () => {
  const first = legacy({ weeks: [row("2026-06-04", 10)], created_at: CREATED - 2 });
  const second = legacy({ weeks: [row("2026-06-04", 20)], suffix: "usage:latest", created_at: CREATED - 1 });
  const lower = legacy({ weeks: [row("2026-06-04", 1)], suffix: "usage", days: [row("2026-06-05", 2)] });
  const selectedRange = range("2026-06-04", "2026-06-11");
  assert.equal(sum(selectStats(await providers(first, second, lower), selectedRange, "weekly")), 20);
  const sameCoordinate = legacy({ weeks: [row("2026-06-04", 30)] });
  assert.equal(sum(selectStats(await providers(first, sameCoordinate), selectedRange, "weekly")), 30);
  const tieA = legacy({ weeks: [row("2026-06-04", 40)] });
  const tieB = legacy({ weeks: [row("2026-06-04", 50)], suffix: "usage:latest" });
  const expected = tieA.id < tieB.id ? 40 : 50;
  for (const events of [[tieA, tieB], [tieB, tieA]]) {
    assert.equal(sum(selectStats(await providers(...events), selectedRange, "weekly")), expected);
  }
});

test("Any v2 day blocks a legacy weekly replacement, even conflicting epochs hidden in Daily", async () => {
  const old = legacy({ weeks: [row("2026-09-10", 100)], days: [row("2026-09-11", 3)] });
  const first = modern("2026-09-14", 2);
  const selectedRange = range("2026-09-10", "2026-09-17");
  const selected = selectStats(await providers(old, first), selectedRange, "weekly");
  assert.equal(sum(selected), 5);
  // The legacy weekly row is blocked, so tokens come from the two daily rows only.
  assert.equal(sum(selected, "total_tokens"), 100);
  const conflict = selectStats(await providers(old, first, modern("2026-09-14", 4, { epoch: 1 })), selectedRange, "weekly");
  assert.equal(sum(conflict), 3);
  assert.equal(conflict.reportedProviderDays, 1);
  assert.equal(sum(conflict, "total_tokens"), 60);
});

test("Provider selections add to the network totals and legacy weeks do not alter another provider's cohort", async () => {
  const parsed = await providers(
    legacy({ weeks: [row("2026-09-10", 10)], days: [row("2026-09-11", 1)] }),
    modern("2026-09-14", 2, { node: "other" }),
  );
  const selectedRange = range("2026-09-10", "2026-09-17");
  const network = selectStats(parsed, selectedRange, "weekly");
  const each = parsed.map((provider) => selectStats([provider], selectedRange, "weekly"));
  for (const field of ["total_successful", "total_revenue_msats", "total_tokens"]) {
    assert.equal(sum(network, field), each.reduce((total, selected) => total + sum(selected, field), 0));
  }
  assert.equal(sum(network), 12);
  assert.equal(sum(network, "total_tokens"), 240);
  assert.equal(network.reportingProviders, 2);
  assert.equal(network.reportedProviderDays, 8);
  assert.equal(network.completeProviderDays, 1);
  assert.equal(network.expectedProviderDays, 14);
  assert.equal(network.metrics[0].coverage, "partial");
  assertPartitions(network);
});

test("A reported zero week is distinguishable from a missing week and complete v2 zeros stay complete", async () => {
  const parsed = await providers(legacy({ weeks: [row("2026-06-04", 0)] }));
  const selected = selectStats(parsed, range("2026-06-04", "2026-06-18"), "weekly");
  assert.equal(selected.hasData, true);
  assert.equal(sum(selected), 0);
  assert.deepEqual(selected.metrics.map(({ coverage }) => coverage), ["partial", "missing"]);
  assert.equal(selected.latestDataDay, "2026-06-10");
  const zeroDays = await providers(...Array.from({ length: 7 }, (_, i) => modern(dayKey(ms("2026-09-07") + i * DAY_MS), 0, { epoch: i })));
  const zeroSelection = selectStats(zeroDays, range("2026-09-07", "2026-09-14"), "weekly");
  assert.deepEqual(zeroSelection.metrics.map(({ coverage }) => coverage), ["complete", "complete"]);
  assert.equal(zeroSelection.completeProviderDays, 7);
  assert.equal(zeroSelection.hasData, true);
  const absent = selectStats([], range("2026-06-04", "2026-06-11"), "weekly");
  assert.equal(absent.hasData, false);
  assert.equal(absent.latestDataDay, null);
  assert.equal(absent.metrics[0].coverage, "missing");
});

test("Malformed or non-Thursday weekly rows are rejected by the same numeric, model and signature rules", async () => {
  const valid = row("2026-06-04");
  for (const change of [
    { total_successful: -1 }, { total_revenue_msats: "" }, { total_tokens: null },
    { model_counts: { "bad/model": 11 } }, { model_revenue_msats: { "bad/model": 1001 } },
    { model_tokens: { "bad/model": 201 } }, { model_counts: { "bad/model": -1 } },
    { timestamp: "2026-06-05T00:00:00Z" }, { timestamp: "2026-06-04T00:00:01Z" },
    { timestamp: "2026-02-30T00:00:00Z" }, { timestamp: "2026-06-04T00:00:00+05:30" },
  ]) {
    const parsed = await providers(legacy({ weeks: [{ ...valid, ...change }] }));
    assert.equal(selectStats(parsed, completedRange("365d", NOW), "weekly").hasData, false, JSON.stringify(change));
  }
  for (const interval of [2880, 10079, 20160]) {
    assert.equal(selectStats(await providers(legacy({ weeks: [valid], interval })), completedRange("365d", NOW), "weekly").hasData, false);
  }
  const signed = legacy({ weeks: [valid] });
  assert.equal(await parseStatsEvent({ ...signed, content: signed.content.replace('"total_successful":10', '"total_successful":11') }, NOW), null);
  const duplicate = await providers(legacy({ weeks: [{ ...valid, total_successful: -1 }, valid, row("2026-06-04", 99)] }));
  assert.equal(sum(selectStats(duplicate, completedRange("365d", NOW), "weekly")), 10);
  const utc = await providers(legacy({ weeks: [{ ...valid, timestamp: "2026-06-04T05:30:00+05:30" }] }));
  assert.equal(sum(selectStats(utc, completedRange("365d", NOW), "weekly")), 10);
});
