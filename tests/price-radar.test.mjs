import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRadar,
  indexListPrices,
  isApproved,
  latestReviewLabels,
  parseModelIdMappings,
  requestCost,
  summarizeNode,
} from "../lib/price-radar.ts";

// Opus list price per token: $5/M in, $25/M out, $0.50/M cache read.
const LIST = { prompt: 5e-6, completion: 25e-6, input_cache_read: 5e-7 };

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("a warm request is 10k fresh, 90k cached and 2k out", () => {
  close(requestCost(LIST), 0.05 + 0.045 + 0.05);
});

test("a cache rate that is missing or 0 bills at the prompt rate", () => {
  close(requestCost({ ...LIST, input_cache_read: undefined }), 0.55);
  close(requestCost({ ...LIST, input_cache_read: 0 }), 0.55);
});

test("a route without a usable prompt or completion rate has no price", () => {
  assert.equal(requestCost({ prompt: NaN, completion: 1 }), null);
  assert.equal(requestCost({ prompt: 1, completion: -1 }), null);
  assert.equal(requestCost(null), null);
});

const review = (id, created_at, label, ...nodes) => ({
  id,
  created_at,
  tags: [["t", label], ...nodes.map((node) => ["node", node])],
});

test("a node's newest review decides, and one blocked key blocks the URL", () => {
  const labels = latestReviewLabels([
    review("a", 100, "lgtm", "good", "flipped"),
    review("b", 200, "avoid", "flipped"),
    review("c", 100, "sandbox", "sandboxed"),
    review("e", 300, "lgtm", "tied"),
    review("d", 300, "removed", "tied"),
  ]);
  assert.equal(isApproved(["good"], labels), true);
  assert.equal(isApproved(["flipped"], labels), false);
  assert.equal(isApproved(["sandboxed"], labels), false);
  assert.equal(isApproved(["unreviewed"], labels), false);
  assert.equal(isApproved(["good", "flipped"], labels), false);
  assert.equal(labels.get("tied"), "lgtm");
});

const node = (url, approved, satsPrompt, usdPrompt = null) => ({
  url,
  name: url,
  approved,
  models: [
    {
      id: "anthropic/claude-opus-5.5",
      sats_pricing: { prompt: satsPrompt, completion: satsPrompt * 5, input_cache_read: satsPrompt / 10 },
      pricing: usdPrompt === null ? null : { prompt: usdPrompt, completion: usdPrompt * 5, input_cache_read: usdPrompt / 10 },
    },
  ],
});

test("apps' pick ranks first: cheapest approved node, ties by URL", () => {
  const [row] = buildRadar(
    [
      node("https://c.example", true, 0.004, 3e-6),
      node("https://cheap-unreviewed.example", false, 0.001),
      node("https://b.example", true, 0.002, 1.5e-6),
      node("https://a.example", true, 0.002, 1.5e-6),
    ],
    { listPrices: new Map([["anthropic/claude-opus-5.5", LIST]]) }
  );
  assert.deepEqual(
    row.entries.map((e) => [e.url, e.rank]),
    [
      ["https://a.example", 1],
      ["https://b.example", 2],
      ["https://c.example", 3],
      ["https://cheap-unreviewed.example", null],
    ]
  );
  assert.equal(row.winner.url, "https://a.example");
  close(row.entries[2].cutToFirstPct, 50);
  assert.equal(row.entries[1].cutToFirstPct, 0);
  close(row.entries[0].multiplier, 0.3);
  assert.equal(row.entries[3].multiplier, null);
});

test("a model no approved node serves has no winner", () => {
  const [row] = buildRadar([node("https://only.example", false, 0.002)]);
  assert.equal(row.winner, null);
  assert.equal(row.entries[0].rank, null);
});

const offer = (id, satsPrompt, extra = {}) => ({
  id,
  sats_pricing: { prompt: satsPrompt, completion: satsPrompt },
  ...extra,
});

test("models group by the id apps request, and each URL counts once", () => {
  const rows = buildRadar(
    [
      { url: "https://a.example", name: "a", approved: true, models: [offer("z-ai-glm-5-3", 1)] },
      { url: "https://a.example", name: "a again", approved: true, models: [offer("glm-5.3", 0.1)] },
      { url: "https://b.example", name: "b", approved: true, models: [offer("glm-5.3", 2)] },
      {
        url: "https://c.example",
        name: "c",
        approved: true,
        models: [offer("glm-5-3-old", 0.5), offer("glm-5.3", 3)],
      },
      { url: "https://d.example", name: "d", approved: true, models: [offer("x", 4, { alias_ids: ["glm-5.3-alias"] })] },
      { url: "https://e.example", name: "e", approved: true, models: [offer("glm-5.3", 0.01, { sats_pricing: null })] },
    ],
    {
      mappings: {
        "z-ai-glm-5-3": "glm-5.3",
        "glm-5-3-old": "glm-5.3",
        "glm-5.3-alias": "glm-5.3",
      },
    }
  );
  assert.deepEqual(rows.map((row) => row.modelId), ["glm-5.3"]);
  assert.deepEqual(
    rows[0].entries.map((e) => [e.url, e.rank]),
    [
      ["https://a.example", 1],
      ["https://b.example", 2],
      ["https://c.example", 3],
      ["https://d.example", 4],
    ]
  );
});

test("list prices match a node's bare model name unless two vendors disagree", () => {
  const prices = indexListPrices([
    { id: "anthropic/claude-opus-5.5", pricing: { prompt: "0.000005", completion: "0.000025" } },
    { id: "a/shared", pricing: { prompt: "1", completion: "1" } },
    { id: "b/shared", pricing: { prompt: "2", completion: "2" } },
    { id: "a/same", pricing: { prompt: "1", completion: "1" } },
    { id: "b/same", pricing: { prompt: "1", completion: "1" } },
  ]);
  assert.equal(prices.get("claude-opus-5.5").prompt, 5e-6);
  assert.equal(prices.get("shared"), undefined);
  assert.equal(prices.get("same").prompt, 1);
});

test("a mapping snapshot apps would reject is ignored", () => {
  assert.deepEqual(parseModelIdMappings('{"mappings":{"a-1":"a1"}}'), { "a-1": "a1" });
  assert.equal(parseModelIdMappings('{"mappings":{"a":"b","b":"c"}}'), null);
  assert.equal(parseModelIdMappings('{"mappings":{"a":"a"}}'), null);
  assert.equal(parseModelIdMappings('{"mappings":[]}'), null);
  assert.equal(parseModelIdMappings("not json"), null);
});

const ranked = (url, rank, cutToFirstPct) => ({
  url,
  name: url,
  approved: rank !== null,
  sats: 1,
  multiplier: null,
  rank,
  cutToFirstPct,
});
const rowOf = (...entries) => ({ modelId: "m", winner: null, entries });

test("a node's summary counts its models, firsts and close calls", () => {
  const me = "https://me.example";
  const rows = [
    rowOf(ranked(me, 1, 0)),
    rowOf(ranked("x", 1, 0), ranked(me, 2, 0)),
    rowOf(ranked("x", 1, 0), ranked(me, 2, 4)),
    rowOf(ranked("x", 1, 0), ranked(me, 3, 30)),
    rowOf(ranked("x", 1, 0)),
  ];
  assert.deepEqual(summarizeNode(rows, me), { models: 4, first: 1, close: 2 });
  assert.deepEqual(summarizeNode([rowOf(ranked(me, null, null))], me), {
    models: 1,
    first: 0,
    close: 0,
  });
});
