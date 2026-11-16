import { RelayPool } from "applesauce-relay";
import { Subscription } from "rxjs";
import { matchFilter, verifyEvent, type Event, type Filter } from "nostr-tools";

export type RelayFetchState = "connecting" | "connected" | "received" | "no-events" | "timeout" | "failed";
type Callbacks = {
  onevent?: (event: Event) => void;
  receivedEvent?: (relay: { url: string }, id: string) => void;
  oneose?: () => void;
  onclose?: (reasons: string[]) => void;
  maxWait?: number;
};

// One transport for the browser application. Callers own subscriptions, never sockets.
// Applesauce closes idle connections after the keep-alive window.
let sharedPool: RelayPool | undefined;
export function getRelayPool(): RelayPool {
  return sharedPool ??= new RelayPool({ keepAlive: 30_000 });
}

/** Small application adapter: finite queries and existing callback consumers share the same transport. */
export class RelayClient {
  private operations = new Set<{ urls: string[]; close: () => void }>();
  private readonly pool: RelayPool;
  constructor(pool: RelayPool = getRelayPool()) { this.pool = pool; }

  subscribeMany(urls: string[], filter: Filter, callbacks: Callbacks = {}) {
    return this.subscribe(urls, filter, callbacks, false);
  }

  private subscribe(
    urls: string[], filter: Filter, callbacks: Callbacks, finite: boolean,
    onState?: (url: string, state: RelayFetchState) => void,
  ) {
    const subscriptions = new Subscription();
    const seen = new Set<string>();
    const pending = new Set(urls);
    const reasons: string[] = [];
    let closed = false;
    let eosed = false;
    const operation = { urls, close: () => {
      if (closed) return;
      closed = true;
      subscriptions.unsubscribe();
      this.operations.delete(operation);
    } };
    this.operations.add(operation);
    const finish = (url: string, reason?: string) => {
      if (!pending.delete(url)) return;
      if (reason) reasons.push(reason);
      if (pending.size === 0 && !closed) {
        // Errors must not masquerade as successful EOSE (stats pagination relies on this).
        if (reasons.length) callbacks.onclose?.(reasons);
        if (!closed) {
          eosed = true;
          callbacks.oneose?.();
        }
        if (finite) operation.close();
      }
    };
    for (const url of Array.from(new Set(urls))) {
      let count = 0;
      const child = new Subscription();
      subscriptions.add(child);
      onState?.(url, "connecting");
      const timer = setTimeout(() => {
        onState?.(url, "timeout");
        finish(url, "relay request timed out");
        child.unsubscribe();
      }, callbacks.maxWait ?? 5000);
      child.add(() => clearTimeout(timer));
      const relay = this.pool.relay(url);
      // req OPEN is synthetic bookkeeping, not a WebSocket handshake.
      // Stop observing once this relay finishes its initial response.
      const connection = relay.connected$.subscribe(connected => {
        if (connected && !closed && pending.has(url)) onState?.(url, "connected");
      });
      child.add(connection);
      child.add(relay.req(filter).subscribe({
        next: message => {
          if (closed) return;
          if (message.type === "EVENT") {
            const event = message.event as Event;
            // Raw Applesauce req streams do not validate signatures or deduplicate.
            // Validate before counting, caching or forwarding, and enforce the requested filter.
            try { if (!verifyEvent(event) || !matchFilter(filter, event)) return; } catch { return; }
            count++;
            callbacks.receivedEvent?.({ url }, event.id);
            if (!seen.has(event.id)) {
              seen.add(event.id);
              callbacks.onevent?.(event);
            }
          } else if (message.type === "EOSE") {
            connection.unsubscribe();
            clearTimeout(timer);
            onState?.(url, count ? "received" : "no-events");
            finish(url);
            if (finite) child.unsubscribe();
          } else if (message.type === "CLOSED") {
            clearTimeout(timer);
            onState?.(url, "failed");
            if (eosed) callbacks.onclose?.([message.reason]);
            else finish(url, message.reason || "relay closed request");
            child.unsubscribe();
          }
        },
        error: error => {
          connection.unsubscribe();
          clearTimeout(timer);
          onState?.(url, "failed");
          const reason = error instanceof Error ? error.message : String(error);
          if (eosed) callbacks.onclose?.([reason]);
          else finish(url, reason);
        },
      }));
    }
    if (urls.length === 0) queueMicrotask(() => {
      if (!closed) { callbacks.oneose?.(); if (finite) operation.close(); }
    });
    return operation;
  }

  querySync(
    urls: string[], filter: Filter,
    options: { maxWait?: number; onState?: (url: string, state: RelayFetchState) => void } = {},
  ): Promise<Event[]> {
    return new Promise(resolve => {
      const events: Event[] = [];
      this.subscribe(urls, filter, {
        maxWait: options.maxWait,
        onevent: event => events.push(event),
        oneose: () => resolve(events),
      }, true, options.onState);
    });
  }

  publish(urls: string[], event: Event): Promise<string>[] {
    return urls.map(async url => {
      const result = await this.pool.relay(url).publish(event);
      if (!result.ok) throw new Error(result.message || "Relay rejected event");
      return result.message ?? "";
    });
  }

  close(urls: string[]) {
    for (const operation of Array.from(this.operations)) {
      if (operation.urls.some(url => urls.includes(url))) operation.close();
    }
  }
}

export const createPool = () => new RelayClient();
