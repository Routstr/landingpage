'use client';

import { useMemo, useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export interface MintsPillProps {
  label?: string;
  mints: readonly string[];
}

function MintIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/80">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75h15a2.25 2.25 0 0 0 2.25-2.25V9.75m-17.25 9V8.25A2.25 2.25 0 0 1 4.5 6h15M6 13.5a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
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
          className="flex w-full sm:inline-flex sm:w-auto items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm min-w-0"
          aria-label={`Show ${label.toLowerCase()}`}
        >
          <MintIcon />
          <span className="text-gray-400 shrink-0">{label}:</span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <span className="text-white truncate font-mono block" title={preview}>
              {mints.length === 1 ? preview : `${mints.length} available`}
            </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 max-w-[90vw]">
        <div className="space-y-2">
          <div className="text-sm text-gray-300">Select a mint URL to copy</div>
          <ul className="space-y-2">
            {mints.map((url, idx) => (
              <li key={`${url}-${idx}`} className="flex items-center gap-2">
                <span className="flex-1 truncate font-mono text-sm" title={url}>{url}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 rounded-full shrink-0 leading-none"
                  onClick={() => handleCopy(url, idx)}
                  title={copiedIndex === idx ? 'Copied' : 'Copy URL'}
                >
                  {copiedIndex === idx ? (
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-emerald-400">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <CopyIcon />
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


