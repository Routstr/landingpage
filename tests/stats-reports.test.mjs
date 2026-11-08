import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import {
  DAY_MS, V2_COLUMNS, buildProviders, completedRange, dayKey, parseStatsEvent,
  selectProviderDays, selectStats,
} from "../lib/stats-reports.ts";

const NOW = Date.parse("2026-09-18T12:30:00Z");
const KEY = new Uint8Array(32).fill(17);
const PUBKEY = getPublicKey(KEY);
const fixture = JSON.parse(readFileSync(new URL("./fixtures/analytics-v2-daily.json", import.meta.url)));
const zero = () => Array(V2_COLUMNS.length).fill(0);
const values = (requests, { revenue = 0, tokens = 0, cacheRead = 0, cacheCreation = 0 } = {}) =>
  [requests, tokens, 0, cacheRead, cacheCreation, revenue];

// The pre-release layout a node publishes before it upgrades: the same six
// measures plus the observed/estimated/missing split and the measured sample.
const LEGACY_V2_COLUMNS = [
  "completed_requests",
  "input_observed_requests", "output_observed_requests",
  "cache_read_observed_requests", "cache_creation_observed_requests",
  "input_tokens", "output_tokens",
  "cache_read_input_tokens", "cache_creation_input_tokens",
  "revenue_msats",
  "input_estimated_requests", "output_estimated_requests",
  "cache_read_estimated_requests", "cache_creation_estimated_requests",
  "input_missing_requests", "output_missing_requests",
  "cache_read_missing_requests", "cache_creation_missing_requests",
  "measured_token_requests", "measured_tokens",
];
/** Widen a canonical row into that twenty-column layout, keeping its totals. */
const widen = ([requests, input, output, cacheRead, cacheCreation, revenue]) =>
  [requests, requests, requests, requests, requests, input, output, cacheRead, cacheCreation, revenue,
   0, 0, 0, 0, 0, 0, 0, 0, requests, input + output + cacheRead + cacheCreation];

function signed(payload, { node = "provider", epoch = payload.epoch ?? 0, created_at = fixture.created_at, tags } = {}) {
  const coordinate = `38421:${PUBKEY}:${node}`;
  const hash = createHash("sha256").update(coordinate).digest("hex").slice(0, 16);
  return finalizeEvent({ kind: 38422, created_at, tags: tags ?? [
    ["d", `routstr.analytics.v2:${hash}:week:${payload.week}:epoch:${epoch}`],
    ["a", coordinate], ["w", payload.week],
  ], content: JSON.stringify(payload) }, KEY);
}

function reportPayload(start, rows, { epoch = 0, model = "model/one", layout = "canonical" } = {}) {
  const ms = Date.parse(`${start}T00:00:00Z`);
  const week = dayKey(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS);
  const row = layout === "legacy" ? widen : (values) => [...values];
  const days = {};
  const daily_models = {};
  rows.forEach((source, i) => {
    const date = dayKey(ms + i * DAY_MS);
    days[date] = row(source);
    daily_models[date] = { [model]: row(source), _other: row(zero()) };
  });
  return { schema: "routstr.analytics.v2", week, epoch, coverage_start: start,
    through: dayKey(ms + (rows.length - 1) * DAY_MS), complete: false,
    columns: layout === "legacy" ? [...LEGACY_V2_COLUMNS] : [...V2_COLUMNS], days, daily_models };
}

async function parse(event) {
  const report = await parseStatsEvent(event, NOW);
  assert.ok(report, "fixture must pass actual signature and report validation");
  return report;
}

function legacy(metrics, { interval = 1440, node = "provider", hours = 30 * 24, created_at = fixture.created_at } = {}) {
  return finalizeEvent({ kind: 38422, created_at, tags: [["d", `${node}:stats`]], content: JSON.stringify({
    schema: "routstr.analytics.snapshot.v1", provider_id: "untrusted-label", generated_at: created_at,
    windows: { "30d": { interval_minutes: interval, window_hours: hours, model_usage_mix: { interval_minutes: interval, metrics } } },
  }) }, KEY);
}
function metric(date, requests = 8) {
  return { timestamp: `${date}T00:00:00Z`, total_successful: requests, total_revenue_msats: 0,
    total_tokens: 0, model_counts: { "model/one": requests }, model_revenue_msats: {}, model_tokens: {} };
}

