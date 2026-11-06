import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { finalizeEvent } from "nostr-tools";
import { Subscription } from "nostr-tools/abstract-relay";
import { DAY_MS, buildProviders, completedRange, parseStatsEvent, reportWins, selectStats } from "../lib/stats-reports.ts";

const NOW = Date.parse("2026-09-18T12:30:00Z");
const source = readFileSync(new URL("../app/stats/page.tsx", import.meta.url), "utf8");
const file = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["fetchStatsSnapshots", "createAbortError", "normalizeRelayUrl", "createInitialRelayStatuses", "readStatsCache", "updateStatsCache", "mergeCachedCoords", "retainFreshCachedCoords", "isRecord"]);
const functions = file.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name && names.has(node.name.text));
assert.equal(functions.length, names.size);
const code = ts.transpileModule(functions.map((node) => node.getText(file)).join("\n") + "\nexports.fetch = fetchStatsSnapshots; exports.readCache = readStatsCache; exports.writeCache = updateStatsCache;", {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const fixture = JSON.parse(readFileSync(new URL("./fixtures/analytics-v2-daily.json", import.meta.url)));

function harness(onSubscribe, { relays = ["wss://test.invalid"], sdkSubscriptions = false, timeScale = 1 } = {}) {
  const filters = [];
  let closed = 0;
  let subscriptionsClosed = 0;
  const pool = {
    subscribeMany(relays, filter, callbacks) {
      filters.push(filter);
      const index = filters.length - 1;
      let subscription;
      const close = () => { subscriptionsClosed++; subscription?.close(); };
      let deliveredCallbacks = callbacks;
      if (sdkSubscriptions) {
        const relay = { baseEoseTimeout: 4400 / timeScale, send() {}, connected: true, openSubs: new Map(), ongoingOperations: 1 };
        subscription = new Subscription(relay, `test-${index}`, [filter], {
          ...callbacks, eoseTimeout: callbacks.maxWait ? callbacks.maxWait / timeScale : undefined,
          onclose(reason) { callbacks.oneose(); callbacks.onclose([reason]); },
        });
        subscription.fire();
        deliveredCallbacks = { ...callbacks, oneose: () => subscription.receivedEose(), onclose: (reasons) => subscription.close(reasons[0]) };
      }
      setImmediate(() => onSubscribe?.({ relays, filter, callbacks: deliveredCallbacks, index }));
      return { close };
    },
    close() { closed++; },
  };
  class FixedDate extends Date { static now() { return NOW; } }
  const storage = new Map();
  const browser = { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }, navigator: { locks: { request: (_key, callback) => callback() } } };
  const context = {
    exports: {}, RELAYS: relays, ANALYTICS_KIND: 38422,
    DAY_MS, completedRange: (window) => completedRange(window, NOW),
    parseStatsEvent: (event) => parseStatsEvent(event, NOW), reportWins,
    STATS_CACHE_KEY: "stats_snapshots_cache_v3", LEGACY_STATS_CACHE_KEY: "stats_snapshots_cache_v2", STATS_CACHE_TTL_MS: DAY_MS, window: browser,
    createStatsPool: () => pool, Date: FixedDate, DOMException, URL, setTimeout: (callback, delay) => setTimeout(callback, delay / timeScale), clearTimeout,
  };
  vm.runInNewContext(code, context);
  return { fetch: context.exports.fetch, readCache: context.exports.readCache, writeCache: context.exports.writeCache, storage, browser, filters, get closed() { return closed; }, get subscriptionsClosed() { return subscriptionsClosed; } };
}

// A relay holding `events`, newest first with id ties ascending, that never
// returns more than `cap` of them whatever limit the filter asks for.
function cappedRelay(events, cap) {
  const delivered = new Set();
  const ordered = [...events].sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id));
  const onSubscribe = ({ relays, filter, callbacks, index }) => {
    const limit = typeof cap === "function" ? cap(index) : cap;
    for (const event of ordered.filter((e) => e.created_at >= filter.since && e.created_at <= filter.until).slice(0, limit)) {
      delivered.add(event.id);
      callbacks.receivedEvent({ url: relays[0] }, event.id);
      callbacks.onevent(event);
    }
    callbacks.oneose();
  };
  return { delivered, onSubscribe };
}
const report = (index, created_at) => ({ id: index.toString(16).padStart(64, "0"), created_at });
const T = Math.floor(NOW / 1000) - 3600;

