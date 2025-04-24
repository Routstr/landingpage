'use client';

import { ReactNode } from 'react';
import { NostrProvider } from '@/context/NostrContext';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <NostrProvider>
      {children}
    </NostrProvider>
  );
} 