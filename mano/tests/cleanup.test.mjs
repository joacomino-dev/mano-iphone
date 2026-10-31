import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, initialFilter, decide, undo, eligible, pileCount, normalizeFilter, validateRecordState, filterScope, nextSessionHand } from '../src/domain.ts';
import { upcomingSessionAssets } from '../src/preload.ts';
import { categorize } from '../src/insights.ts';
import { formatBytes, vhsLayout, defaultDisplay, normalizeDisplay } from '../src/meta.ts';
import { fitOsd } from '../src/pixelfont.ts';

const item = (id, date, extra = {}) => ({ id, kind: 'photo', date, width: 1, height: 1, duration: 0, ...extra });

test('«Más tarde» keeps marks, waits at the end of the pile and undo restores the position', () => {
  const assets = [item('a', 1), item('b', 2), item('c', 3)];
  let s = decide(initialState(), ['a'], 'later', 10);
  assert.deepEqual(s.later, ['a']);
  assert.deepEqual(s.marks, {});
  assert.deepEqual(eligible(assets, s, initialFilter).map(a => a.id), ['b', 'c', 'a']);
  s = decide(s, ['b'], 'later', 11);
  assert.deepEqual(eligible(assets, s, initialFilter).map(a => a.id), ['c', 'a', 'b']);
  assert.deepEqual(eligible(assets, s, { ...initialFilter, smart: 'later' }).map(a => a.id), ['a', 'b']);
  const kept = decide(s, ['a'], 'keep', 12);
  assert.deepEqual(kept.later, ['b'], 'a decision settles a postponed item');
  assert.deepEqual(undo(kept).later.sort(), ['a', 'b']);
  const again = decide(s, ['a'], 'later', 13);
  assert.deepEqual(again.later, ['b', 'a'], 'postponing again moves it to the end');
  assert.deepEqual(undo(again).later.sort(), ['a', 'b']);
  assert.deepEqual(undo(decide(initialState(), ['a'], 'later', 1)).later, []);
});

test('record validation keeps later lists and later history entries', () => {
  const s = decide(decide(initialState(), ['a'], 'later', 1), ['a'], 'keep', 2);
  const back = validateRecordState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.later, []);
  assert.equal(back.history[0].action, 'later');
  assert.deepEqual(back.history[1].wasLater, ['a']);
  assert.deepEqual(validateRecordState({ marks: {}, pending: [] }).later, []);
  assert.equal(validateRecordState({ marks: {}, pending: [], later: [3] }), null);
});

test('size orders put the heaviest or lightest first and unmeasured files last', () => {
  const assets = [item('s', 1, { bytes: 10 }), item('u', 2), item('l', 3, { bytes: 900 }), item('m', 4, { bytes: 300 })];
  assert.deepEqual(eligible(assets, initialState(), { ...initialFilter, order: 'largest' }).map(a => a.id), ['l', 'm', 's', 'u']);
  assert.deepEqual(eligible(assets, initialState(), { ...initialFilter, order: 'smallest' }).map(a => a.id), ['s', 'm', 'l', 'u']);
});

test('old filters migrate from the old random default; a random chosen in 0.6 is kept', () => {
  assert.equal(normalizeFilter({ order: 'random' }).order, 'oldest');
  assert.equal(normalizeFilter({ order: 'random', v: 2 }).order, 'random');
  assert.equal(normalizeFilter({ order: 'newest' }).order, 'newest');
  assert.equal(normalizeFilter({ order: 'largest', smart: 'text' }).smart, 'text');
  assert.equal(normalizeFilter({ smart: 'nope' }).smart, 'all');
});

test('clean-up sets: screenshots, low quality and text (faces last), counted without sorting', () => {
  const assets = [item('shot', 1, { screenshot: true }), item('blur', 2, { low: true }), item('doc', 3, { text: 1 }), item('selfie-note', 4, { text: .5 }), item('plain', 5)];
  const s = initialState();
  assert.deepEqual(eligible(assets, s, { ...initialFilter, smart: 'screenshots' }).map(a => a.id), ['shot']);
  assert.deepEqual(eligible(assets, s, { ...initialFilter, smart: 'lowQuality' }).map(a => a.id), ['blur']);
  assert.deepEqual(eligible(assets, s, { ...initialFilter, smart: 'text', order: 'newest' }).map(a => a.id), ['doc', 'selfie-note']);
  assert.equal(pileCount(assets, s, { ...initialFilter, smart: 'text' }), 2);
  assert.equal(pileCount(assets, s, initialFilter), 5);
  assert.equal(filterScope(assets, s, { ...initialFilter, smart: 'screenshots' }).total, 1);
});

