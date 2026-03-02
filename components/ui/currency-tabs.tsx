'use client';

import { usePricingView } from '@/app/contexts/PricingContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface CurrencyTabsProps {
  className?: string;
}

export function CurrencyTabs({ className = '' }: CurrencyTabsProps) {
  const { currency, setCurrency } = usePricingView();

  return (
    <Tabs
      value={currency}
      onValueChange={(value) => setCurrency(value as 'sats' | 'usd')}
      className={cn('w-auto', className)}
    >
      <TabsList variant="line" className="h-8">
        <TabsTrigger value="sats" className="h-7 text-xs">
          sats
        </TabsTrigger>
        <TabsTrigger value="usd" className="h-7 text-xs">
          usd
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
