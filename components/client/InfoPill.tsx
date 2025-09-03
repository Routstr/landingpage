'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface InfoPillProps {
  label: string;
  value: string;
}

function PillIcon({ label }: { label: string }) {
  const key = label.toLowerCase();
  if (key.includes('endpoint')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/80">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75A2.25 2.25 0 0 1 6 4.5h12a2.25 2.25 0 0 1 2.25 2.25v2.25A2.25 2.25 0 0 1 18 11.25H6A2.25 2.25 0 0 1 3.75 9V6.75zM3.75 15.75A2.25 2.25 0 0 1 6 13.5h12a2.25 2.25 0 0 1 2.25 2.25v2.25A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h.008v.008H7.5V8.25zM7.5 17.25h.008v.008H7.5v-.008z" />
      </svg>
    );
  }
  if (key.includes('mint')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/80">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75h15a2.25 2.25 0 0 0 2.25-2.25V9.75m-17.25 9V8.25A2.25 2.25 0 0 1 4.5 6h15M6 13.5a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/80">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75 3.75 12l4.5 5.25M15.75 17.25 20.25 12 15.75 6.75" />
    </svg>
  );
}

export function InfoPill({ label, value }: InfoPillProps) {
  const [isCopied, setIsCopied] = useState(false);

  function handleCopy() {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1200);
      })
      .catch(() => {});
  }

  return (
    <div className="flex w-full sm:inline-flex sm:w-auto items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm min-w-0">
      <PillIcon label={label} />
      <span className="text-gray-400 shrink-0">{label}:</span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <span className="text-white truncate font-mono block" title={value}>
          {value}
        </span>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleCopy}
        className="h-7 px-2 py-0 rounded-full ml-1 shrink-0"
        aria-label={`Copy ${label.toLowerCase()}`}
        title={isCopied ? 'Copied' : `Copy ${label.toLowerCase()}`}
      >
        {isCopied ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-400">
            <path fillRule="evenodd" d="M10.28 15.53a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 4.47-4.47a.75.75 0 1 1 1.06 1.06l-5.06 5.06z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M9 7.5A2.25 2.25 0 0 1 11.25 5.25h6A2.25 2.25 0 0 1 19.5 7.5v6a2.25 2.25 0 0 1-2.25 2.25h-6A2.25 2.25 0 0 1 9 13.5v-6z" />
            <path d="M7.5 8.25A2.25 2.25 0 0 0 5.25 10.5v6A2.25 2.25 0 0 0 7.5 18.75h6a2.25 2.25 0 0 0 2.25-2.25v-1.5h-1.5v1.5a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1-.75-.75v-6a.75.75 0 0 1 .75-.75h1.5v-1.5H7.5z" />
          </svg>
        )}
      </Button>
    </div>
  );
}