test("an empty relay is asked once for the whole bounded history", async () => {
  const h = harness(({ callbacks }) => callbacks.oneose());
  const result = await h.fetch({});
  assert.equal(JSON.stringify(h.filters), JSON.stringify([{ kinds: [38422],
    since: completedRange("365d", NOW).start / 1000 - 7 * DAY_MS / 1000, until: Math.floor(NOW / 1000), limit: 1000 }]));
  assert.equal(result.historyIncomplete, false);
  assert.equal(h.closed, 1);
  assert.equal(h.subscriptionsClosed, 1);
});

test("a relay capped below the requested limit is paged until its history is complete", async () => {
  const relay = cappedRelay(Array.from({ length: 1400 }, (_, i) => report(i, T - i * 60)), 500);
  const h = harness(relay.onSubscribe);
  const result = await h.fetch({});
  assert.equal(relay.delivered.size, 1400);
  assert.equal(result.historyIncomplete, false);
  assert.equal(h.subscriptionsClosed, h.filters.length);
});

test("reports sharing the second where a page was cut are still retrieved", async () => {
  const events = [0, 1, 2].map((i) => report(i, T)).concat([3, 4, 5].map((i) => report(i, T - 60)), report(6, T - 120), report(7, T - 180));
  const relay = cappedRelay(events, 5);
  const result = await harness(relay.onSubscribe).fetch({});
  assert.equal(relay.delivered.size, 8);
  assert.equal(result.historyIncomplete, false);
});

test("more same-second reports than a relay returns at once leave history partial", async () => {
  const relay = cappedRelay(Array.from({ length: 14 }, (_, i) => report(i, T)), 5);
  const result = await harness(relay.onSubscribe).fetch({});
  assert.equal(relay.delivered.size, 5);
  assert.equal(result.historyIncomplete, true);
});

test("a one-report relay is complete, but a one-at-a-time relay cannot prove a shared second", async () => {
  const single = await harness(cappedRelay([report(0, T)], 1).onSubscribe).fetch({});
  assert.equal(single.historyIncomplete, false);
  const relay = cappedRelay([report(0, T), report(1, T), report(2, T - 60)], 1);
  const result = await harness(relay.onSubscribe).fetch({});
  assert.equal(relay.delivered.size, 2);
  assert.equal(result.historyIncomplete, true);
});

test("a relay that starts returning fewer reports mid-walk is not mistaken for exhausted history", async () => {
  const relay = cappedRelay(Array.from({ length: 8 }, (_, i) => report(i, T - i * 60)), (index) => (index === 0 ? 5 : 1));
  const result = await harness(relay.onSubscribe).fetch({});
  assert.equal(relay.delivered.size, 8);
  assert.equal(result.historyIncomplete, true);
});

test("a relay that never runs out of new reports stops at the page budget as partial", async () => {
  let next = 0;
  const h = harness(({ relays, filter, callbacks }) => {
    const event = report(next++, filter.until - 1);
    callbacks.receivedEvent({ url: relays[0] }, event.id);
    callbacks.onevent(event);
    callbacks.oneose();
  });
  const result = await h.fetch({});
  assert.equal(h.filters.length, 50);
  assert.equal(result.historyIncomplete, true);
});

test("async signature parsing finishes before a relay page resolves and cached coordinates survive", async () => {
  const report = await parseStatsEvent(fixture, NOW);
  assert.ok(report);
  let delivered = false;
  const h = harness(({ callbacks }) => {
    if (!delivered) {
      delivered = true;
      callbacks.receivedEvent({ url: "wss://test.invalid" }, fixture.id);
      callbacks.onevent(fixture);
    }
    callbacks.oneose();
  });
  const cached = { ...report, coordinate: "cached-coordinate" };
  const result = await h.fetch({ "cached-coordinate": { report: cached, lastObservedAtMs: NOW - 1000 } });
  assert.equal(result.coords[report.coordinate].report.event.id, fixture.id);
  assert.equal(result.coords["cached-coordinate"].report.event.id, fixture.id);
  assert.equal(result.relayStatuses["wss://test.invalid"].state, "done");
});

test("cancellation closes active work and does not start the remaining history", async () => {
  const controller = new AbortController();
  const h = harness(() => controller.abort());
  await assert.rejects(h.fetch({}, controller.signal), { name: "AbortError" });
  assert.equal(h.filters.length, 1);
  assert.equal(h.closed, 1);
  assert.equal(h.subscriptionsClosed, h.filters.length);
});

