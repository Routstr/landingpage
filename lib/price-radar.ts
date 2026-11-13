/**
 * Node price radar: where each node stands on the price apps route by.
 *
 * Apps built on @routstr/sdk send a request to the approved node with the
 * lowest cost for one warm request (`WARM_COST_BASKET`, priced with
 * `estimateCost` in the SDK's client/costEstimate.ts), ties broken by URL.
 * This module applies the same basket, rates and review rule, so the node it
 * ranks first is the node apps pick.
 *
 * Pure: no I/O. The page feeds it announcements, reviews, model lists and
 * list prices.
 */

export interface CostBasket {
  readonly promptTokens: number;
  readonly outputTokens: number;
  /** Share of the prompt read from the upstream cache, 0..1. */
  readonly cacheHitRate: number;
}

/** The SDK's WARM_COST_BASKET: a continuing session, mostly cache reads. */
export const WARM_BASKET: CostBasket = {
  promptTokens: 100_000,
  outputTokens: 2_000,
  cacheHitRate: 0.9,
};

/** Per-token rates as /v1/models publishes them (sats or USD). */
export interface TokenRates {
  readonly prompt?: number | null;
  readonly completion?: number | null;
  readonly input_cache_read?: number | null;
}

const isRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * What one basket costs at these rates, or null when the prompt or completion
 * rate is not a price. A cache-read rate that is missing or 0 bills at the
 * prompt rate, as the node bills it.
 */
export function requestCost(
  rates: TokenRates | null | undefined,
  basket: CostBasket = WARM_BASKET
): number | null {
  if (!rates || !isRate(rates.prompt) || !isRate(rates.completion)) return null;
  const cacheRead =
    isRate(rates.input_cache_read) && rates.input_cache_read > 0
      ? rates.input_cache_read
      : rates.prompt;
  const cachedTokens = basket.promptTokens * basket.cacheHitRate;
  return (
    (basket.promptTokens - cachedTokens) * rates.prompt +
    cachedTokens * cacheRead +
    basket.outputTokens * rates.completion
  );
}

/** Review labels that let apps route to a node by default. */
export const APPROVED_LABELS: ReadonlySet<string> = new Set([
  "trusted",
  "verified",
  "lgtm",
  "lgtm2",
]);

const BLOCKING_LABELS: ReadonlySet<string> = new Set([
  "suspicious",
  "avoid",
  "blacklisted",
  "removed",
]);

export interface ReviewEvent {
  readonly id: string;
  readonly created_at: number;
  readonly tags: readonly (readonly string[])[];
}

/** Newest kind 38425 label per node key (ties go to the larger event id). */
export function latestReviewLabels(
  events: readonly ReviewEvent[]
): Map<string, string> {
  const newest = new Map<string, { event: ReviewEvent; label: string }>();
  for (const event of events) {
    const label = event.tags
      .find((tag) => tag[0] === "t" && tag[1])?.[1]
      ?.toLowerCase();
    if (!label) continue;
    for (const tag of event.tags) {
      if (tag[0] !== "node" || !tag[1]) continue;
      const previous = newest.get(tag[1])?.event;
      if (
        !previous ||
        event.created_at > previous.created_at ||
        (event.created_at === previous.created_at && event.id > previous.id)
      ) {
        newest.set(tag[1], { event, label });
      }
    }
  }
  return new Map(
    Array.from(newest, ([node, { label }]) => [node, label] as const)
  );
}

/**
 * Whether apps route to a URL announced by these keys: one key's newest
 * review approves it and none blocks it.
 */
export function isApproved(
  nodeKeys: Iterable<string>,
  labels: ReadonlyMap<string, string>
): boolean {
  const found = Array.from(nodeKeys, (key) => labels.get(key) ?? "");
  return (
    found.some((label) => APPROVED_LABELS.has(label)) &&
    !found.some((label) => BLOCKING_LABELS.has(label))
  );
}

/** Kind 38426 snapshot: a node's spelling of a model id -> the id apps request. */
export type ModelIdMappings = Readonly<Record<string, string>>;

export interface NodeModel {
  readonly id: string;
  readonly alias_ids?: readonly string[];
  /** Null when the node publishes no sats prices: apps skip the route. */
  readonly sats_pricing?: TokenRates | null;
  readonly pricing?: TokenRates | null;
}

/**
 * The mappings in a kind 38426 event, or null when apps would reject it:
 * not an object, an empty or self mapping, or a chain (a target that is
 * itself mapped).
 */
export function parseModelIdMappings(content: string): ModelIdMappings | null {
  try {
    const mappings: unknown = JSON.parse(content)?.mappings;
    if (!mappings || typeof mappings !== "object" || Array.isArray(mappings)) {
      return null;
    }
    const entries = Object.entries(mappings as Record<string, unknown>);
    const valid = entries.every(
      ([variant, canonical]) =>
        variant.trim() &&
        typeof canonical === "string" &&
        canonical.trim() &&
        variant !== canonical &&
        !Object.prototype.hasOwnProperty.call(mappings, canonical)
    );
    return valid ? (mappings as ModelIdMappings) : null;
  } catch {
    return null;
  }
}

/** The id apps request a node's model by: a mapped id or alias, else its id. */
export function canonicalModelId(
  model: NodeModel,
  mappings: ModelIdMappings
): string {
  for (const id of [model.id, ...(model.alias_ids ?? [])]) {
    if (Object.prototype.hasOwnProperty.call(mappings, id)) return mappings[id];
  }
  return model.id;
}