function sum(selection, field = "total_successful") {
  return selection.metrics.reduce((total, day) => total + day[field], 0);
}

test("completed ranges have exact UTC edges, including leap years and timezone offsets", () => {
  for (const [key, days] of [["1d", 1], ["7d", 7], ["30d", 30], ["90d", 90], ["365d", 365]]) {
    const range = completedRange(key, NOW);
    assert.equal(range.end, Date.parse("2026-09-18T00:00:00Z"));
    assert.equal(range.end - range.start, days * DAY_MS);
  }
  assert.equal(dayKey(completedRange("1d", Date.parse("2024-03-01T03:00:00+02:00")).start), "2024-02-29");
  assert.equal(dayKey(completedRange("1d", Date.parse("2026-09-18T00:30:00+05:30")).start), "2026-09-16");
});

test("real Core SDK signature and daily model partitions survive end to end", async () => {
  const report = await parse(fixture);
  const selection = selectStats(buildProviders([report]), completedRange("7d", NOW));
  assert.equal(selection.completeProviderDays, 4);
  assert.equal(selection.expectedProviderDays, 7);
  assert.equal(selection.latestDataDay, "2026-09-17");
  assert.equal(sum(selection), 3);
  assert.equal(sum(selection, "total_tokens"), 190);
  assert.equal(selection.metrics[3].model_tokens["openai/gpt-test"], 170);
  assert.equal(sum(selection, "total_revenue_msats"), 3250);
  assert.equal(selection.metrics[3].model_counts["model/free"], 1);
  assert.equal(selection.metrics[3].model_revenue_msats["model/free"], 0);
  assert.equal(selection.metrics[5].others, 1);
  // Six columns report a billed request without saying whether its provider sent
  // usage, so a zero-token day is reported as covered, not as missing counts.
  assert.equal(selection.metrics[5].token_coverage, "complete");
  assert.equal(selection.metrics[3].token_coverage, "complete");
  assert.equal(selection.metrics[2].coverage, "missing");
  assert.equal(selection.metrics[4].coverage, "complete");
  assert.equal(selection.metrics[4].total_successful, 0);
});

test("a pre-release twenty-column report reads back as its six-column projection", async () => {
  const report = await parse(signed(reportPayload("2026-09-14", [
    values(2, { revenue: 2500, tokens: 135, cacheRead: 6, cacheCreation: 4 }),
    values(1, { revenue: 750 }),
  ], { layout: "legacy" })));
  assert.equal(report.format, "v2");
  assert.deepEqual(
    report.days.map((day) => [day.total_successful, day.total_tokens, day.total_revenue_msats]),
    [[2, 145, 2500], [1, 0, 750]],
  );
  assert.equal(report.days[0].model_tokens["model/one"], 145);
  assert.equal(report.days[0].model_revenue_msats["model/one"], 2500);
  assert.equal(report.days[0].coverage, "complete");
  const selection = selectStats(buildProviders([report]), completedRange("30d", NOW));
  assert.equal(sum(selection), 3);
  assert.equal(sum(selection, "total_tokens"), 145);
  assert.equal(sum(selection, "total_revenue_msats"), 3250);
});

test("a node that upgrades mid-stream keeps its closed pre-release weeks and its new ones", async () => {
  // A node never re-signs a delivered frame, so a week it published before the
  // upgrade stays twenty-wide while later weeks arrive six-wide.
  const reports = [
    await parse(signed(reportPayload("2026-09-07", [values(4)], { layout: "legacy" }))),
    await parse(signed(reportPayload("2026-09-14", [values(3)]))),
  ];
  const providers = buildProviders(reports);
  assert.equal(providers.length, 1);
  assert.deepEqual(providers[0].reports.map((report) => report.days[0].timestamp.slice(0, 10)), ["2026-09-07", "2026-09-14"]);
  assert.ok(providers[0].reports.every((report) => report.format === "v2"));
  const selection = selectStats(providers, completedRange("30d", NOW));
  assert.equal(sum(selection), 7);
  assert.equal(selection.reportedProviderDays, 2);
  assert.equal(selection.completeProviderDays, 2);
});

