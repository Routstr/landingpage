'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SimplePool } from 'nostr-tools';
import { 
  getPublicKey, 
  isNostrExtensionAvailable, 
  createPool, 
  getDefaultRelays,
  decodePrivateKey,
  getPublicKeyFromPrivateKey,
  signEventWithPrivateKey,
  signEvent as signWithExtension
} from '@/lib/nostr';
import type { Event } from 'nostr-tools';

type NostrContextType = {
  publicKey: string | null;
  isAuthenticated: boolean;
  isNostrAvailable: boolean;
  privateKey: Uint8Array | null;
  login: () => Promise<boolean>;
  loginWithNsec: (nsec: string) => boolean;
  logout: () => void;
  pool: SimplePool | null;
  publishEvent: (content: string, kind?: number, tags?: string[][]) => Promise<Event | null>;
};

const NostrContext = createContext<NostrContextType>({
  publicKey: null,
  isAuthenticated: false,
  isNostrAvailable: false,
  privateKey: null,
  login: async () => false,
  loginWithNsec: () => false,
  logout: () => {},
  pool: null,
  publishEvent: async () => null,
});

export const useNostr = () => useContext(NostrContext);

export function NostrProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);
  const [isNostrAvailable, setIsNostrAvailable] = useState(false);
  const [pool, setPool] = useState<SimplePool | null>(null);

  // Initialize on mount
  useEffect(() => {
    // Check if Nostr extension is available
    setIsNostrAvailable(isNostrExtensionAvailable());
    
    // Create a new relay pool
    const newPool = createPool();
    setPool(newPool);
    
    // Check for stored public key in localStorage
    const storedPublicKey = localStorage.getItem('nostr_pubkey');
    const storedPrivateKey = localStorage.getItem('nostr_nsec');
    
    if (storedPrivateKey) {
      // If we have a stored private key, decode it and use it
      const decodedPrivateKey = decodePrivateKey(storedPrivateKey);
      if (decodedPrivateKey) {
        setPrivateKey(decodedPrivateKey);
        const derivedPublicKey = getPublicKeyFromPrivateKey(decodedPrivateKey);
        setPublicKey(derivedPublicKey);
      }
    } else if (storedPublicKey) {
      // Otherwise just use the stored public key if available
      setPublicKey(storedPublicKey);
    }
    
    // Cleanup on unmount
    return () => {
      newPool.close(getDefaultRelays());
    };
  }, []);

  const login = async (): Promise<boolean> => {
    try {
      const pubkey = await getPublicKey();
      if (pubkey) {
        setPublicKey(pubkey);
        localStorage.setItem('nostr_pubkey', pubkey);

        // Proactively request signing permission from the extension
        // by attempting to sign a harmless event (not published).
        // This ensures required permissions are granted up-front.
        const signed = await signWithExtension('[routstr] permission check');
        if (!signed) {
          // If user denies signing permission, treat login as failed
          // so UI can prompt the user appropriately.
          localStorage.removeItem('nostr_pubkey');
          setPublicKey(null);
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error logging in with Nostr:', error);
      return false;
    }
  };

  const loginWithNsec = (nsec: string): boolean => {
    try {
      const decodedPrivateKey = decodePrivateKey(nsec);
      if (!decodedPrivateKey) return false;
      
      // Generate public key from private key
      const pubkey = getPublicKeyFromPrivateKey(decodedPrivateKey);
      
      // Store credentials
      setPrivateKey(decodedPrivateKey);
      setPublicKey(pubkey);
      
      // Only store in localStorage if user opts in (with warning)
      localStorage.setItem('nostr_pubkey', pubkey);
      localStorage.setItem('nostr_nsec', nsec);
      
      return true;
    } catch (error) {
      console.error('Error logging in with nsec:', error);
      return false;
    }
  };

  const logout = () => {
    setPublicKey(null);
    setPrivateKey(null);
    localStorage.removeItem('nostr_pubkey');
    localStorage.removeItem('nostr_nsec');
  };

  const publishEvent = async (content: string, kind = 1, tags: string[][] = []): Promise<Event | null> => {
    if (!pool) return null;
    
    try {
      // Create event template
      const eventTemplate = {
        kind,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content
      };
      
      let signedEvent: Event | null = null;
      
      // Sign with private key if available
      if (privateKey) {
        signedEvent = signEventWithPrivateKey(eventTemplate, privateKey);
      } 
      // Otherwise use extension
      else if (isNostrAvailable && publicKey) {
        signedEvent = await window.nostr!.signEvent(eventTemplate);
      }
      
      // Publish to relays
      if (signedEvent) {
        await Promise.any(pool.publish(getDefaultRelays(), signedEvent));
        return signedEvent;
      }
      
      return null;
    } catch (error) {
      console.error('Error publishing event:', error);
      return null;
    }
  };

  const value = {
    publicKey,
    isAuthenticated: !!publicKey,
    isNostrAvailable,
    privateKey,
    login,
    loginWithNsec,
    logout,
    pool,
    publishEvent
  };

  return (
    <NostrContext.Provider value={value}>
      {children}
    </NostrContext.Provider>
  );
} 
