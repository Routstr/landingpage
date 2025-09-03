"use client";

import React from "react";
import Link from "next/link";

interface ProviderLocation {
  id: string;
  name: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  type: 'Routstr Node';
  status: 'online' | 'offline' | 'maintenance';
  description: string;
  createdAt: number;
  providerId: string;
  pubkey: string;
  endpoints: { http: string[]; tor: string[] };
  models: string[];
  mint?: string;
  version: string;
}

interface GlobeTooltipProps {
  provider: ProviderLocation | null;
  position: { x: number; y: number } | null;
}

export default function GlobeTooltip({ provider, position }: GlobeTooltipProps) {
  if (!provider || !position) return null;

  const [isVisible, setIsVisible] = React.useState(false);
  React.useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, [provider, position]);

  function truncateMiddle(value: string, max = 28) {
    if (value.length <= max) return value;
    const part = Math.floor((max - 3) / 2);
    return `${value.slice(0, part)}...${value.slice(-part)}`;
  }

  function formatCaps(capString: string) {
    const parts = capString.split(',').map((s) => s.trim());
    const tokens = parts.find((p) => p.startsWith('max_tokens:'))?.split(':')[1];
    const vision = parts.find((p) => p.startsWith('vision:'))?.split(':')[1] === 'true';
    const tools = parts.find((p) => p.startsWith('tools:'))?.split(':')[1] === 'true';
    const tokenLabel = tokens ? `${Math.round(Number(tokens) / 1000)}k` : undefined;
    return [tokenLabel, vision ? 'vision' : undefined, tools ? 'tools' : undefined]
      .filter(Boolean)
      .join(' · ');
  }

  function formatDate(unix?: number) {
    if (!unix) return undefined;
    try {
      return new Date(unix * 1000).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit'
      });
    } catch {
      return undefined;
    }
  }

  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{
        left: position.x + 15,
        top: position.y - 10,
        transform: 'translateY(-50%)',
      }}
    >
      <div className={`max-w-md transition-all duration-200 ease-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div
          className="bg-gradient-to-br from-cyan-400/30 via-purple-500/20 to-fuchsia-400/30 p-px rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="rounded-xl bg-neutral-950/80 backdrop-blur-xl ring-1 ring-white/10 p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-semibold text-sm tracking-tight">{provider.name}</h3>
                {provider.city && provider.country ? (
                  <p className="text-gray-300/90 text-xs">{provider.city}, {provider.country}</p>
                ) : null}
              </div>
              {provider.providerId ? (
                <Link
                  href={`/providers/${encodeURIComponent(provider.providerId)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="shrink-0 inline-flex items-center gap-1 rounded-md bg-white/10 border border-white/15 px-2 py-1 text-[10px] text-white hover:bg-white/15 transition-colors"
                >
                  View
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : null}
            </div>

            <div className="space-y-2 text-xs">
              {provider.createdAt ? (
                <div className="flex justify-between">
                  <span className="text-gray-400/80">Created</span>
                  <span className="text-white/95">{formatDate(provider.createdAt)}</span>
                </div>
              ) : null}
            </div>

            {(provider.providerId || provider.version) && (
              <div className="border-t border-white/10 mt-3 pt-3 text-[11px] flex items-center justify-between gap-3">
                <div className="text-gray-300/90 flex items-center gap-2">
                  <span className="text-gray-400/80">Provider ID</span>
                  {provider.providerId && (
                    <code className="font-mono text-[10px] text-gray-300/90 bg-white/5 px-1.5 py-0.5 rounded">
                      {truncateMiddle(provider.providerId, 32)}
                    </code>
                  )}
                </div>
                {provider.version && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-indigo-300 bg-indigo-400/15 ring-1 ring-indigo-300/25">
                    v{provider.version}
                  </span>
                )}
              </div>
            )}

            {provider.pubkey && (
              <div className="mt-2 text-[11px]">
                <div className="text-gray-400/80 mb-1">Pubkey</div>
                <div className="font-mono text-[10px] text-gray-200 bg-white/5 px-2 py-1 rounded">
                  {truncateMiddle(provider.pubkey, 40)}
                </div>
              </div>
            )}

            {(provider.endpoints.http.length > 0 || provider.endpoints.tor.length > 0) && (
              <div className="mt-2 text-[11px] grid gap-1">
                {provider.endpoints.http.length > 0 ? (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400/80 shrink-0">HTTP</span>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.endpoints.http.slice(0, 3).map((u, i) => (
                        <div key={`http-${i}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 ring-1 ring-white/10">
                          <span className="text-cyan-200 font-mono text-[10px]" title={u}>
                            {truncateMiddle(u, 30)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {provider.endpoints.tor.length > 0 ? (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400/80 shrink-0">Tor</span>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.endpoints.tor.slice(0, 3).map((u, i) => (
                        <span key={`tor-${i}`} className="px-1.5 py-0.5 rounded bg-white/5 text-gray-200/90 font-mono text-[10px]">
                          {truncateMiddle(u, 30)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {provider.models.length > 0 ? (
              <div className="mt-2 text-[11px]">
                <div className="text-gray-400/80 mb-1">Models</div>
                <div className="flex flex-wrap gap-1.5">
                  {provider.models.slice(0, 6).map((m) => (
                    <Link
                      key={m}
                      href={`/models/${encodeURIComponent(m)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="px-1.5 py-0.5 rounded-md bg-white/5 text-gray-100/95 text-[10px] ring-1 ring-white/10 hover:bg-white/10 transition-colors"
                    >
                      <span className="underline/0 hover:underline">{m}</span>
                      {provider.modelCaps?.[m] ? (
                        <span className="ml-1 text-gray-300/70">({formatCaps(provider.modelCaps[m])})</span>
                      ) : null}
                    </Link>
                  ))}
                  {provider.models!.length > 6 ? (
                    <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-gray-300 text-[10px] ring-1 ring-white/10">
                      +{provider.models!.length - 6} more
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {provider.mint && (
              <div className="mt-2 text-[11px]">
                <div className="text-gray-400/80 mb-1">Mint</div>
                <div className="inline-flex items-center gap-1 bg-emerald-400/10 ring-1 ring-emerald-400/20 px-2 py-1 rounded">
                  <span className="font-mono text-[10px] text-emerald-200" title={provider.mint}>
                    {truncateMiddle(provider.mint, 40)}
                  </span>
                </div>
              </div>
            )}

            <div className="border-t border-white/10 mt-3 pt-3">
              <p className="text-gray-300/90 text-[11px] leading-relaxed">
                {provider.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