test("a re-published week replaces its pre-release copy instead of counting twice", async () => {
  const before = signed(reportPayload("2026-09-14", [values(5)], { layout: "legacy" }));
  const after = signed(reportPayload("2026-09-14", [values(5)]), { created_at: before.created_at + 600 });
  // The layout is not part of the address, so both layouts share one coordinate.
  assert.equal(before.tags[0][1], after.tags[0][1]);
  const providers = buildProviders([await parse(before), await parse(after)]);
  assert.equal(providers[0].reports.length, 1);
  assert.equal(JSON.parse(providers[0].reports[0].event.content).columns.length, V2_COLUMNS.length);
  assert.equal(sum(selectStats(providers, completedRange("30d", NOW))), 5);
});

test("a pre-release vector must match its declared width and its own totals", async () => {
  const modifications = [
    (p) => { p.columns = [...LEGACY_V2_COLUMNS.slice(0, 19), "measured_token_requests"]; },
    (p) => { p.columns[5] = "output_tokens"; },
    (p) => { p.columns = [...LEGACY_V2_COLUMNS].reverse(); },
    // Six-wide rows cannot hide inside a twenty-wide report.
    (p) => { p.days["2026-09-17"] = values(1); },
    (p) => { p.daily_models["2026-09-17"]["model/one"].push(0); },
    // A model row that no longer sums to the day total is rejected as before.
    (p) => { p.daily_models["2026-09-17"]["model/one"][9] = 12; },
    (p) => { p.daily_models["2026-09-17"]["model/one"][9] = -1; },
  ];
  for (const modify of modifications) {
    const payload = reportPayload("2026-09-17", [values(1)], { layout: "legacy" });
    modify(payload);
    assert.equal(await parseStatsEvent(signed(payload), NOW), null);
  }
});

test("Yesterday uses only its exact daily model partition, including an observed zero", async () => {
  const selected = selectStats(buildProviders([await parse(fixture)]), completedRange("1d", NOW));
  assert.equal(selected.hasData, true);
  assert.equal(selected.metrics.length, 1);
  assert.equal(selected.metrics[0].timestamp, "2026-09-17T00:00:00Z");
  assert.equal(sum(selected), 0);
  assert.deepEqual(selected.metrics[0].model_counts, {});
});

test("legacy data is bounded at both ends and never borrows a provider's named window", async () => {
  const report = await parse(legacy([metric("2026-07-01"), metric("2026-09-17"), metric("2026-12-01")]));
  const selection = selectStats(buildProviders([report]), completedRange("30d", NOW));
  assert.equal(sum(selection), 8);
  assert.equal(selection.reportedProviderDays, 1);
  assert.equal(selection.completeProviderDays, 0);
  assert.equal(selection.metrics.at(-1).coverage, "partial");
});

test("legacy coarse weeks and rolling first or unfinished last buckets are not split into days", async () => {
  const coarse = await parse(legacy([metric("2026-09-11")], { interval: 10080 }));
  assert.equal(selectStats(buildProviders([coarse]), completedRange("7d", NOW)).hasData, false);
  const generated = fixture.created_at + 12 * 3600;
  const partial = await parse(legacy([metric("2026-09-17"), metric("2026-09-18")], { hours: 24, created_at: generated }));
  assert.equal(selectStats(buildProviders([partial]), completedRange("1d", NOW)).hasData, false);
});

test("overlapping legacy windows choose one source, and v2 replaces legacy only on covered days", async () => {
  const old = await parse(legacy([metric("2026-09-14", 90), metric("2026-09-16", 12)]));
  const next = await parse(signed(reportPayload("2026-09-14", [values(2)])));
  const providers = buildProviders([old, next]);
  assert.equal(providers.length, 1);
  const selection = selectStats(providers, completedRange("7d", NOW));
  assert.equal(sum(selection), 14);
  assert.equal(selection.metrics[3].coverage, "complete");
  assert.equal(selection.metrics[5].coverage, "partial");
  assert.equal(selection.metrics[3].legacy, false);
});

