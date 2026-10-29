import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetPreloader, upcomingSessionAssets } from '../src/preload.ts';
import { initialState, initialFilter, nextSessionHand, decide } from '../src/domain.ts';

const photo = (id, date = 0, group) => ({ id, date, group, kind: 'photo', width: 100, height: 150, duration: 0 });
const flush = () => new Promise(resolve => setImmediate(resolve));
function controlled() {
  const calls = [];
  let concurrent = 0, maximum = 0;
  const prepare = (asset, signal) => new Promise((resolve, reject) => {
    concurrent++; maximum = Math.max(maximum, concurrent);
    calls.push({ asset, signal, resolve: value => { concurrent--; resolve(value); }, reject: error => { concurrent--; reject(error); } });
  });
  return { calls, prepare, max: () => maximum };
}

test('upcoming ten flatten real bundle hands before later random queue neighbours', () => {
  const assets = Array.from({ length: 16 }, (_, i) => photo(`a${i}`, i, [0, 4, 8, 12].includes(i) ? 'group' : undefined));
  let remaining = assets; const expected = [];
  while (expected.length < 10) {
    const hand = nextSessionHand(remaining, initialState(), initialFilter, 0, 7);
    expected.push(...hand); const ids = new Set(hand.map(a => a.id)); remaining = remaining.filter(a => !ids.has(a.id));
  }
  assert.deepEqual(upcomingSessionAssets(assets, initialState(), initialFilter, 0, 7), expected.slice(0, 10));
});

test('upcoming excludes queued, favorite, removed and resting assets; grouping needs explicit evidence', () => {
  const assets = Array.from({ length: 15 }, (_, i) => photo(`a${i}`, 0));
  let state = decide(initialState(), ['a0'], 'keep', 0);
  state = { ...state, pending: ['a1'], favorites: ['a2'], removed: ['a3'] };
  const result = upcomingSessionAssets(assets, state, { ...initialFilter, order: 'oldest' }, 1);
  assert.equal(result.length, 10); assert.equal(new Set(result.map(a => a.id)).size, 10);
  assert.deepEqual(result.map(a => a.id), assets.slice(4, 14).map(a => a.id));
});

test('two concurrent preparations, rolling-window dedupe and cache reuse', async () => {
  const c = controlled(); const preloader = new AssetPreloader(c.prepare);
  const assets = [photo('a'), photo('b'), photo('c')];
  preloader.update(assets, 's'); await flush();
  preloader.update(assets, 's'); await flush();
  assert.equal(c.calls.length, 2); assert.equal(preloader.snapshot().loading, 2);
  c.calls[0].resolve('local-a'); await flush(); assert.equal(c.calls.length, 3);
  c.calls[1].resolve('local-b'); c.calls[2].resolve('local-c'); await flush();
  assert.equal(preloader.snapshot().ready, 3); assert.equal(c.max(), 2);
  preloader.update([assets[0]], 'new-session'); await flush();
  assert.equal(c.calls.length, 3); assert.equal(preloader.get(assets[0]), 'local-a');
  preloader.dispose();
});

test('iCloud failure is isolated, remaining queue continues and error can retry', async () => {
  const c = controlled(); const preloader = new AssetPreloader(c.prepare);
  const assets = [photo('a'), photo('b'), photo('c')];
  const events = []; const unsubscribe = preloader.subscribe(s => events.push(s));
  preloader.update(assets); await flush(); c.calls[0].reject(new Error('iCloud offline')); await flush();
  assert.equal(c.calls.length, 3); assert.equal(preloader.snapshot().failed, 1);
  c.calls[1].resolve('b'); c.calls[2].resolve('c'); await flush();
  assert.deepEqual([preloader.snapshot().ready, preloader.snapshot().failed, preloader.snapshot().completed], [2, 1, 3]);
  assert.equal(preloader.snapshot().items[0].error, 'iCloud offline');
  preloader.retry(assets[0]); await flush(); c.calls[3].resolve('a'); await flush();
  assert.equal(preloader.snapshot().ready, 3); assert.equal(preloader.snapshot().failed, 0);
  assert.ok(events.some(s => s.completed === 3)); unsubscribe(); preloader.dispose();
});

test('stale session results are ignored without exceeding two actual preparer calls', async () => {
  const c = controlled(); const preloader = new AssetPreloader(c.prepare);
  preloader.update([photo('old-a'), photo('old-b')], 'old'); await flush();
  preloader.update([photo('new')], 'new'); await flush();
  assert.ok(c.calls[0].signal.aborted); assert.ok(c.calls[1].signal.aborted);
  assert.equal(c.calls.length, 2);
  c.calls[0].resolve('stale'); await flush();
  assert.equal(c.calls.length, 3); assert.equal(preloader.get(photo('old-a')), undefined);
  c.calls[2].resolve('current'); c.calls[1].reject(new Error('aborted')); await flush();
  assert.equal(preloader.snapshot().items[0].value, 'current'); assert.equal(c.max(), 2);
  preloader.dispose();
});

test('removed work is cancelled; modified assets cannot reuse stale cache; dispose suppresses updates', async () => {
  const c = controlled(); const preloader = new AssetPreloader(c.prepare); const events = [];
  preloader.subscribe(s => events.push(s)); preloader.update([photo('a'), photo('b')]); await flush();
  preloader.update([photo('a')]); assert.ok(c.calls[1].signal.aborted);
  c.calls[0].resolve('a-v1'); c.calls[1].resolve('stale-b'); await flush();
  const edited = { ...photo('a'), modified: 2 };
  preloader.update([edited]); await flush(); assert.equal(c.calls.length, 3);
  assert.equal(preloader.get(edited), undefined); preloader.dispose();
  const count = events.length; c.calls[2].resolve('a-v2'); await flush();
  assert.equal(events.length, count); assert.equal(preloader.get(edited), undefined);
});

test('at most ten unique items are exposed and a synchronous preparer throw is isolated', async () => {
  const preloader = new AssetPreloader(asset => { if (asset.id === 'a0') throw new Error('bad asset'); return Promise.resolve(asset.id); });
  preloader.update(Array.from({ length: 20 }, (_, i) => photo(`a${i}`))); await flush();
  assert.equal(preloader.snapshot().total, 10); assert.equal(preloader.snapshot().failed, 1); assert.equal(preloader.snapshot().ready, 9);
  preloader.dispose();
});

test('forget evicted native references forces reprepare when an asset reenters the window', async () => {
  const c = controlled(); const preloader = new AssetPreloader(c.prepare); const asset = photo('video');
  preloader.update([asset]); await flush(); c.calls[0].resolve('native-pinned-v1'); await flush();
  preloader.update([]); preloader.forget(asset);
  assert.equal(preloader.get(asset), undefined);
  preloader.update([asset]); await flush(); assert.equal(c.calls.length, 2);
  c.calls[1].resolve('native-pinned-v2'); await flush();
  assert.equal(preloader.snapshot().items[0].value, 'native-pinned-v2');
  preloader.forget(asset); await flush(); assert.equal(c.calls.length, 3);
  assert.equal(preloader.snapshot().items[0].status, 'loading');
  c.calls[2].resolve('native-pinned-v3'); await flush(); preloader.dispose();
});
