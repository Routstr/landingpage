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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M9 7.5A2.25 2.25 0 0 1 11.25 5.25h6A2.25 2.25 0 0 1 19.5 7.5v6a2.25 2.25 0 0 1-2.25 2.25h-6A2.25 2.25 0 0 1 9 13.5v-6z" />
      <path d="M7.5 8.25A2.25 2.25 0 0 0 5.25 10.5v6A2.25 2.25 0 0 0 7.5 18.75h6a.75.75 0 0 0 .75-.75v-1.5h1.5v1.5A2.25 2.25 0 0 1 13.5 21H7.5A2.25 2.25 0 0 1 5.25 18.75v-6A2.25 2.25 0 0 1 7.5 10.5h1.5V9A.75.75 0 0 1 9.75 8.25H11.25V6.75H9.75z" />
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
                  className="h-7 px-2 py-0 rounded-full ml-1 shrink-0"
                  onClick={() => handleCopy(url, idx)}
                  title={copiedIndex === idx ? 'Copied' : 'Copy URL'}
                >
                  {copiedIndex === idx ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-400">
                      <path fillRule="evenodd" d="M10.28 15.53a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 4.47-4.47a.75.75 0 1 1 1.06 1.06l-5.06 5.06z" clipRule="evenodd" />
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