test("same signer with two signed provider coordinates remains two providers", async () => {
  const payload = reportPayload("2026-09-17", [values(2)]);
  const first = await parse(signed(payload, { node: "one" }));
  const second = await parse(signed(payload, { node: "two" }));
  const providers = buildProviders([first, second]);
  assert.equal(providers.length, 2);
  assert.equal(sum(selectStats(providers, completedRange("1d", NOW))), 4);
  assert.equal(sum(selectStats([providers[0]], completedRange("1d", NOW))), 2);
});

test("corrections replace the same coordinate, independently of relay arrival order", async () => {
  const initial = await parse(signed(reportPayload("2026-09-17", [values(1)])));
  const payload = { ...reportPayload("2026-09-17", [values(3)]), corrected: true, corrects: initial.event.id };
  const correction = await parse(signed(payload, { created_at: fixture.created_at + 1 }));
  for (const reports of [[initial, correction, initial], [correction, initial, correction]]) {
    assert.equal(sum(selectStats(buildProviders(reports), completedRange("1d", NOW))), 3);
  }
  const tie = await parse(signed(reportPayload("2026-09-17", [values(5)]), { created_at: correction.event.created_at }));
  const expected = correction.event.id < tie.event.id ? 3 : 5;
  assert.equal(sum(selectStats(buildProviders([tie, correction]), completedRange("1d", NOW))), expected);
});

test("disjoint collection epochs retain days and gaps, overlapping epochs never double count", async () => {
  const first = await parse(signed(reportPayload("2026-09-14", [values(2)], { epoch: 1 })));
  const second = await parse(signed(reportPayload("2026-09-16", [values(3)], { epoch: 2 })));
  const providers = buildProviders([first, second]);
  const days = selectProviderDays(providers[0], completedRange("7d", NOW));
  assert.equal(days[3].total_successful, 2);
  assert.equal(days[4].coverage, "missing");
  assert.equal(days[5].total_successful, 3);
  const overlap = await parse(signed(reportPayload("2026-09-14", [values(7)], { epoch: 3 })));
  const selected = selectStats(buildProviders([first, second, overlap]), completedRange("7d", NOW));
  assert.equal(sum(selected), 3);
  assert.equal(selected.metrics[3].coverage, "missing");
});

test("invalid signatures and signed coordinate mismatches cannot enter the data", async () => {
  assert.equal(await parseStatsEvent({ ...fixture, content: fixture.content.replace('"epoch":3', '"epoch":4') }, NOW), null);
  const payload = reportPayload("2026-09-17", [values(1)]);
  const good = signed(payload);
  for (const tags of [
    [...good.tags, ["d", good.tags[0][1]]],
    [good.tags[0], ["a", `38421:${"0".repeat(64)}:provider`], good.tags[2]],
    [["d", good.tags[0][1].replace("epoch:0", "epoch:1")], good.tags[1], good.tags[2]],
    [good.tags[0], good.tags[1], ["w", "2026-09-07"]],
  ]) assert.equal(await parseStatsEvent(signed(payload, { tags }), NOW), null);
});

test("invalid coverage, unsafe counters, missing partitions and wrong layouts are rejected", async () => {
  const modifications = [
    (p) => { p.days["2026-09-17"][0] = -1; },
    (p) => { p.days["2026-09-17"][5] = Number.MAX_SAFE_INTEGER + 1; },
    (p) => { p.days["2026-09-17"][0] = 0.5; },
    (p) => { p.days["2026-09-17"].push(0); },
    (p) => { p.daily_models["2026-09-17"]["model/one"][5] = 12; },
    (p) => { delete p.daily_models["2026-09-17"]._other; },
    (p) => { delete p.daily_models["2026-09-17"]; },
    (p) => { p.days["2026-09-16"] = zero(); },
    (p) => { p.through = "2026-09-18"; },
    (p) => { p.coverage_start = "2026-02-30"; },
    (p) => { p.columns[0] = "different"; },
    (p) => { p.columns[0] = [p.columns[0]]; },
    // A six-wide list cannot borrow a pre-release name to look familiar.
    (p) => { p.columns = [...V2_COLUMNS.slice(0, 5), "measured_token_requests"]; },
  ];
  for (const modify of modifications) {
    const payload = reportPayload("2026-09-17", [values(1)]);
    modify(payload);
    assert.equal(await parseStatsEvent(signed(payload), NOW), null);
  }
});

