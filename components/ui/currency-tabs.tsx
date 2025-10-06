'use client';

import { usePricingView } from '@/app/contexts/PricingContext';

interface CurrencyTabsProps {
  className?: string;
}

export function CurrencyTabs({ className = '' }: CurrencyTabsProps) {
  const { currency, setCurrency } = usePricingView();

  return (
    <div className={`inline-flex bg-white/5 rounded-lg p-0.5 ${className}`}>
      <button
        type="button"
        onClick={() => setCurrency('sats')}
        className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
          currency === 'sats'
            ? 'bg-white text-black'
            : 'text-white hover:bg-white/10'
        }`}
      >
        Sats
      </button>
      <button
        type="button"
        onClick={() => setCurrency('usd')}
        className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
          currency === 'usd'
            ? 'bg-white text-black'
            : 'text-white hover:bg-white/10'
        }`}
      >
        USD
      </button>
    </div>
  );
}
