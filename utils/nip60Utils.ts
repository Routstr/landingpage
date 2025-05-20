import { Event, getPublicKey, nip04, getEventHash } from 'nostr-tools';
import { decodePrivateKey, getPublicKeyFromPrivateKey } from '@/lib/nostr';

export interface GiftWrap {
  token: string;
  recipientPubkey: string;
  note?: string;
}

/**
 * Wraps a Cashu token using NIP-60 Gift Wrap Protocol
 * @param token The Cashu token to wrap
 * @param recipientPubkey The recipient's Nostr public key
 * @param senderPrivateKey The sender's private key (nsec format)
 * @param note Optional note to the recipient
 * @returns The wrapped event
 */
export const wrapCashuToken = async (
  token: string,
  recipientPubkey: string,
  senderPrivateKey: Uint8Array,
  note?: string
): Promise<Event> => {
  const senderPubkey = getPublicKeyFromPrivateKey(senderPrivateKey);
  
  // Encrypt the token for the recipient
  const encryptedContent = await nip04.encrypt(
    senderPrivateKey,
    recipientPubkey,
    JSON.stringify({ token, note })
  );

  const event: Event = {
    kind: 1059, // NIP-60 Gift Wrap kind
    pubkey: senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['p', recipientPubkey],
      ['gift', 'cashu'],
    ],
    content: encryptedContent,
    id: '', // Will be set by getEventHash
    sig: '' // Will be set by finalizeEvent
  };

  // Set the event ID
  event.id = getEventHash(event);

  return event;
};

/**
 * Unwraps a NIP-60 wrapped Cashu token
 * @param event The wrapped event
 * @param recipientPrivateKey The recipient's private key (nsec format)
 * @returns The unwrapped gift content
 */
export const unwrapCashuToken = async (
  event: Event,
  recipientPrivateKey: Uint8Array
): Promise<GiftWrap | null> => {
  try {
    const recipientPubkey = getPublicKeyFromPrivateKey(recipientPrivateKey);
    
    // Verify this gift is for us
    const isForUs = event.tags.some(tag => 
      tag[0] === 'p' && tag[1] === recipientPubkey
    );
    
    if (!isForUs) return null;

    // Decrypt the content
    const decryptedContent = await nip04.decrypt(
      recipientPrivateKey,
      event.pubkey,
      event.content
    );

    return JSON.parse(decryptedContent);
  } catch (error) {
    console.error('Error unwrapping token:', error);
    return null;
  }
}; 