test("a signed report larger than any producer frame is dropped, while that size stays valid for legacy", async () => {
  const payload = reportPayload("2026-09-14", [values(1)]);
  const day = payload.daily_models["2026-09-14"];
  for (let i = 0; i < 6000; i++) day[`padding/model-${i}`] = zero();
  assert.ok(JSON.stringify(payload).length > 96 * 1024);
  assert.equal(await parseStatsEvent(signed(payload), NOW), null);
  // The limit is bytes of the whole frame: short text can still be too large.
  const unicode = reportPayload("2026-09-14", [values(1)]);
  for (let i = 0; i < 500; i++) unicode.daily_models["2026-09-14"][`模型/${"名".repeat(60)}${i}`] = zero();
  assert.ok(JSON.stringify(unicode).length < 96 * 1024);
  assert.equal(await parseStatsEvent(signed(unicode), NOW), null);
  const padded = legacy([metric("2026-09-17")]);
  const big = finalizeEvent({ kind: 38422, created_at: padded.created_at, tags: padded.tags,
    content: JSON.stringify({ ...JSON.parse(padded.content), padding: "x".repeat(96 * 1024) }) }, KEY);
  assert.ok(await parseStatsEvent(big, NOW));
});

test("model names cannot mutate dictionary prototypes", async () => {
  const payload = reportPayload("2026-09-17", [values(1)], { model: "__proto__" });
  const selected = selectStats(buildProviders([await parse(signed(payload))]), completedRange("1d", NOW));
  assert.equal(Object.getPrototypeOf(selected.metrics[0].model_counts), Object.prototype);
  assert.equal(Object.getOwnPropertyDescriptor(selected.metrics[0].model_counts, "__proto__").value, 1);
  assert.equal(selected.metrics[0].total_successful, 1);
});

test("a seven day selection crossing report weeks sums daily rows, never the whole week", async () => {
  const first = await parse(signed(reportPayload("2026-09-07", Array.from({ length: 7 }, (_, index) => values(index + 1)), { model: "old/week" })));
  const second = await parse(signed(reportPayload("2026-09-14", Array.from({ length: 4 }, (_, index) => values(index + 8)), { model: "new/week" })));
  const selection = selectStats(buildProviders([first, second]), completedRange("7d", NOW));
  assert.equal(sum(selection), 56);
  assert.equal(selection.metrics[0].timestamp, "2026-09-11T00:00:00Z");
  assert.equal(selection.metrics.at(-1).timestamp, "2026-09-17T00:00:00Z");
  assert.equal(selection.metrics.reduce((n, d) => n + (d.model_counts["old/week"] ?? 0), 0), 18);
  assert.equal(selection.metrics.reduce((n, d) => n + (d.model_counts["new/week"] ?? 0), 0), 38);
  assert.equal(selection.completeProviderDays, 7);
});

test("legacy timestamps without a timezone are UTC, independent of the browser timezone", async () => {
  const row = metric("2026-09-17");
  row.timestamp = "2026-09-17T00:00:00";
  const parsed = await parse(legacy([row]));
  const selection = selectStats(buildProviders([parsed]), completedRange("1d", NOW));
  assert.equal(sum(selection), 8);
  assert.equal(selection.metrics[0].timestamp, "2026-09-17T00:00:00Z");
});


function averageCard(context) {
  const source = readFileSync(new URL("../app/stats/page.tsx", import.meta.url), "utf8");
  const file = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = [];
  let display;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ["avgTokensPerRequest", "avgTokensEmptyLabel"].includes(node.name.getText(file))) {
      declarations.push(`const ${node.name.getText(file)} = ${node.initializer.getText(file)};`);
    }
    if (ts.isJsxExpression(node) && node.expression?.getText(file).startsWith("avgTokensPerRequest === null")) display = node.expression.getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.ok(display, "evaluate the actual token average card expression");
  return vm.runInNewContext(`${declarations.join("\n")}\n(${display})`, {
    formatCompactNumber: String, ...context,
  });
}

