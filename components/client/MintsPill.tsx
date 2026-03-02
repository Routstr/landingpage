'use client';

import { useMemo, useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Copy } from 'lucide-react';

export interface MintsPillProps {
  label?: string;
  mints: readonly string[];
}

export function MintsPill({ label = 'Mints', mints }: MintsPillProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const preview = useMemo(() => (mints && mints.length > 0 ? mints[0] : ''), [mints]);

  function handleCopy(url: string, index?: number) {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedIndex(typeof index === 'number' ? index : 0);
      setTimeout(() => setCopiedIndex(null), 1200);
    }).catch(() => {});
  }

  if (!mints || mints.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 text-xs sm:w-auto"
          aria-label={`Show ${label.toLowerCase()}`}
        >
          <p className="min-w-[3.75rem] shrink-0 text-[10px] tracking-[0.04em] text-muted-foreground sm:min-w-[4.75rem]">{label}</p>
          <p className="min-w-0 truncate text-muted-foreground transition-colors hover:text-foreground" title={preview}>
            {mints.length === 1 ? preview : `${mints.length} mints`}
          </p>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[26rem] max-w-[92vw] border-border bg-background p-2 font-mono">
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Mint URLs</div>
          <ul className="divide-y divide-border/70">
            {mints.map((url, idx) => (
              <li key={`${url}-${idx}`} className="flex items-center gap-2 py-1.5 first:pt-0">
                <span className="flex-1 truncate text-xs text-muted-foreground" title={url}>{url}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => handleCopy(url, idx)}
                  title={copiedIndex === idx ? 'Copied' : 'Copy URL'}
                >
                  {copiedIndex === idx ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default MintsPill;
