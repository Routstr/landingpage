import { Event } from 'nostr-tools';
import { GiftWrap, wrapCashuToken, unwrapCashuToken } from './nip60Utils';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';

/**
 * Gets the current balance from stored proofs
 * @returns The total balance in sats
 */
export const getBalanceFromStoredProofs = (): number => {
  try {
    const storedProofs = localStorage.getItem("cashu_proofs");
    if (!storedProofs) return 0;

    const proofs = JSON.parse(storedProofs);
    return proofs.reduce(
      (total: number, proof: any) => total + proof.amount,
      0
    );
  } catch (error) {
    console.error("Error getting balance:", error);
    return 0;
  }
};

/**
 * Store a wrapped Cashu token in local storage
 * @param wrappedToken The NIP-60 wrapped token event
 */
export const storeWrappedToken = (wrappedToken: Event): void => {
  try {
    const storedTokens = localStorage.getItem("wrapped_cashu_tokens") || "[]";
    const tokens = JSON.parse(storedTokens);
    tokens.push(wrappedToken);
    localStorage.setItem("wrapped_cashu_tokens", JSON.stringify(tokens));
  } catch (error) {
    console.error("Error storing wrapped token:", error);
  }
};

/**
 * Get all stored wrapped tokens
 * @returns Array of wrapped token events
 */
export const getStoredWrappedTokens = (): Event[] => {
  try {
    const storedTokens = localStorage.getItem("wrapped_cashu_tokens");
    if (!storedTokens) return [];
    return JSON.parse(storedTokens);
  } catch (error) {
    console.error("Error getting wrapped tokens:", error);
    return [];
  }
};

/**
 * Remove a wrapped token from storage
 * @param tokenId The event ID of the wrapped token to remove
 */
export const removeWrappedToken = (tokenId: string): void => {
  try {
    const tokens = getStoredWrappedTokens();
    const updatedTokens = tokens.filter(token => token.id !== tokenId);
    localStorage.setItem("wrapped_cashu_tokens", JSON.stringify(updatedTokens));
  } catch (error) {
    console.error("Error removing wrapped token:", error);
  }
};

/**
 * Generates a new Cashu token for API usage
 * @param mintUrl The Cashu mint URL
 * @param amount Amount in sats to generate token for
 * @returns Generated token string or null if failed
 */
export const generateApiToken = async (mintUrl: string, amount: number): Promise<string | null> => {
  try {
    // Get stored proofs
    const storedProofs = localStorage.getItem("cashu_proofs");
    if (!storedProofs) {
      throw new Error('No Cashu tokens found. Please mint some tokens first.');
    }

    const proofs = JSON.parse(storedProofs);

    // Initialize wallet for this mint
    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);
    await wallet.loadMint();

    // Generate the token using the wallet directly
    const { send, keep } = await wallet.send(amount, proofs);

    if (!send || send.length === 0) {
      throw new Error('Failed to generate token');
    }

    // Update stored proofs with remaining proofs
    localStorage.setItem('cashu_proofs', JSON.stringify(keep));

    // Create a token string in the proper Cashu format
    const tokenObj = {
      token: [{ mint: mintUrl, proofs: send }]
    };

    return `cashuA${btoa(JSON.stringify(tokenObj))}`;
  } catch (error) {
    console.error('Failed to generate API token:', error);
    return null;
  }
};

/**
 * Manages token lifecycle - reuses existing token or generates new one
 * @param mintUrl The Cashu mint URL
 * @param amount Amount in sats for new token if needed
 * @returns Token string or null if failed
 */
export const getOrCreateApiToken = async (mintUrl: string, amount: number): Promise<string | null> => {
  try {
    // Try to get existing token
    const storedToken = localStorage.getItem('current_cashu_token');
    if (storedToken) {
      return storedToken;
    }

    // Generate new token if none exists
    const newToken = await generateApiToken(mintUrl, amount);
    if (newToken) {
      localStorage.setItem('current_cashu_token', newToken);
      return newToken;
    }

    return null;
  } catch (error) {
    console.error('Error in token management:', error);
    return null;
  }
};

/**
 * Invalidates the current API token
 */
export const invalidateApiToken = () => {
  localStorage.removeItem('current_cashu_token');
};