test("cache read and creation tokens are included in total, named model and Other totals", async () => {
  // [requests, input, output, cacheRead, cacheCreation, revenue]
  const named = [1, 60, 40, 30, 20, 0];
  const other = [1, 0, 10, 3, 2, 0];
  const total = named.map((value, index) => value + other[index]);
  const payload = reportPayload("2026-09-17", [total]);
  payload.daily_models["2026-09-17"] = { "model/cached": named, _other: other };
  const selected = selectStats(buildProviders([await parse(signed(payload))]), completedRange("1d", NOW));
  assert.equal(sum(selected, "total_tokens"), 165);
  assert.equal(selected.metrics[0].model_tokens["model/cached"], 150);
  assert.equal(selected.metrics[0].others_tokens, 15);
});

test("token totals aggregate across days and providers, and legacy days still count", async () => {
  const first = await parse(signed(reportPayload("2026-09-16", [values(1, { tokens: 40 }), values(3, { tokens: 100 })])));
  const second = await parse(signed(reportPayload("2026-09-17", [values(2, { tokens: 120 })]), { node: "second" }));
  const older = await parse(legacy([metric("2026-09-17", 10)], { node: "legacy-only" }));
  const selection = selectStats(buildProviders([first, second, older]), completedRange("7d", NOW));
  assert.equal(sum(selection), 16);
  assert.equal(sum(selection, "total_tokens"), 260);
  assert.equal(averageCard({ requests: 16, tokens: 260 }), String(260 / 16));
  const yesterday = selectStats(buildProviders([first, second, older]), completedRange("1d", NOW));
  assert.equal(sum(yesterday), 15);
  assert.equal(sum(yesterday, "total_tokens"), 220);
});

test("token average reports reported tokens per completed request, and degrades without data", () => {
  assert.equal(averageCard({ requests: 3, tokens: 60 }), String(20));
  assert.equal(averageCard({ requests: 1, tokens: 0 }), String(0));
  assert.equal(averageCard({ requests: 0, tokens: 0 }), "No requests");
  assert.equal(averageCard({ requests: null, tokens: null }), "No data");
});

test("legacy-only history keeps totals and models while modern days take precedence without duplication", async () => {
  const olderRow = { ...metric("2026-09-16", 8), total_tokens: 80, total_revenue_msats: 1250,
    model_tokens: { "model/one": 80 }, model_revenue_msats: { "model/one": 1250 } };
  const old = await parse(legacy([olderRow, metric("2026-09-17", 12)]));
  const legacyOnly = selectStats(buildProviders([old]), completedRange("7d", NOW));
  assert.equal(legacyOnly.hasData, true);
  assert.equal(sum(legacyOnly), 20);
  assert.equal(sum(legacyOnly, "total_tokens"), 80);
  assert.equal(sum(legacyOnly, "total_revenue_msats"), 1250);
  assert.equal(sum(legacyOnly, "total_tokens"), 80);
  assert.equal(legacyOnly.metrics[5].model_counts["model/one"], 8);
  assert.equal(legacyOnly.metrics[5].model_tokens["model/one"], 80);
  const modern = await parse(signed(reportPayload("2026-09-17", [values(2, { tokens: 100 })])));
  const mixed = selectStats(buildProviders([old, modern]), completedRange("7d", NOW));
  assert.equal(sum(mixed), 10);
  assert.equal(sum(mixed, "total_tokens"), 180);
  assert.equal(mixed.metrics[5].legacy, true);
  assert.equal(mixed.metrics[6].legacy, false);
});

test("daily model partitions must sum to their day vector", async () => {
  const modifyDay = (payload, index, value) => { payload.days["2026-09-17"][index] = value; };
  const modifyModel = (payload, index, value) => { payload.daily_models["2026-09-17"]["model/one"][index] = value; };
  const modifications = [
    (p) => modifyDay(p, 0, 2),
    (p) => modifyDay(p, 1, 101),
    (p) => modifyModel(p, 1, 99),
    (p) => modifyModel(p, 5, 99),
    (p) => { modifyModel(p, 0, 0); },
  ];
  await parse(signed(reportPayload("2026-09-17", [values(1, { tokens: 100 })])));
  for (const modify of modifications) {
    const payload = reportPayload("2026-09-17", [values(1, { tokens: 100 })]);
    modify(payload);
    assert.equal(await parseStatsEvent(signed(payload), NOW), null);
  }
});