test('Vision signals become categories: documents without faces, blurred or dark photos', () => {
  assert.deepEqual(categorize({ text: .2, lines: 14, faces: 0, sharp: 400, luma: .8 }), { low: false, text: 1 });
  assert.deepEqual(categorize({ text: .2, lines: 14, faces: 1, sharp: 400, luma: .8 }), { low: false, text: .5 });
  assert.deepEqual(categorize({ text: 0, lines: 0, faces: 0, sharp: 8, luma: .5 }), { low: true, text: 0 });
  assert.deepEqual(categorize({ text: 0, lines: 0, faces: 0, sharp: 300, luma: .02 }), { low: true, text: 0 });
  assert.deepEqual(categorize({ text: 0, lines: 1, faces: 2, sharp: 300, luma: .5 }), { low: false, text: 0 });
  assert.deepEqual(categorize({ text: 0, lines: 0, faces: 0, sharp: 300, luma: .5, score: -.6, utility: false }), { low: true, text: 0 });
  assert.deepEqual(categorize({ text: .01, lines: 3, faces: 0, sharp: 9, luma: .5, score: -.6, utility: true }), { low: false, text: 1 });
});

test('bytes read the way iOS counts them (decimal units, Spanish comma)', () => {
  assert.equal(formatBytes(undefined), undefined);
  assert.equal(formatBytes(0), undefined);
  assert.equal(formatBytes(820_000), '820 KB');
  assert.equal(formatBytes(3_420_000), '3,4 MB');
  assert.equal(formatBytes(148_300_000), '148 MB');
  assert.equal(formatBytes(1_240_000_000), '1,2 GB');
  assert.equal(formatBytes(24_600_000_000), '25 GB');
});

test('VHS shows the weight under the duration, and the fit counts both lines', () => {
  const asset = { id: 'v', kind: 'video', date: new Date(2021, 5, 17, 14, 25).getTime(), width: 1, height: 1, duration: 84, bytes: 148_300_000 };
  const layout = vhsLayout(asset, undefined, defaultDisplay.video);
  assert.deepEqual(layout.right, ['01:24', '148 MB']);
  assert.deepEqual(vhsLayout(asset, undefined, { ...defaultDisplay.video, size: false }).right, ['01:24']);
  assert.deepEqual(vhsLayout({ ...asset, bytes: undefined }, undefined, defaultDisplay.video).right, ['01:24']);
  assert.equal(normalizeDisplay({ video: { size: false } }).video.size, false);
  assert.equal(normalizeDisplay({}).cloud, 'save');
  assert.equal(normalizeDisplay({ cloud: 'always' }).cloud, 'always');
  const tall = fitOsd(['PM 02:25', 'JUN. 17 2021'], ['01:24', '148 MB'], { width: 340, height: 260 });
  const short = fitOsd(['PM 02:25', 'JUN. 17 2021'], ['01:24'], { width: 340, height: 260 });
  assert.ok(tall.pixel >= 1 && tall.pixel <= short.pixel);
});

test('a group member sent to «Más tarde» leaves its hand and comes back alone at the end', () => {
  const assets = [item('g1', 1, { group: 'g' }), item('g2', 2, { group: 'g' }), item('g3', 3, { group: 'g' }), item('x', 4)];
  const s = decide(initialState(), ['g1'], 'later', 1);
  assert.deepEqual(nextSessionHand(assets, s).map(a => a.id), ['g2', 'g3']);
  assert.deepEqual(upcomingSessionAssets(assets, s).map(a => a.id), ['g2', 'g3', 'x', 'g1']);
  const all = decide(decide(s, ['g2'], 'later', 2), ['g3'], 'later', 3);
  assert.equal(nextSessionHand(assets, all)[0].id, 'x');
  const onlyLater = decide(all, ['x'], 'keep', 4);
  assert.deepEqual(nextSessionHand(assets, onlyLater, initialFilter, 5).map(a => a.id), ['g1', 'g2', 'g3'], 'postponed members regroup once only they remain');
});