test("cache reload revalidates signatures, coordinate keys and freshness", async () => {
  const h = harness();
  const report = await parseStatsEvent(fixture, NOW);
  assert.ok(report);
  const valid = { event: fixture, lastObservedAtMs: NOW - 1000 };
  h.storage.set("stats_snapshots_cache_v3", JSON.stringify({ coords: {
    [report.coordinate]: valid,
    forged: { ...valid, event: { ...fixture, sig: "0".repeat(128) } },
    wrongCoordinate: valid,
    expired: { ...valid, lastObservedAtMs: NOW - DAY_MS - 1 },
  } }));
  const cached = await h.readCache();
  assert.deepEqual(Object.keys(cached), [report.coordinate]);
  assert.equal(cached[report.coordinate].report.event.id, fixture.id);
});

test("browser storage failure does not discard signed live reports", async () => {
  const h = harness();
  const report = await parseStatsEvent(fixture, NOW);
  assert.ok(report);
  h.browser.localStorage.setItem = () => { throw new Error("quota exceeded"); };
  const result = await h.writeCache({ [report.coordinate]: { report, lastObservedAtMs: NOW } });
  assert.equal(result[report.coordinate].report.event.id, fixture.id);
});


test("signed legacy and current reports survive cache reload without trusting stale parsed fields", async () => {
  const legacyEvent = finalizeEvent({ kind: 38422, created_at: fixture.created_at, tags: [["d", "older-provider:stats"]],
    content: JSON.stringify({ schema: "routstr.analytics.snapshot.v1", generated_at: fixture.created_at,
      windows: { "30d": { interval_minutes: 1440, window_hours: 720, model_usage_mix: { interval_minutes: 1440, metrics: [{
        timestamp: "2026-09-17T00:00:00Z", total_successful: 7, total_tokens: 70, total_revenue_msats: 1250,
        model_counts: { "older/model": 7 }, model_tokens: { "older/model": 70 }, model_revenue_msats: { "older/model": 1250 },
      }] } } } }),
  }, new Uint8Array(32).fill(23));
  const legacyReport = await parseStatsEvent(legacyEvent, NOW);
  const currentReport = await parseStatsEvent(fixture, NOW);
  assert.ok(legacyReport && currentReport);
  const h = harness();
  const signedEntries = Object.fromEntries([legacyReport, currentReport].map((report) => [report.coordinate, {
    event: report.event, lastObservedAtMs: NOW - 1000,
    report: { ...report, days: [{ total_successful: 99999, total_tokens: 99999, legacy: true }] },
    snapshot: { payload: { total_tokens: 99999 } },
  }]));
  h.storage.set("stats_snapshots_cache_v3", JSON.stringify({ coords: signedEntries }));
  const loaded = await h.readCache();
  assert.deepEqual(Object.keys(loaded).sort(), [legacyReport.coordinate, currentReport.coordinate].sort());
  assert.equal(loaded[legacyReport.coordinate].report.days[0].total_successful, 7);
  assert.equal(loaded[legacyReport.coordinate].report.days[0].total_tokens, 70);
  assert.ok(loaded[currentReport.coordinate].report.days.some((day) => day.total_successful > 0));
  const expected = selectStats(buildProviders([legacyReport, currentReport]), completedRange("7d", NOW));
  const actual = selectStats(buildProviders(Object.values(loaded).map(({ report }) => report)), completedRange("7d", NOW));
  assert.deepEqual(actual, expected);
  await h.writeCache(loaded);
  for (const entry of Object.values(JSON.parse(h.storage.get("stats_snapshots_cache_v3")).coords)) {
    assert.deepEqual(Object.keys(entry).sort(), ["event", "lastObservedAtMs"]);
  }
  const reloaded = await h.readCache();
  assert.equal(reloaded[legacyReport.coordinate].report.days[0].model_counts["older/model"], 7);
  assert.deepEqual(reloaded[currentReport.coordinate].report.days, currentReport.days);
});


