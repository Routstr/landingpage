import assert from 'node:assert/strict';
import test from 'node:test';
import { BehaviorSubject, Subject } from 'rxjs';
import { finalizeEvent, generateSecretKey } from 'nostr-tools';
import { RelayPool } from 'applesauce-relay';
import { RelayClient, getRelayPool } from '../lib/relay-client.ts';

const signed = () => finalizeEvent({ kind: 1, created_at: 1, tags: [], content: 'test' }, generateSecretKey());
function transport() {
  const requests = [];
  const connected$ = new BehaviorSubject(false);
  const pool = { relay: url => ({ connected$, req: () => {
    const stream = new Subject(); requests.push({ url, stream }); return stream;
  } }) };
  const emit = (index, type, fields = {}) => requests[index].stream.next({ type, from: requests[index].url, ...fields });
  return { pool, requests, emit, connected$ };
}

test('application callers share one Applesauce pool', () => {
  assert.ok(getRelayPool() instanceof RelayPool);
  assert.equal(getRelayPool(), getRelayPool());
});

test('queries validate signatures, enforce filters, deduplicate across relays, preserve receipt counts', async () => {
  const { pool, emit, requests } = transport();
  const client = new RelayClient(pool);
  const states = [];
  const result = client.querySync(['a', 'b'], { kinds: [1] }, { onState: (...args) => states.push(args) });
  const event = signed();
  emit(0, 'OPEN');
  emit(0, 'EVENT', { event: { ...event, content: 'tampered' } });
  emit(0, 'EVENT', { event: finalizeEvent({kind: 2, created_at: 1, tags: [], content: ''}, generateSecretKey()) });
  emit(0, 'EVENT', { event }); emit(1, 'EVENT', { event });
  emit(0, 'EOSE'); emit(1, 'EOSE');
  assert.deepEqual((await result).map(e => e.id), [event.id]);
  assert.ok(states.some(([url, state]) => url === 'a' && state === 'received'));
  assert.ok(requests.every(r => r.stream.observers.length === 0));
});

test('empty EOSE, relay CLOSED, transport error and timeout are distinct', async () => {
  const { pool, emit, requests } = transport();
  const client = new RelayClient(pool);
  const states = {};
  const result = client.querySync(['empty', 'closed', 'error', 'silent'], {}, {
    maxWait: 20, onState: (url, state) => { states[url] = state; },
  });
  emit(0, 'EOSE'); emit(1, 'CLOSED', { reason: 'blocked' }); requests[2].stream.error(new Error('socket failed'));
  assert.deepEqual(await result, []);
  assert.deepEqual(states, { empty: 'no-events', closed: 'failed', error: 'failed', silent: 'timeout' });
});

test('closing a caller cancels only its subscriptions; live streams continue after EOSE', () => {
  const { pool, emit, requests } = transport();
  const first = new RelayClient(pool), second = new RelayClient(pool);
  let received = 0;
  first.subscribeMany(['a'], {}, {});
  second.subscribeMany(['a'], {}, { onevent: () => received++ });
  first.close(['a']);
  assert.equal(requests[0].stream.observers.length, 0);
  assert.equal(requests[1].stream.observers.length, 1);
  emit(1, 'EOSE'); emit(1, 'EVENT', { event: signed() });
  assert.equal(received, 1);
  second.close(['a']);
});

test('stats receives duplicate receipts but unique events, and failure before any synthetic completion', () => {
  const { pool, emit } = transport();
  const client = new RelayClient(pool);
  let receipts = 0, events = 0, eose = 0;
  const sub = client.subscribeMany(['a'], {}, {
    receivedEvent: () => receipts++, onevent: () => events++, oneose: () => eose++,
    onclose: () => sub.close(),
  });
  const event = signed();
  emit(0, 'EVENT', { event }); emit(0, 'EVENT', { event });
  emit(0, 'CLOSED', { reason: 'blocked' });
  assert.equal(receipts, 2); assert.equal(events, 1); assert.equal(eose, 0);
});

test('publishing rejects negative OK instead of reporting success', async () => {
  const client = new RelayClient({relay: () => ({publish: async () => ({ok: false, message: 'blocked'})})});
  await assert.rejects(Promise.any(client.publish(['a'], signed())), AggregateError);
});


test('synthetic OPEN is not a connection; socket status cannot overwrite completed fetch status', async () => {
  const { pool, emit, connected$ } = transport();
  const states = [];
  const client = new RelayClient(pool);
  const result = client.querySync(['a'], {}, { onState: (_url, state) => states.push(state) });
  emit(0, 'OPEN');
  assert.deepEqual(states, ['connecting']);
  connected$.next(true);
  assert.deepEqual(states, ['connecting', 'connected']);
  emit(0, 'EVENT', { event: signed() });
  emit(0, 'EOSE');
  await result;
  assert.equal(states.at(-1), 'received');
  const completed = [...states];
  connected$.next(false);
  connected$.next(true);
  assert.deepEqual(states, completed);
  assert.equal(connected$.observers.length, 0);
});
