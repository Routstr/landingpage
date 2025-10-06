'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Currency = 'sats' | 'usd';

type PricingContextValue = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  toggleCurrency: () => void;
};

const PricingContext = createContext<PricingContextValue | undefined>(undefined);

const STORAGE_KEY = 'pricingCurrency';

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('sats');

  // Hydrate from localStorage on mount only (client-side)
  useEffect(() => {
    try {
      const saved = (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY)) as Currency | null;
      if (saved === 'sats' || saved === 'usd') {
        setCurrency(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Persist whenever currency changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, currency);
      }
    } catch {
      // ignore storage errors
    }
  }, [currency]);

  const value = useMemo<PricingContextValue>(() => ({
    currency,
    setCurrency,
    toggleCurrency: () => setCurrency((c) => (c === 'sats' ? 'usd' : 'sats')),
  }), [currency]);

  return (
    <PricingContext.Provider value={value}>{children}</PricingContext.Provider>
  );
}

export function usePricingView(): PricingContextValue {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error('usePricingView must be used within a PricingProvider');
  return ctx;
}


