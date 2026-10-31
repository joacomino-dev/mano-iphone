import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, initialFilter, decide, filterScope } from '../src/domain.ts';
import { formatDate, formatTime, formatDuration, placeLabel, polaroidCaption, vhsLayout, normalizeDisplay, defaultDisplay, readDisplay, saveDisplay } from '../src/meta.ts';
import { osdText, pixelPath } from '../src/pixelfont.ts';

const at = new Date(2021, 5, 17, 14, 25).getTime();
const asset = (id, extra = {}) => ({ id, kind: 'photo', date: at, width: 100, height: 150, duration: 0, ...extra });
const video = { ...asset('v'), kind: 'video', duration: 84 };
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) }; };

test('date formats cover the four offered patterns and never render unknown dates', () => {
  assert.equal(formatDate(at, 'dmy', 'es'), '17/06/2021');
  assert.equal(formatDate(at, 'iso', 'es'), '2021-06-17');
  assert.equal(formatDate(at, 'd-mon-y', 'es', true), '17 JUN 2021');
  assert.equal(formatDate(at, 'mon-d-y', 'es', true), 'JUN. 17 2021');
  for (const missing of [0, -1, NaN, undefined]) assert.equal(formatDate(missing, 'dmy'), undefined);
});
test('time keeps 24 h, 12 h and the camcorder meridiem-first order', () => {
  assert.equal(formatTime(at, false), '14:25');
  assert.equal(formatTime(at, true), '02:25 PM');
  assert.equal(formatTime(at, true, true), 'PM 02:25');
  assert.equal(formatTime(new Date(2021, 0, 1, 0, 5).getTime(), true, true), 'AM 12:05');
});
test('duration is MM:SS below an hour, HH:MM:SS above, absent when unknown', () => {
  assert.equal(formatDuration(84), '01:24');
  assert.equal(formatDuration(0.4), '00:01');
  assert.equal(formatDuration(3723), '01:02:03');
  assert.equal(formatDuration(0), undefined);
  assert.equal(formatDuration(NaN), undefined);
});
test('place labels drop missing parts and long countries, never invent', () => {
  assert.equal(placeLabel({ locality: 'Quito', country: 'Ecuador' }, true), 'QUITO, ECUADOR');
  assert.equal(placeLabel({ locality: 'Quito' }), 'Quito');
  assert.equal(placeLabel({ country: 'Ecuador' }), 'Ecuador');
  assert.equal(placeLabel({}), undefined);
  assert.equal(placeLabel(undefined), undefined);
  assert.equal(placeLabel({ locality: 'Santa Cruz de la Sierra', country: 'Bolivia' }, false, 26), 'Santa Cruz de la Sierra');
});
test('VHS layout adapts to every combination of available data (cases A–D)', () => {
  const all = defaultDisplay.video;
  const A = vhsLayout(video, { locality: 'Quito', country: 'Ecuador' }, all, 'es');
  assert.deepEqual(A.lines, ['PM 02:25', 'JUN. 17 2021', 'QUITO, ECUADOR']); assert.equal(A.duration, '01:24');
  const B = vhsLayout(video, undefined, all, 'es');
  assert.deepEqual(B.lines, ['PM 02:25', 'JUN. 17 2021']); assert.equal(B.duration, '01:24');
  const C = vhsLayout({ ...video, date: 0 }, { locality: 'Quito', country: 'Ecuador' }, all, 'es');
  assert.deepEqual(C.lines, ['QUITO, ECUADOR']); assert.equal(C.duration, '01:24');
  const D = vhsLayout({ ...video, date: 0 }, undefined, all, 'es');
  assert.deepEqual(D.lines, []); assert.equal(D.duration, '01:24'); assert.equal(D.empty, false);
  const off = vhsLayout(video, { locality: 'Quito' }, { ...all, date: false, time: false, location: false, duration: false }, 'es');
  assert.equal(off.empty, true);
});
test('polaroid caption hides empty fields and respects the toggles', () => {
  const photo = defaultDisplay.photo;
  assert.deepEqual(polaroidCaption(asset('a'), { locality: 'Lisboa', country: 'Portugal' }, photo, 'es'), { where: 'Lisboa, Portugal', when: '17 jun 2021', empty: false });
  assert.deepEqual(polaroidCaption(asset('a', { date: 0 }), undefined, photo, 'es'), { where: undefined, when: undefined, empty: true });
  assert.equal(polaroidCaption(asset('a'), undefined, { ...photo, time: true }, 'es').when, '17 jun 2021 · 14:25');
});
test('display settings validate, persist and fall back without throwing', () => {
  const storage = memory();
  assert.deepEqual(readDisplay(storage), defaultDisplay);
  assert.equal(saveDisplay({ ...defaultDisplay, photo: { ...defaultDisplay.photo, dateFormat: 'iso', location: false } }, storage), true);
  assert.equal(readDisplay(storage).photo.dateFormat, 'iso'); assert.equal(readDisplay(storage).photo.location, false);
  assert.deepEqual(normalizeDisplay({ photo: { dateFormat: 'bogus', date: 'yes' }, haptics: 0 }), defaultDisplay);
});
test('counter scope follows every active filter and the capture date', () => {
  const now = at + 3600000;
  const items = [asset('recent'), asset('old', { date: at - 3 * 86400000 }), { ...asset('clip'), kind: 'video' }];
  const day = { ...initialFilter, dateRange: '24h' };
  assert.deepEqual(filterScope(items, initialState(), day, now), { total: 2, remaining: 2, reviewed: 0 });
  assert.deepEqual(filterScope(items, initialState(), { ...day, media: 'video' }, now), { total: 1, remaining: 1, reviewed: 0 });
  const kept = decide(initialState(), ['recent'], 'keep', now);
  assert.deepEqual(filterScope(items, kept, day, now), { total: 2, remaining: 1, reviewed: 1 });
  assert.deepEqual(filterScope(items, initialState(), { ...initialFilter, dateRange: 'custom', from: '2030-01-01', to: '2030-01-02' }, now), { total: 0, remaining: 0, reviewed: 0 });
  // A seal filter keeps what was decided under it in scope after its seal changes.
  const none = { ...initialFilter, seal: 'none' };
  assert.deepEqual(filterScope(items, kept, none, now, new Set(['recent'])), { total: 3, remaining: 2, reviewed: 1 });
});
test('OSD font folds accents, keeps Ñ, and draws only known glyph runs', () => {
  assert.equal(osdText('Bogotá, España'), 'BOGOTA, ESPAÑA');
  const { d, width } = pixelPath('AM 02:25');
  assert.ok(d.length > 0); assert.equal(width, 40);
  assert.match(d, /^M\d+ \d+h\d+v1h-\d+z/);
});
