'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

export interface InfoPillProps {
  label: string;
  value: string;
}

export function InfoPill({ label, value }: InfoPillProps) {
  const [isCopied, setIsCopied] = useState(false);
  const displayValue = value || '-';

  function handleCopy() {
    if (!displayValue) return;
    navigator.clipboard
      .writeText(displayValue)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1200);
      })
      .catch(() => {});
  }

  return (
    <div className="flex w-full items-center gap-2.5 text-xs sm:w-auto sm:max-w-[28rem]">
      <p className="min-w-[3.75rem] shrink-0 text-[10px] tracking-[0.04em] text-muted-foreground sm:min-w-[4.75rem]">{label}</p>
      <p className="min-w-0 truncate text-muted-foreground transition-colors hover:text-foreground" title={displayValue}>
        {displayValue}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        aria-label={`Copy ${label.toLowerCase()}`}
        title={isCopied ? 'Copied' : `Copy ${label.toLowerCase()}`}
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
