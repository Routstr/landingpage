import { createPool, getDefaultRelays } from "@/lib/nostr";

// Routstr publishes its curated model list as a replaceable event. This is the
// same list the chat app's model selector reads, so both stay in step.
const ROUTSTR_PUBKEY =
  "4ad6fa2d16e2a9b576c863b4cf7404a70d4dc320c0c447d10ad6ff58993eacc8";
const LIST_KIND = 38423;
const LIST_IDENTIFIER = "routstr-21-models";
const QUERY_TIMEOUT_MS = 5000;

const RELAYS = Array.from(
  new Set([...getDefaultRelays(), "wss://relay.routstr.com"])
);

export async function fetchRoutstr21ModelIds(): Promise<string[]> {
  const pool = createPool();
  try {
    const events = await pool.querySync(
      RELAYS,
      {
        kinds: [LIST_KIND],
        "#d": [LIST_IDENTIFIER],
        authors: [ROUTSTR_PUBKEY],
      },
      { maxWait: QUERY_TIMEOUT_MS }
    );

    // NIP-01 addressable-event rule: newest wins, ties to lower id. Relays can
    // still be holding an older revision of the list.
    const [event] = events.sort(
      (a, b) => b.created_at - a.created_at || (a.id < b.id ? -1 : 1)
    );
    if (!event) return [];

    const content = JSON.parse(event.content) as { models?: unknown };
    if (!Array.isArray(content.models)) return [];
    return content.models.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );
  } catch {
    return [];
  } finally {
    pool.close(RELAYS);
  }
}