test("a signed report after the SDK default timeout is retained until real EOSE", async () => {
  const h = harness(({ callbacks, index }) => {
    if (index !== 0) { callbacks.oneose(); return; }
    // Scale 4.4s / 5.5s / 7s together while using the installed SDK subscription.
    setTimeout(() => {
      callbacks.receivedEvent({ url: "wss://test.invalid" }, fixture.id);
      callbacks.onevent(fixture);
      callbacks.oneose();
    }, 55);
  }, { sdkSubscriptions: true, timeScale: 100 });
  const report = await parseStatsEvent(fixture, NOW);
  const result = await h.fetch({});
  assert.equal(result.coords[report.coordinate]?.report.event.id, fixture.id);
  assert.equal(result.historyIncomplete, false);
  assert.equal(result.relayStatuses["wss://test.invalid"].state, "done");
});

test("a relay without real EOSE reaches the page deadline and marks missing history", async () => {
  const h = harness(() => {}, { sdkSubscriptions: true, timeScale: 100 });
  const result = await h.fetch({});
  assert.equal(result.historyIncomplete, true);
  assert.equal(result.relayStatuses["wss://test.invalid"].state, "timeout");
  assert.equal(h.subscriptionsClosed, h.filters.length);
});

test("a relay failure after a valid report remains partial while other relays finish", async () => {
  const h = harness(({ relays, callbacks, index }) => {
    if (index === 0) {
      callbacks.receivedEvent({ url: relays[0] }, fixture.id);
      callbacks.onevent(fixture);
      callbacks.onclose(["connection closed before EOSE"]);
    } else callbacks.oneose();
  }, { relays: ["wss://failing.invalid", "wss://healthy.invalid"], sdkSubscriptions: true, timeScale: 100 });
  const report = await parseStatsEvent(fixture, NOW);
  const result = await h.fetch({});
  assert.equal(result.coords[report.coordinate]?.report.event.id, fixture.id);
  assert.equal(result.historyIncomplete, true);
  assert.equal(result.relayStatuses["wss://failing.invalid"].state, "error");
  assert.equal(result.relayStatuses["wss://healthy.invalid"].state, "no-data");
});


test("real relay EOSE completes without waiting for the page deadline", async () => {
  const h = harness(({ callbacks }) => callbacks.oneose(), { sdkSubscriptions: true, timeScale: 100 });
  const result = await h.fetch({});
  assert.equal(result.historyIncomplete, false);
  assert.equal(result.relayStatuses["wss://test.invalid"].state, "no-data");
  assert.equal(h.subscriptionsClosed, h.filters.length);
});

test("reports received before a timeout stay usable and newer cached coordinates survive", async () => {
  const newerEvent = finalizeEvent({ ...fixture, created_at: fixture.created_at + 1 }, new Uint8Array(32).fill(17));
  const newer = await parseStatsEvent(newerEvent, NOW);
  assert.ok(newer);
  const h = harness(({ callbacks, index }) => {
    if (index !== 0) { callbacks.oneose(); return; }
    callbacks.receivedEvent({ url: "wss://test.invalid" }, fixture.id);
    callbacks.onevent(fixture);
  }, { sdkSubscriptions: true, timeScale: 100 });
  const result = await h.fetch({ [newer.coordinate]: { report: newer, lastObservedAtMs: NOW - 1000 } });
  assert.equal(result.coords[newer.coordinate].report.event.id, newerEvent.id);
  assert.equal(result.historyIncomplete, true);
  assert.equal(result.relayStatuses["wss://test.invalid"].state, "timeout");
});

test("cancellation closes every active per-relay subscription", async () => {
  const controller = new AbortController();
  const h = harness(({ index }) => { if (index === 0) controller.abort(); }, {
    relays: ["wss://one.invalid", "wss://two.invalid"], sdkSubscriptions: true, timeScale: 100,
  });
  await assert.rejects(h.fetch({}, controller.signal), { name: "AbortError" });
  assert.equal(h.closed, 1);
  assert.equal(h.subscriptionsClosed, h.filters.length);
  assert.equal(h.filters.length, 2);
});

test("a relay that stops answering on a later page keeps its earlier reports as partial", async () => {
  const h = harness(({ callbacks, index }) => {
    if (index !== 0) return;
    callbacks.receivedEvent({ url: "wss://test.invalid" }, fixture.id);
    callbacks.onevent(fixture);
    callbacks.oneose();
  }, { sdkSubscriptions: true, timeScale: 100 });
  const report = await parseStatsEvent(fixture, NOW);
  const result = await h.fetch({});
  assert.equal(h.filters.length, 2);
  assert.equal(result.coords[report.coordinate]?.report.event.id, fixture.id);
  assert.equal(result.historyIncomplete, true);
  assert.equal(result.relayStatuses["wss://test.invalid"].state, "timeout");
});
