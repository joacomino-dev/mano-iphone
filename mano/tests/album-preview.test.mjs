import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, initialFilter, decide, undo, eligible } from '../src/domain.ts';
import { assignToAlbum, afterAlbum } from '../src/album.ts';
import { PREVIEW_PROFILES, PREVIEW_MAX, cardBox, previewSize, normalizeQuality, cacheBytes } from '../src/preview.ts';
import { normalizeDisplay, defaultDisplay } from '../src/meta.ts';
import { fitOsd } from '../src/pixelfont.ts';

const now = 1_700_000_000_000;
const photo = (id, extra = {}) => ({ id, kind: 'photo', date: now - 1000, width: 1000, height: 1500, duration: 0, ...extra });

test('album: a confirmed assignment keeps the photo, as one undoable decision, and it leaves the pile', async () => {
  const assets = [photo('a'), photo('b')];
  const outcome = await assignToAlbum(async () => ({ title: 'Viajes', added: 1 }), ['a']);
  assert.deepEqual(outcome, { ok: true, title: 'Viajes', added: 1 });
  const kept = afterAlbum(initialState(), ['a'], outcome, now);
  assert.equal(kept.marks.a.level, 1);
  assert.equal(kept.history.at(-1).action, 'keep');
  assert.deepEqual(kept.history.at(-1).ids, ['a']);
  assert.ok(!eligible(assets, kept, initialFilter, now).some(a => a.id === 'a'), 'advances: the kept photo rests');
  assert.deepEqual(undo(kept), { ...initialState(), history: [] }, 'undo restores the decision (not the album membership)');
});

test('album: a failed or empty assignment neither keeps nor advances', async () => {
  const state = decide(initialState(), ['x'], 'discard', now);
  const failed = await assignToAlbum(async () => { throw new Error('Fotos no respondió'); }, ['a']);
  assert.equal(failed.ok, false);
  assert.equal(failed.error.message, 'Fotos no respondió');
  assert.equal(afterAlbum(state, ['a'], failed, now), state, 'same state object: nothing changed');
  const empty = await assignToAlbum(async () => ({ title: 'Nunca' }), []);
  assert.equal(empty.ok, false);
});

test('album: favourites and pending discards are not re-decided by the keep', async () => {
  const state = decide(decide(initialState(), ['f'], 'favorite', now), ['d'], 'discard', now);
  const ok = await assignToAlbum(async () => ({ title: 'Mix' }), ['f', 'd', 'k']);
  const next = afterAlbum(state, ['f', 'd', 'k'], ok, now);
  assert.deepEqual(next.history.at(-1).ids, ['k']);
  assert.ok(next.pending.includes('d') && next.favorites.includes('f'));
});

test('preview: profiles grow from fast to high and respect the native cap', () => {
  const css = 360, scale = 3;
  const card = q => previewSize(q, 'card', css, scale), zoom = q => previewSize(q, 'zoom', css, scale);
  assert.ok(card('fast') < card('balanced') && card('balanced') < card('high'));
  assert.ok(zoom('fast') < zoom('balanced') && zoom('balanced') < zoom('high'));
  for (const q of ['fast', 'balanced', 'high']) {
    assert.equal(card(q) % 128, 0, 'bucketed so nearby sizes share one cached file');
    assert.ok(card(q) <= PREVIEW_PROFILES[q].cardMax);
    assert.ok(zoom(q) <= PREVIEW_MAX && zoom(q) >= card(q), 'the anchored version is never smaller than the card');
  }
  assert.equal(previewSize('balanced', 'card', 360, 3), 1152, 'balanced = CSS size × screen scale (360 × 3 → 1080 → 1152)');
  assert.equal(previewSize('fast', 'card', 360, 3), 768, 'fast caps the scale at 2×');
  assert.equal(previewSize('high', 'zoom', 360, 3), 3072);
  assert.ok(previewSize('balanced', 'card', 360, 3) > 900, 'sharper than the former fixed 900 px on a 3× iPhone');
});

test('preview: bad input falls back to safe sizes and the balanced profile', () => {
  assert.equal(normalizeQuality('ultra'), 'balanced');
  assert.equal(normalizeQuality('high'), 'high');
  assert.ok(previewSize('balanced', 'card', NaN, 0) >= 256);
  assert.ok(previewSize('nope', 'card', 360, 3) > 0);
  assert.equal(cacheBytes('fast'), 150 * 1024 * 1024);
  assert.equal(normalizeDisplay({ quality: 'x' }).quality, 'balanced');
  assert.equal(normalizeDisplay({ quality: 'fast' }).quality, 'fast');
  assert.equal(defaultDisplay.quality, 'balanced');
});

test('preview: card geometry is aspect-correct and fits the stage', () => {
  const stage = { width: 360, height: 520 };
  for (const asset of [photo('p'), photo('l', { width: 1500, height: 1000 }), photo('v', { kind: 'video', width: 1600, height: 1200 })]) {
    const box = cardBox(stage, asset);
    assert.ok(Math.abs(box.imageWidth / box.imageHeight - asset.width / asset.height) < 1e-9);
    assert.ok(box.cardWidth <= stage.width && box.cardHeight <= stage.height);
  }
  assert.equal(cardBox(stage, photo('p')).margin, 40, 'Polaroid: 8 px side + 32 px caption band');
  assert.equal(cardBox(stage, photo('v', { kind: 'video' })).margin, 24, 'tape: 8 px side + 16 px foot');
});

test('VHS OSD fits the visible frame: shrinks first, then drops the place line', () => {
  const lines = ['PM 02:25', 'JUN. 17 2021', 'CARTAGENA, COLOMBIA'];
  const wide = fitOsd(lines, '01:24', { width: 340, height: 260 }, lines[2]);
  assert.equal(wide.lines.length, 3);
  assert.ok(wide.pixel >= 1.5 && wide.pixel <= 3);
  const narrow = fitOsd(lines, '01:24', { width: 150, height: 110 }, lines[2]);
  assert.ok(narrow.pixel <= wide.pixel);
  assert.ok(!narrow.lines.includes(lines[2]), 'place drops before anything overflows');
  assert.ok(narrow.pad >= 8);
});
