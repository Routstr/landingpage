"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import { fetchModels, Provider } from "@/app/data/models";
import { Input } from "@/components/ui/input";

function parseVersionParts(version: string | null | undefined): number[] {
  if (!version) return [0, 0, 0];
  const normalized = version.trim().replace(/^v/i, "");
  const segments = normalized
    .split(/[^\d]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((segment) => Number.parseInt(segment, 10))
    .filter((value) => Number.isFinite(value));

  while (segments.length < 3) {
    segments.push(0);
  }
  return segments;
}

function compareVersionsDesc(
  aVersion: string | null | undefined,
  bVersion: string | null | undefined
): number {
  const aParts = parseVersionParts(aVersion);
  const bParts = parseVersionParts(bVersion);
  for (let i = 0; i < 3; i += 1) {
    if (aParts[i] !== bParts[i]) {
      return bParts[i] - aParts[i];
    }
  }
  return 0;
}

export default function ProvidersPage() {
  const [items, setItems] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      setItems([]);

      await fetchModels((provider) => {
        if (!active) return;
        setItems((prev) => [...prev, provider]);
      });

      if (!active) return;
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [] as Provider[];
    return [...items].sort((a, b) => {
      const versionComparison = compareVersionsDesc(a.version, b.version);
      if (versionComparison !== 0) {
        return versionComparison;
      }
      const modelCountComparison =
        (b.supported_models?.length || 0) - (a.supported_models?.length || 0);
      if (modelCountComparison !== 0) {
        return modelCountComparison;
      }
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return sortedItems;
    const lowerSearch = searchTerm.toLowerCase();
    return sortedItems.filter((item) =>
      item.name?.toLowerCase().includes(lowerSearch) ||
      item.pubkey?.toLowerCase().includes(lowerSearch) ||
      item.description?.toLowerCase().includes(lowerSearch)
    );
  }, [sortedItems, searchTerm]);

  return (
    <SiteShell contentClassName="py-12 md:py-20">
      <PageContainer>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-4 tracking-tight">Providers</h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl font-light leading-relaxed">
                Explore the {items.length} hardware providers powering the decentralized Routstr marketplace.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-12">
            <Input
              type="text"
              placeholder="Search providers..."
              className="h-10 max-w-md border-border bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <div className="grid grid-cols-12 gap-4 py-3 border-b border-border bg-card/50 px-4 text-[10px] font-bold text-muted-foreground">
              <div className="col-span-8 md:col-span-8">Provider Name</div>
              <div className="hidden md:block col-span-2">Models</div>
              <div className="hidden md:block col-span-2">Version</div>
            </div>

            {isLoading && items.length === 0 ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 py-6 border-b border-border/30 px-4 animate-pulse">
                  <div className="col-span-8 md:col-span-8 h-4 bg-border rounded w-3/4" />
                  <div className="hidden md:block col-span-2 h-3 bg-border rounded w-1/2" />
                  <div className="hidden md:block col-span-2 h-3 bg-border rounded w-1/3" />
                </div>
              ))
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm font-mono">
                No providers found.
              </div>
            ) : (
              filteredItems.map((provider) => {
                const modelCount = provider.supported_models?.length || 0;
                return (
                  <Link
                    key={provider.id}
                    href={`/providers/${encodeURIComponent(provider.id)}`}
                    className="grid grid-cols-12 gap-4 py-6 border-b border-border/30 px-4 hover:bg-card transition-colors group items-center"
                  >
                    <div className="col-span-8 md:col-span-8 flex flex-col justify-center min-w-0">
                      <span className="font-bold text-sm text-white group-hover:underline decoration-muted-foreground underline-offset-4 truncate block">
                        {provider.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {provider.description || "Decentralized AI provider node."}
                      </span>
                    </div>
                    <div className="hidden md:flex col-span-2 text-xs text-muted-foreground">
                      {modelCount} {modelCount === 1 ? "model" : "models"}
                    </div>
                    <div className="hidden md:flex col-span-2 text-xs text-muted-foreground">
                      {provider.version ? `v${provider.version}` : "—"}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
      </PageContainer>
    </SiteShell>
  );
}
