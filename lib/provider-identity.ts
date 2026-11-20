/**
 * Display labels for the providers on the stats page.
 *
 * Analytics reports carry no host and no display name. A v2 report (kind 38422)
 * names its provider only through the signed node id in its `a` tag, and that
 * node id is usually the public key prefix, because stats publish under the
 * coordinate the listing resolves: `PROVIDER_ID`, else the one signed listing
 * `d` tag, else `pubkey_hex[:12]`. Older nodes that still publish the legacy
 * snapshot schema carry `endpoint_urls` in the report body, which is why some
 * rows on the page show a host and others show twelve hex characters.
 *
 * The name and the advertised endpoints live in the kind 38421 announcement, so
 * the stats page reads those too and joins them by public key here. The join is
 * deliberately local: no wire format changes, and a node that upgrades its
 * reporter does not need to re-publish history to get its name back.
 *
 * One key may have several live announcements, because a node that changed its
 * `d` tag never rewrites the old one. The choice must not depend on relay
 * arrival order, so it follows NIP-01 exactly: newest wins, ties go to the
 * lower event id.
 */

export const PROVIDER_ANNOUNCEMENT_KIND = 38421;

/** The announcement fields the label rules read. A nostr-tools `Event` fits as is. */
export interface ProviderAnnouncementLike {
  readonly pubkey: string;
  readonly id: string;
  readonly created_at: number;
  readonly content: string;
  readonly tags: readonly (readonly string[])[];
}

/** Enough for a real node name; anything longer is a paste, not a label. */
const MAX_LABEL_LENGTH = 64;
const HEX_KEY = /^[0-9a-f]{64}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const WHITESPACE = /\s+/g;

/**
 * A label has to identify something: it must contain a letter or a digit, so a
 * name made only of punctuation or symbols is refused rather than rendered as a
 * meaningless bar in the chart legend. Non-ASCII letters count, because node
 * names are not required to be English.
 */
const IDENTIFYING_CHAR = new RegExp("[\\p{L}\\p{N}]", "u");

function usableLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(CONTROL_CHARS, " ").replace(WHITESPACE, " ").trim();
  if (!IDENTIFYING_CHAR.test(cleaned)) return null;
  return cleaned.length > MAX_LABEL_LENGTH
    ? `${cleaned.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
    : cleaned;
}

/** The name a node publishes in its announcement `content`, if it published one. */
function announcementName(content: string): string | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) return null;
    return usableLabel((parsed as { name?: unknown }).name);
  } catch {
    return null;
  }
}

/** The host a `u` tag advertises, `www.` removed and the port kept. */
function endpointHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return usableLabel(parsed.host.replace(/^www\./i, ""));
  } catch {
    return null;
  }
}

function isOnionHost(host: string): boolean {
  return host.toLowerCase().endsWith(".onion");
}

/**
 * Name first, then the host a client would actually dial. An onion host is a
 * last resort behind a clearnet one, but it still beats the bare node id: the
 * page already lists onion-only providers by host for legacy reports.
 */
export function announcementLabel(announcement: ProviderAnnouncementLike): string | null {
  const named = announcementName(announcement.content);
  if (named) return named;
  const hosts: string[] = [];
  for (const tag of announcement.tags) {
    if (tag[0] !== "u" || typeof tag[1] !== "string") continue;
    const host = endpointHost(tag[1]);
    if (host) hosts.push(host);
  }
  return hosts.find((host) => !isOnionHost(host)) ?? hosts[0] ?? null;
}

/** Newest announcement wins; a tie goes to the lower id, as NIP-01 replaces. */
function announcementWins(
  candidate: ProviderAnnouncementLike,
  current: ProviderAnnouncementLike,
): boolean {
  if (candidate.created_at !== current.created_at) return candidate.created_at > current.created_at;
  return candidate.id < current.id;
}

/**
 * One label per public key. Announcements without a usable name or endpoint, or
 * without a valid key, contribute nothing, so an unlabelled provider keeps the
 * identifier its report already gave it.
 */
export function providerLabelsFromAnnouncements(
  announcements: readonly ProviderAnnouncementLike[],
): Record<string, string> {
  const latest = new Map<string, ProviderAnnouncementLike>();
  for (const announcement of announcements) {
    const pubkey = typeof announcement.pubkey === "string" ? announcement.pubkey.toLowerCase() : "";
    if (!HEX_KEY.test(pubkey)) continue;
    const current = latest.get(pubkey);
    if (!current || announcementWins(announcement, current)) latest.set(pubkey, announcement);
  }
  const labels: Record<string, string> = {};
  for (const [pubkey, announcement] of Array.from(latest)) {
    // Hex keys cannot reach a prototype setter, so plain assignment is safe.
    const label = announcementLabel(announcement);
    if (label) labels[pubkey] = label;
  }
  return labels;
}

/** A provider id is `38421:<pubkey>:<signed node id>`. */
export function labelForProviderId(
  providerId: string,
  labels: Record<string, string>,
): string | null {
  const parts = providerId.split(":");
  if (parts[0] !== String(PROVIDER_ANNOUNCEMENT_KIND) || !parts[1]) return null;
  const label = labels[parts[1].toLowerCase()];
  return typeof label === "string" && label ? label : null;
}

/**
 * Apply the join without reordering: the caller's sort and colour assignment key
 * off `providerId`, so only the display label changes. A provider the
 * announcements do not cover keeps the label its report produced.
 */
export function applyProviderLabels<T extends { providerId: string; providerLabel: string }>(
  providers: readonly T[],
  labels: Record<string, string>,
): T[] {
  if (Object.keys(labels).length === 0) return providers.slice();
  return providers.map((provider) => {
    const label = labelForProviderId(provider.providerId, labels);
    return label === null ? provider : { ...provider, providerLabel: label };
  });
}

/** Labels restored from browser storage are untrusted input like any other. */
export function sanitizeProviderLabels(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const labels: Record<string, string> = {};
  for (const [pubkey, label] of Object.entries(value as Record<string, unknown>)) {
    const key = pubkey.toLowerCase();
    const cleaned = usableLabel(label);
    if (!HEX_KEY.test(key) || cleaned === null || cleaned !== label) continue;
    labels[key] = cleaned;
  }
  return labels;
}
