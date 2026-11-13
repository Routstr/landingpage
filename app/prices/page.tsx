"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import { fetchModels, type Model, type Provider } from "@/app/data/models";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  fetchListPrices,
  fetchModelIdMappings,
  fetchReviewLabels,
} from "@/lib/api/price-sources";
import {
  buildRadar,
  CLOSE_CUT_PCT,
  isApproved,
  standing,
  summarizeNode,
  type ModelIdMappings,
  type RadarEntry,
  type RadarNode,
  type TokenRates,
} from "@/lib/price-radar";

const MY_NODE_KEY = "routstr:prices:node";

type LoadedNode = { provider: Provider; models: Model[] };

const normalizeUrl = (url: string) =>
  url.trim().replace(/\/+$/, "").toLowerCase();

function formatSats(value: number): string {
  if (value >= 100) return Math.round(value).toLocaleString("en-US");
  return value.toFixed(value >= 10 ? 1 : 2);
}

function formatGap(entry: RadarEntry | undefined): string {
  if (!entry || entry.rank === null || entry.cutToFirstPct === null) return "—";
  if (entry.rank === 1) return "first";
  const pct = entry.cutToFirstPct;
  if (pct === 0) return "tie";
  return `−${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

function VsList({ multiplier }: { multiplier: number | null }) {
  if (multiplier === null) return <span className="text-muted-foreground">—</span>;
  const pct = Math.round((multiplier - 1) * 100);
  return <>{pct < 0 ? `−${-pct}` : pct > 0 ? `+${pct}` : "0"}%</>;
}

function writeUrl(node: string, query: string) {
  const url = new URL(window.location.href);
  for (const [key, value] of [
    ["node", node],
    ["q", query.trim()],
  ] as const) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, "", url);
}

export default function PricesPage() {
  const [nodes, setNodes] = useState<LoadedNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [labels, setLabels] = useState<Map<string, string> | null>(null);
  const [mappings, setMappings] = useState<ModelIdMappings | null>(null);
  const [listPrices, setListPrices] = useState<Map<string, TokenRates>>(
    () => new Map()
  );
  const [search, setSearch] = useState("");
  const [myNode, setMyNode] = useState("");
  const [openModel, setOpenModel] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "first" | "behind" | "close">("all");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("q") ?? "");
    try {
      setMyNode(params.get("node") ?? localStorage.getItem(MY_NODE_KEY) ?? "");
    } catch {
      // storage blocked: start with no node picked
    }
    void fetchReviewLabels().then((found) => active && setLabels(found));
    void fetchModelIdMappings().then((found) => active && setMappings(found));
    void fetchListPrices().then((found) => active && setListPrices(found));
    void fetchModels((provider, models) => {
      if (!active) return;
      setNodes((prev) => [
        ...prev.filter((node) => node.provider.pubkey !== provider.pubkey),
        { provider, models },
      ]);
    }).finally(() => active && setLoadingNodes(false));
    return () => {
      active = false;
    };
  }, []);

  function pickNode(url: string) {
    setMyNode(url);
    setView("all");
    writeUrl(url, search);
    try {
      localStorage.setItem(MY_NODE_KEY, url);
    } catch {
      // storage blocked: the pick lasts for this visit
    }
  }

  const radarNodes = useMemo(() => {
    if (!labels) return [];
    const keysByUrl = new Map<string, Set<string>>();
    for (const { provider } of nodes) {
      for (const url of [provider.endpoint_url, ...provider.endpoint_urls]) {
        const keys = keysByUrl.get(normalizeUrl(url)) ?? new Set<string>();
        keys.add(provider.pubkey);
        keysByUrl.set(normalizeUrl(url), keys);
      }
    }
    // Several keys can announce one URL; it is one node, named by the newest.
    const byUrl = new Map<string, RadarNode>();
    const newestFirst = [...nodes].sort(
      (a, b) => b.provider.created_at - a.provider.created_at
    );
    for (const { provider, models } of newestFirst) {
      const url = normalizeUrl(provider.endpoint_url);
      if (models.length === 0 || byUrl.has(url)) continue;
      byUrl.set(url, {
        url: provider.endpoint_url,
        name: provider.name || provider.endpoint_url,
        approved: isApproved(keysByUrl.get(url) ?? [], labels),
        models: models.map((model) =>
          model.sats_unpriced ? { ...model, sats_pricing: null } : model
        ),
      });
    }
    return Array.from(byUrl.values())
      .sort(
        (a, b) =>
          Number(b.approved) - Number(a.approved) ||
          a.name.localeCompare(b.name)
      );
  }, [nodes, labels]);

  const picked = radarNodes.some((node) => node.url === myNode) ? myNode : "";

  const rows = useMemo(
    () => buildRadar(radarNodes, { listPrices, mappings: mappings ?? {} }),
    [radarNodes, listPrices, mappings]
  );

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const approvedCount = (entries: readonly RadarEntry[]) =>
      entries.filter((entry) => entry.approved).length;
    return rows
      .filter((row) => !term || row.modelId.toLowerCase().includes(term))
      .filter((row) => {
        if (!picked) return true;
        const mine = row.entries.find((e) => e.url === picked);
        if (!mine) return false;
        const place = standing(mine);
        return (
          view === "all" ||
          (view === "behind" ? place !== "first" : place === view)
        );
      })
      .sort(
        (a, b) =>
          approvedCount(b.entries) - approvedCount(a.entries) ||
          a.modelId.localeCompare(b.modelId)
      );
  }, [rows, search, picked, view]);

  const summary = useMemo(
    () => (picked ? summarizeNode(rows, picked) : null),
    [rows, picked]
  );

  const approvedNodes = radarNodes.filter((node) => node.approved).length;
  const loading = !labels || !mappings || (loadingNodes && rows.length === 0);
  const lastColumn = picked ? "Your rank" : "Nodes";

  return (
    <SiteShell>
      <section className="py-12 md:py-20">
        <PageContainer>
          <div className="mb-10 text-left">
            <h1 className="mb-4 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
              Node prices
            </h1>
            <p className="max-w-2xl text-base font-light leading-relaxed text-muted-foreground md:text-lg">
              Apps send each request to the cheapest approved node.
            </p>
          </div>

          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              type="text"
              placeholder="Search models..."
              className="h-10 max-w-md border-border bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                writeUrl(myNode, e.target.value);
              }}
            />
            <select
              aria-label="Your node"
              className="h-10 max-w-md border border-border bg-background px-3 font-mono text-sm text-foreground"
              value={picked}
              onChange={(e) => pickNode(e.target.value)}
            >
              <option value="">All nodes</option>
              {radarNodes.map((node) => (
                <option key={node.url} value={node.url}>
                  {node.name}
                  {node.approved ? "" : " (not approved)"}
                </option>
              ))}
            </select>
            {!loading && (
              <span className="font-mono text-xs text-muted-foreground md:ml-auto">
                {approvedNodes} approved nodes · {visibleRows.length} models
              </span>
            )}
          </div>

          {summary && !loading && (
            <div
              role="group"
              aria-label="Filter by rank"
              className="mb-6 grid grid-cols-4 border-y border-border"
            >
              {(
                [
                  ["all", "Models", summary.models],
                  ["first", "#1 on", summary.first],
                  ["behind", "Not first", summary.models - summary.first],
                  ["close", `Close ≤${CLOSE_CUT_PCT}%`, summary.close],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={view === key}
                  onClick={() => setView(key)}
                  className={`px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:px-4 ${view === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent/60"}`}
                >
                  <span className="block font-mono text-lg">{count}</span>
                  <span className="block text-[10px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col">
            <div className="grid grid-cols-12 gap-4 border-b border-border bg-card/50 px-4 py-3 text-[10px] font-bold text-muted-foreground">
              <div className="col-span-6 md:col-span-4">Model</div>
              <div className="hidden md:block md:col-span-3">Cheapest approved</div>
              <div className="col-span-3 flex items-center justify-end gap-1.5 md:col-span-2">
                Sats / request
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="How is the price worked out?"
                      className="text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-72 max-w-[calc(100vw-2rem)] space-y-2 text-xs font-normal text-muted-foreground"
                  >
                    <p>
                      One request: 100K prompt tokens, 90% read from cache, and
                      2K output. Apps rank nodes on this request.
                    </p>
                    <p>vs OpenRouter: the node&apos;s USD price for this request against OpenRouter&apos;s.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="hidden text-right md:block md:col-span-1">vs OpenRouter</div>
              <div className="col-span-3 text-right md:col-span-2">{lastColumn}</div>
            </div>

            {loading ? (
              [...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="grid animate-pulse grid-cols-12 gap-4 border-b border-border/30 px-4 py-5"
                >
                  <div className="col-span-6 h-4 w-3/4 rounded bg-border md:col-span-4" />
                  <div className="hidden h-3 w-1/2 rounded bg-border md:col-span-3 md:block" />
                  <div className="col-span-3 h-3 rounded bg-border md:col-span-2" />
                </div>
              ))
            ) : visibleRows.length === 0 ? (
              <div className="py-12 text-center font-mono text-sm text-muted-foreground">
                No models found.
              </div>
            ) : (
              visibleRows.map((row) => {
                const mine = row.entries.find((entry) => entry.url === picked);
                const shown = mine && picked ? mine : row.winner;
                const isOpen = openModel === row.modelId;
                const dearest = Math.max(0, ...row.entries.map((e) => e.sats));
                return (
                  <Fragment key={row.modelId}>
                    <button
                      type="button"
                      onClick={() => setOpenModel(isOpen ? null : row.modelId)}
                      aria-expanded={isOpen}
                      className="group grid grid-cols-12 items-center gap-4 border-b border-border/30 px-4 py-4 text-left transition-colors hover:bg-card"
                    >
                      <span className="col-span-6 flex min-w-0 items-center gap-2 md:col-span-4">
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                        <span className="min-w-0 break-words font-mono text-sm text-foreground md:truncate">
                          {row.modelId.split("/").map((part, i) => (
                            <Fragment key={i}>
                              {i > 0 && <>/<wbr /></>}
                              {part}
                            </Fragment>
                          ))}
                        </span>
                      </span>
                      <span className="hidden truncate text-xs text-muted-foreground md:col-span-3 md:block">
                        {row.winner?.name ?? "—"}
                      </span>
                      <span className="col-span-3 text-right font-mono text-sm text-foreground md:col-span-2">
                        {shown ? formatSats(shown.sats) : "—"}
                      </span>
                      <span className="hidden text-right font-mono text-xs text-muted-foreground md:col-span-1 md:block">
                        <VsList multiplier={shown?.multiplier ?? null} />
                      </span>
                      <span className="col-span-3 text-right font-mono text-xs text-muted-foreground md:col-span-2">
                        {picked
                          ? mine?.rank
                            ? `#${mine.rank} · ${formatGap(mine)}`
                            : "—"
                          : row.entries.filter((e) => e.approved).length}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-b border-border/30 bg-card/40 px-4 py-2">
                        {row.entries.map((entry) => (
                          <div
                            key={entry.url}
                            className={`grid grid-cols-12 gap-4 py-2 text-xs ${entry.approved ? "text-foreground" : "text-muted-foreground"} ${entry.url === picked ? "font-bold" : ""}`}
                          >
                            <span className="col-span-6 flex min-w-0 items-center gap-3 md:col-span-7">
                              <span className="w-6 shrink-0 font-mono text-muted-foreground">
                                {entry.rank ?? "—"}
                              </span>
                              <span className="min-w-0 truncate md:w-56 md:shrink-0">
                                {entry.name}
                                {entry.approved ? "" : " · not approved"}
                              </span>
                              <span aria-hidden="true" className="relative hidden h-1 flex-1 bg-border/60 md:block">
                                <span
                                  className={`absolute inset-y-0 left-0 ${entry.url === picked ? "bg-brand" : "bg-muted-foreground/40"}`}
                                  style={{ width: `${dearest > 0 ? (entry.sats / dearest) * 100 : 0}%` }}
                                />
                              </span>
                            </span>
                            <span className="col-span-3 text-right font-mono md:col-span-2">
                              {formatSats(entry.sats)}
                            </span>
                            <span className="hidden text-right font-mono md:col-span-1 md:block">
                              <VsList multiplier={entry.multiplier} />
                            </span>
                            <span className="col-span-3 text-right font-mono md:col-span-2">
                              {formatGap(entry)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Fragment>
                );
              })
            )}
          </div>
        </PageContainer>
      </section>
    </SiteShell>
  );
}
