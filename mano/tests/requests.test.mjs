import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestQueue } from '../src/requests.ts';
const tick = () => new Promise(r => setImmediate(r));
test('shared requests: one native job, independent cancellation and progress', async () => {
  const queue = new RequestQueue(); const a = new AbortController(), b = new AbortController();
  let finish, report, signal, calls = 0;
  const run = (s, p) => { calls++; signal = s; report = p; return new Promise(r => finish = r); };
  const seen = [];
  const first = queue.request('same', run, a.signal); first.catch(() => {});
  const second = queue.request('same', run, b.signal, true, p => seen.push(p));
  await tick(); a.abort(); assert.equal(signal.aborted, false); report(.5); finish('file');
  await assert.rejects(first, { name: 'AbortError' }); assert.equal(await second, 'file');
  assert.equal(calls, 1); assert.deepEqual(seen, [.5]);
});
test('native promises settling after abort retain slots; foreground overtakes waiting work', async () => {
  const queue = new RequestQueue(1); const c = new AbortController(); let finish; const order = [];
  const first = queue.request('first', () => new Promise(r => finish = r), c.signal); first.catch(() => {});
  const back = queue.request('back', async () => { order.push('back'); return 2; });
  const front = queue.request('front', async () => { order.push('front'); return 3; }, undefined, true);
  await tick(); c.abort(); await tick(); assert.deepEqual(order, []);
  finish(1); await Promise.all([back, front]); assert.deepEqual(order, ['front', 'back']);
  await assert.rejects(first); await tick();
  assert.equal(await queue.request('first', async () => 4), 4);
});
test('bounded reference cache, explicit invalidation, rejected work is retryable', async () => {
  const queue = new RequestQueue(2, 1); let calls = 0;
  const get = key => queue.request(key, async () => ++calls);
  assert.equal(await get('a'), 1); assert.equal(await get('a'), 1);
  await get('b'); assert.equal(await get('a'), 3); queue.forget('a'); assert.equal(await get('a'), 4);
  await assert.rejects(queue.request('bad', async () => { throw Error('failure'); }));
  await tick(); assert.equal(await queue.request('bad', async () => 5), 5);
});
