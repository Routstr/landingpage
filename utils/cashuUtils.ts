import { Event } from 'nostr-tools';
import { GiftWrap, wrapCashuToken, unwrapCashuToken } from './nip60Utils';
import { CashuMint, CashuWallet, getDecodedToken, getEncodedTokenV4 } from '@cashu/cashu-ts';
import { getLocalCashuToken, setLocalCashuToken, removeLocalCashuToken, getLocalCashuTokens, CashuTokenEntry } from './storageUtils';

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
export const getOrCreateApiToken = async (
  mintUrl: string,
  amount: number,
  baseUrl: string // Add baseUrl parameter
): Promise<string | null | { hasTokens: false }> => {
  try {
    // Try to get existing token for the given baseUrl
    const storedToken = getLocalCashuToken(baseUrl);
    if (storedToken) {
      return storedToken;
    }

    // Check if any tokens are available
    const storedProofs = localStorage.getItem("cashu_proofs");
    if (!storedProofs) {
      return { hasTokens: false };
    }

    // Generate new token if none exists
    const newToken = await generateApiToken(mintUrl, amount);
    if (newToken) {
      setLocalCashuToken(baseUrl, newToken); // Use setLocalCashuToken
      return newToken;
    }

    return null;
  } catch (error) {
    console.error("Error in token management:", error);
    return null;
  }
};

export const fetchRefundToken = async (baseUrl: string, storedToken: string): Promise<any> => {
  if (!baseUrl) {
    throw new Error('No base URL configured');
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const response = await fetch(`${normalizedBaseUrl}v1/wallet/refund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${storedToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 400 && errorData?.detail === "No balance to refund") {
      invalidateApiToken(baseUrl); // Pass baseUrl here
      throw new Error('No balance to refund'); // Indicate this specific case
    }
    throw new Error(`Refund request failed with status ${response.status}: ${errorData?.detail || response.statusText}`);
  }
  const data = await response.json();

  return data.token;
};

export const storeCashuToken = async (mintUrl: string, token: string): Promise<void> => {
  const mint = new CashuMint(mintUrl);
  const wallet = new CashuWallet(mint);
  await wallet.loadMint();

  const result = await wallet.receive(token);
  const proofs = Array.isArray(result) ? result : [];

  if (proofs && proofs.length > 0) {
    const storedProofs = localStorage.getItem('cashu_proofs');
    const existingProofs = storedProofs ? JSON.parse(storedProofs) : [];
    localStorage.setItem('cashu_proofs', JSON.stringify([...existingProofs, ...proofs]));
  }
};

export const refundRemainingBalance = async (mintUrl: string, baseUrl: string, apiKey?: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const storedToken = apiKey || getLocalCashuToken(baseUrl); // Use getLocalCashuToken
    if (!storedToken) {
      return { success: true, message: 'No apiKey to refund' };
    }

    try {
      const token = await fetchRefundToken(baseUrl, storedToken);
      if (token) {
        await storeCashuToken(mintUrl, token);
      }
      invalidateApiToken(baseUrl); // Pass baseUrl
      return { success: true, message: 'Refund completed successfully' };
    } catch (error) {
      if (error instanceof Error && error.message === 'No balance to refund') {
        return { success: true, message: 'No balance to refund' };
      }
      throw error; // Re-throw other errors
    }
  } catch (error) {
    console.error("Error refunding balance:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during refund'
    };
  }
};

/**
 * Invalidates the current API token
 */
export const invalidateApiToken = (baseUrl: string) => { // Add baseUrl parameter
  removeLocalCashuToken(baseUrl); // Use removeLocalCashuToken
};

export type UnifiedRefundResult = {
  success: boolean;
  refundedAmount?: number;
  message?: string;
};

export const unifiedRefund = async (
  mintUrl: string,
  baseUrl: string,
  usingNip60: boolean,
  receiveTokenFn: (token: string) => Promise<any[]>,
  apiKey?: string
): Promise<UnifiedRefundResult> => {
  if (usingNip60) {
    const storedToken = apiKey || getLocalCashuToken(baseUrl); // Use getLocalCashuToken
    if (!storedToken) {
      return { success: true, message: 'No API key to refund' };
    }
    
    try {
      const refundedToken = await fetchRefundToken(baseUrl, storedToken);
      const proofs = await receiveTokenFn(refundedToken);
      const totalAmount = proofs.reduce((sum: number, p: any) => sum + p.amount, 0);
      if (!apiKey) {
        invalidateApiToken(baseUrl); // Pass baseUrl
      }
      
      return {
        success: true,
        refundedAmount: totalAmount
      };
    } catch (error) {
      console.log('rdlogs: REFUND ERROR:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  } else {
    return await refundRemainingBalance(mintUrl, baseUrl, apiKey);
  }
};
