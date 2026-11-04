import test from 'node:test';
import assert from 'node:assert/strict';
import { ReviewLoader, reviewRows, reviewHeight } from '../src/review.ts';

const flush = () => new Promise(resolve => setImmediate(resolve));
function controlled() {
  const calls = []; let active = 0, maximum = 0;
  const run = signal => new Promise((resolve, reject) => {
    active++; maximum = Math.max(maximum, active);
    calls.push({ signal, resolve: value => { active--; resolve(value); }, reject: error => { active--; reject(error); } });
  });
  return { run, calls, maximum: () => maximum };
}
const request = (loader, key, run) => {
  const controller = new AbortController();
  const promise = loader.request(key, run, controller.signal);
  promise.catch(() => {});
  return { controller, promise };
};

test('review: a thousand requests never start more than two; closing drops the backlog', async () => {
  const loader = new ReviewLoader(), c = controlled();
  const items = Array.from({ length: 1000 }, (_, i) => request(loader, String(i), c.run));
  await flush(); assert.equal(c.calls.length, 2);
  loader.cancelAll();
  assert.ok(c.calls.every(call => call.signal.aborted));
  const results = await Promise.allSettled(items.map(i => i.promise));
  assert.ok(results.every(r => r.status === 'rejected' && r.reason.name === 'AbortError'));
  c.calls.forEach(call => call.resolve('late')); await flush();
  assert.equal(c.calls.length, 2); assert.equal(c.maximum(), 2);
});

test('review: canceled natives keep their slots until settling, including same-key reentry', async () => {
  const loader = new ReviewLoader(), c = controlled();
  const old = request(loader, 'a:1:280', c.run), other = request(loader, 'b', c.run);
  await flush(); old.controller.abort();
  const fresh = request(loader, 'a:1:280', c.run);
  await flush(); assert.equal(c.calls.length, 2);
  c.calls[0].resolve('stale'); await flush(); assert.equal(c.calls.length, 3);
  c.calls[2].resolve('fresh'); c.calls[1].resolve('other');
  assert.equal(await fresh.promise, 'fresh'); await other.promise;
  assert.equal(c.maximum(), 2);
  assert.equal(await loader.request('a:1:280', c.run, new AbortController().signal), 'fresh');
});

test('review: shared consumers own cancellation independently; edited assets cannot reuse old data', async () => {
  const loader = new ReviewLoader(), c = controlled();
  const first = request(loader, 'a:1:280', c.run), shared = request(loader, 'a:1:280', c.run);
  await flush(); assert.equal(c.calls.length, 1);
  first.controller.abort(); assert.equal(c.calls[0].signal.aborted, false);
  c.calls[0].resolve('original'); assert.equal(await shared.promise, 'original'); await flush();
  const edited = request(loader, 'a:2:280', c.run); await flush();
  assert.equal(c.calls.length, 2); c.calls[1].resolve('edited'); assert.equal(await edited.promise, 'edited');
});

test('review: one failure does not stall the queue; retry invalidates a missing cached file', async () => {
  const loader = new ReviewLoader(), c = controlled();
  const first = request(loader, 'a', c.run), second = request(loader, 'b', c.run), next = request(loader, 'c', c.run);
  await flush(); c.calls[0].reject(new Error('unavailable')); await assert.rejects(first.promise, /unavailable/);
  await flush(); assert.equal(c.calls.length, 3);
  c.calls[1].resolve('b'); c.calls[2].resolve('c'); await Promise.all([second.promise, next.promise]); await flush();
  loader.forget('b'); const retry = request(loader, 'b', c.run); await flush();
  assert.equal(c.calls.length, 4); c.calls[3].resolve('new-b'); assert.equal(await retry.promise, 'new-b');
});

test('review: synchronous throws settle, bounded cache and StrictMode-style cleanup remain usable', async () => {
  const loader = new ReviewLoader();
  await assert.rejects(loader.request('throw', () => { throw new Error('sync'); }, new AbortController().signal), /sync/);
  for (let i = 0; i < 65; i++) await loader.request(String(i), async () => i, new AbortController().signal);
  let reads = 0; assert.equal(await loader.request('0', async () => { reads++; return 'new'; }, new AbortController().signal), 'new');
  assert.equal(reads, 1); loader.cancelAll();
  assert.equal(await loader.request('again', async () => 'ok', new AbortController().signal), 'ok');
});

test('review: the row window is bounded, includes visible cells and preserves total scroll geometry', () => {
  for (const count of [1, 20, 1000, 50000]) {
    const height = 177.25, gap = 8, viewport = 600, total = Math.ceil(count / 3);
    for (const offset of [0, 300, Math.max(0, reviewHeight(count, height, gap) - viewport)]) {
      const rows = reviewRows(count, offset, viewport, height, gap);
      assert.ok(rows.length <= 9); assert.equal(new Set(rows).size, rows.length);
      for (let r = 0; r < total; r++) {
        const top = r * (height + gap);
        if (top + height > offset && top < offset + viewport) assert.ok(rows.includes(r));
      }
    }
    assert.equal(reviewHeight(count, height, gap), total * height + (total - 1) * gap);
  }
  assert.equal(reviewHeight(0, 177, 8), 0);
  const focused = reviewRows(1000, 20000, 600, 177.25, 8, 1);
  assert.ok(focused.includes(0)); assert.ok(focused.length <= 10);
});