/**
 * OpenRouter's model list as rates by id. Nodes often drop the vendor prefix
 * (claude-opus-5.5 for anthropic/claude-opus-5.5), so each model is also
 * listed under its bare name unless two vendors price that name differently.
 */
export function indexListPrices(
  models: readonly { id?: unknown; pricing?: Record<string, unknown> | null }[]
): Map<string, TokenRates> {
  const rate = (value: unknown) =>
    value === undefined || value === null || value === "" ? null : Number(value);
  const byId = new Map<string, TokenRates>();
  const byBareName = new Map<string, TokenRates | null>();
  const same = (a: TokenRates, b: TokenRates) =>
    a.prompt === b.prompt &&
    a.completion === b.completion &&
    a.input_cache_read === b.input_cache_read;
  for (const model of models) {
    if (typeof model.id !== "string" || !model.pricing) continue;
    const rates = {
      prompt: rate(model.pricing.prompt),
      completion: rate(model.pricing.completion),
      input_cache_read: rate(model.pricing.input_cache_read),
    };
    byId.set(model.id, rates);
    const bare = model.id.slice(model.id.lastIndexOf("/") + 1);
    if (bare === model.id) continue;
    const seen = byBareName.get(bare);
    byBareName.set(bare, seen === undefined || (seen && same(seen, rates)) ? rates : null);
  }
  byBareName.forEach((rates, bare) => {
    if (rates && !byId.has(bare)) byId.set(bare, rates);
  });
  return byId;
}

export interface RadarNode {
  readonly url: string;
  readonly name: string;
  readonly approved: boolean;
  readonly models: readonly NodeModel[];
}

export interface RadarEntry {
  readonly url: string;
  readonly name: string;
  readonly approved: boolean;
  /** Sats for one basket, the number apps rank on. */
  readonly sats: number;
  /** The node's USD price for the basket over the list price for it. */
  readonly multiplier: number | null;
  /** 1 = apps send this model's requests here. Null when not approved. */
  readonly rank: number | null;
  /** The price cut that ties the first approved node, in percent. */
  readonly cutToFirstPct: number | null;
}

export interface RadarRow {
  readonly modelId: string;
  readonly winner: RadarEntry | null;
  /** Approved nodes in routing order, then the rest by price. */
  readonly entries: readonly RadarEntry[];
}

/**
 * One row per model id apps request, its nodes in the order apps would try
 * them. A URL counts once (the first node given for it). A node listing a
 * model under several spellings is priced on the canonical one, as apps do.
 */
export function buildRadar(
  nodes: readonly RadarNode[],
  {
    listPrices = new Map(),
    mappings = {},
    basket = WARM_BASKET,
  }: {
    listPrices?: ReadonlyMap<string, TokenRates>;
    mappings?: ModelIdMappings;
    basket?: CostBasket;
  } = {}
): RadarRow[] {
  type Offer = { node: RadarNode; sats: number; usd: number | null };
  const offers = new Map<string, Offer[]>();
  const seenUrls = new Set<string>();
  for (const node of nodes) {
    if (seenUrls.has(node.url)) continue;
    seenUrls.add(node.url);
    const byModel = new Map<string, NodeModel>();
    for (const model of node.models) {
      const id = canonicalModelId(model, mappings);
      if (!byModel.has(id) || model.id === id) byModel.set(id, model);
    }
    byModel.forEach((model, id) => {
      const sats = requestCost(model.sats_pricing, basket);
      if (sats === null) return;
      const usd = requestCost(model.pricing, basket);
      const list = offers.get(id) ?? [];
      list.push({ node, sats, usd: usd === 0 && sats > 0 ? null : usd });
      offers.set(id, list);
    });
  }

  const byRoutingOrder = (a: Offer, b: Offer) =>
    Number(b.node.approved) - Number(a.node.approved) ||
    a.sats - b.sats ||
    a.node.url.localeCompare(b.node.url);

  return Array.from(offers)
    .map(([modelId, list]) => {
      const listUsd = requestCost(listPrices.get(modelId), basket);
      const sorted = [...list].sort(byRoutingOrder);
      const best = sorted[0]?.node.approved ? sorted[0].sats : null;
      const entries = sorted.map(({ node, sats, usd }, index) => ({
        url: node.url,
        name: node.name,
        approved: node.approved,
        sats,
        multiplier: usd !== null && listUsd ? usd / listUsd : null,
        rank: node.approved ? index + 1 : null,
        cutToFirstPct:
          node.approved && best !== null
            ? sats === best
              ? 0
              : ((sats - best) / sats) * 100
            : null,
      }));
      return {
        modelId,
        winner: entries[0]?.approved ? entries[0] : null,
        entries,
      };
    })
    .sort((a, b) => a.modelId.localeCompare(b.modelId));
}

/** A node within this cut of first counts as close. */
export const CLOSE_CUT_PCT = 5;

export type Standing = "first" | "close" | "behind" | "unranked";

export function standing(entry: RadarEntry): Standing {
  if (entry.rank === null || entry.cutToFirstPct === null) return "unranked";
  if (entry.rank === 1) return "first";
  return entry.cutToFirstPct <= CLOSE_CUT_PCT ? "close" : "behind";
}

export interface NodeSummary {
  readonly models: number;
  readonly first: number;
  readonly close: number;
}

export function summarizeNode(
  rows: readonly RadarRow[],
  url: string
): NodeSummary {
  let models = 0;
  let first = 0;
  let close = 0;
  for (const row of rows) {
    const entry = row.entries.find((e) => e.url === url);
    if (!entry) continue;
    models += 1;
    const place = standing(entry);
    if (place === "first") first += 1;
    if (place === "close") close += 1;
  }
  return { models, first, close };
}
