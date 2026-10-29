/**
 * One directory row per Nostr key.
 *
 * Provider announcements are addressable per `(pubkey, d)`, so the NIP-01
 * newest-wins rule only collapses announcements that reuse the same `d` tag.
 * A node that changes its `d` tag (older releases used the hostname, newer ones
 * use the pubkey prefix) leaves its previous announcement live on the relays
 * and the same key is then listed several times.
 *
 * The key is the node's identity, so clients keep one row per key: the newest
 * announcement a key published is its current state. Announcements without a
 * key cannot be attributed to a node and are kept as published.
 */

export interface ProviderAnnouncement {
  readonly pubkey?: string | null;
  readonly id: string;
  readonly created_at?: number | null;
  readonly endpoint_url?: string | null;
  readonly endpoint_urls?: readonly string[] | null;
}

function announcedAt(record: ProviderAnnouncement): number {
  const value = Number(record.created_at);
  return Number.isFinite(value) ? value : 0;
}

function endpointCount(record: ProviderAnnouncement): number {
  const urls = Array.isArray(record.endpoint_urls) ? record.endpoint_urls : [];
  const usable = urls.filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0
  ).length;
  if (usable > 0) return usable;
  return typeof record.endpoint_url === "string" && record.endpoint_url.trim().length > 0
    ? 1
    : 0;
}

function announcementKey(record: ProviderAnnouncement): string {
  const pubkey = typeof record.pubkey === "string" ? record.pubkey.trim() : "";
  // Namespace the fallback so a keyless `d` cannot collide with a real pubkey.
  return pubkey ? `pubkey:${pubkey}` : `address:${record.id}`;
}

/**
 * True when `candidate` should stand in for `current` as the key's current
 * state: newest announcement wins, a tie goes to the one advertising more
 * endpoints (a fuller announcement), and remaining ties fall back to the lower
 * `d` so every relay and source order resolves to the same row.
 */
export function isNewerAnnouncement(
  candidate: ProviderAnnouncement,
  current: ProviderAnnouncement
): boolean {
  const candidateAt = announcedAt(candidate);
  const currentAt = announcedAt(current);
  if (candidateAt !== currentAt) return candidateAt > currentAt;

  const candidateEndpoints = endpointCount(candidate);
  const currentEndpoints = endpointCount(current);
  if (candidateEndpoints !== currentEndpoints) {
    return candidateEndpoints > currentEndpoints;
  }

  return candidate.id < current.id;
}

export function consolidateAnnouncementsByKey<T extends ProviderAnnouncement>(
  records: readonly T[]
): T[] {
  const consolidated: T[] = [];
  const indexByKey = new Map<string, number>();

  for (const record of records) {
    const key = announcementKey(record);
    const index = indexByKey.get(key);
    if (index === undefined) {
      indexByKey.set(key, consolidated.length);
      consolidated.push(record);
      continue;
    }
    if (isNewerAnnouncement(record, consolidated[index])) {
      consolidated[index] = record;
    }
  }

  return consolidated;
}
