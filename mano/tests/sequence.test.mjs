import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, initialFilter, decide, undo, eligible, eligibleFrom, orderAssets, handOf, validateRecordState } from '../src/domain.ts';
import { NO_HAND, playable, lockedHand, dealHand, afterDecision, cycleHand, restoreHand, upcomingFrom } from '../src/sequence.ts';
import { saveSession, readSession } from '../src/session.ts';

const NOW = 1_800_000_000_000;
const photo = (id, date, extra = {}) => ({ id, kind: 'photo', date, width: 100, height: 150, duration: 0, ...extra });

/** The table exactly as ManoApp drives it: one canonical sequence, a locked
 * hand, decisions that record the shown hand, and undo that puts it back. */
class Table {
  constructor(assets, { filter = initialFilter, seed = 1 } = {}) { this.assets = assets; this.filter = filter; this.seed = seed; this.state = initialState(); this.lock = NO_HAND; this.selected = []; }
  get favView() { return this.filter.smart === 'favorites'; }
  get queue() { return eligibleFrom(orderAssets(this.assets, this.filter.order, this.seed), this.state, this.filter, NOW); }
  get hand() {
    const byId = new Map(this.assets.map(a => [a.id, a]));
    const shown = lockedHand(this.lock, byId, playable(this.state, this.favView));
    if (shown.length) return shown;
    this.lock = dealHand(this.queue, this.state.later); // the effect that locks a freshly dealt hand
    return lockedHand(this.lock, byId, playable(this.state, this.favView));
  }
  get front() { return this.hand[0]?.id; }
  context() { const hand = this.hand; return { handIds: hand.map(a => a.id), rotated: [], selected: [...this.selected], filter: this.filter, ...(this.lock.best ? { best: this.lock.best } : {}) }; }
  decide(action, ids) { const hand = this.hand; const targets = ids ?? [hand[0].id]; const context = this.context(); this.state = decide(this.state, targets, action, NOW, context); this.lock = afterDecision(hand, targets, this.lock.best); this.selected = []; }
  undo() { const last = this.state.history.at(-1); this.state = undo(this.state); this.lock = restoreHand(last.context, last.ids); this.selected = last.context?.selected ?? []; if (last.context?.filter) this.filter = last.context.filter; }
  cycle() { this.lock = cycleHand(this.hand, this.lock.best); }
  setFilter(filter) { this.filter = filter; this.lock = NO_HAND; this.selected = []; }
}
const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
const sequence = () => letters.map((id, i) => photo(id, i));

test('4.1: A → B → C, Deshacer devuelve exactamente B y luego A, con su estado anterior', () => {
  const t = new Table(sequence());
  assert.equal(t.front, 'A');
  const before = structuredClone(t.state);
  t.decide('discard'); assert.equal(t.front, 'B');
  const beforeB = structuredClone(t.state);
  t.decide('keep'); assert.equal(t.front, 'C');
  t.undo(); assert.equal(t.front, 'B'); assert.deepEqual(t.state, beforeB);
  t.undo(); assert.equal(t.front, 'A'); assert.deepEqual(t.state, before);
  // The rest keeps its relative order: no jumps, no duplicates, nothing lost.
  assert.deepEqual(t.queue.map(a => a.id), letters);
});

test('Deshacer varias veces y rehacer el mismo recorrido da la misma secuencia', () => {
  const t = new Table(sequence()); const seen = [];
  for (const action of ['keep', 'discard', 'keep', 'later']) { seen.push(t.front); t.decide(action); }
  const replay = [];
  for (let i = 0; i < 4; i++) { t.undo(); replay.unshift(t.front); }
  assert.deepEqual(replay, seen);
  assert.deepEqual(t.state, initialState());
});

test('alternar Eliminar, Conservar, Favorita y Más tarde, y deshacerlo todo, vuelve al punto de partida', () => {
  const t = new Table(Array.from({ length: 12 }, (_, i) => photo(`p${i}`, i)));
  const snapshots = []; const fronts = [];
  const actions = ['discard', 'keep', 'favorite', 'later', 'keep', 'discard', 'later', 'favorite', 'keep', 'discard'];
  for (const action of actions) { snapshots.push(structuredClone(t.state)); fronts.push(t.front); t.decide(action); }
  for (let i = actions.length - 1; i >= 0; i--) { t.undo(); assert.equal(t.front, fronts[i], `undo ${i}`); assert.deepEqual(t.state, snapshots[i]); }
});

test('acciones rápidas: cien decisiones seguidas no duplican ni saltan elementos', () => {
  const assets = Array.from({ length: 140 }, (_, i) => photo(`r${i}`, i));
  const t = new Table(assets); const fronts = [];
  for (let i = 0; i < 100; i++) { fronts.push(t.front); t.decide(i % 3 === 0 ? 'discard' : 'keep'); }
  assert.equal(new Set(fronts).size, 100);
  assert.deepEqual(fronts, assets.slice(0, 100).map(a => a.id));
  // History keeps the last ten decisions, and each one undoes exactly.
  for (let i = 99; i >= 90; i--) { t.undo(); assert.equal(t.front, fronts[i]); }
});

test('grupo con «Mejor toma»: Deshacer devuelve la foto decidida delante, no otra (regresión 0.9.2)', () => {
  // The demo's similar group: 12 is a low-quality shot, 11 the clear best.
  const quality = { g10: .1, g11: .62, g12: -.6, g13: .2 };
  const assets = [photo('s0', 0), ...['g13', 'g12', 'g11', 'g10'].map((id, i) => photo(id, 10 + i, { group: 'trip', quality: quality[id] })), photo('s9', 30)];
  const t = new Table(assets);
  t.decide('keep');
  assert.deepEqual(t.hand.map(a => a.id), ['g11', 'g13', 'g12', 'g10']);
  const fronts = [];
  while (t.hand.length && t.hand[0].group) { fronts.push(t.front); t.decide('keep'); }
  assert.deepEqual(fronts, ['g11', 'g13', 'g12', 'g10']);
  for (let i = fronts.length - 1; i >= 0; i--) { t.undo(); assert.equal(t.front, fronts[i]); }
  // Restored exactly as shown, «Mejor toma» included.
  assert.deepEqual(t.hand.map(a => a.id), ['g11', 'g13', 'g12', 'g10']);
  assert.equal(t.lock.best, 'g11');
});

test('«Siguiente» en un grupo y Deshacer devuelven el orden que se veía', () => {
  const assets = ['x1', 'x2', 'x3'].map((id, i) => photo(id, i, { group: 'x' }));
  const t = new Table(assets);
  t.cycle(); assert.deepEqual(t.hand.map(a => a.id), ['x2', 'x3', 'x1']);
  t.decide('discard'); assert.deepEqual(t.hand.map(a => a.id), ['x3', 'x1']);
  t.undo(); assert.deepEqual(t.hand.map(a => a.id), ['x2', 'x3', 'x1']);
});

test('Favoritas: marcar favorita y deshacer devuelve la foto; en «Favoritas» el corazón la quita y Deshacer la repone', () => {
  const t = new Table(sequence());
  t.decide('favorite'); assert.equal(t.front, 'B'); assert.deepEqual(t.state.favorites, ['A']);
  t.undo(); assert.equal(t.front, 'A'); assert.deepEqual(t.state.favorites, []);
  t.decide('favorite'); t.setFilter({ ...initialFilter, smart: 'favorites' });
  assert.equal(t.front, 'A');
  t.decide('unfavorite'); assert.equal(t.front, undefined);
  t.undo(); assert.equal(t.front, 'A'); assert.deepEqual(t.state.favorites, ['A']);
});

test('Más tarde: Deshacer vuelve a poner cada aplazada exactamente en su sitio', () => {
  let s = initialState();
  for (const id of ['x', 'y', 'z']) s = decide(s, [id], 'later', NOW);
  assert.deepEqual(s.later, ['x', 'y', 'z']);
  const kept = decide(s, ['x'], 'keep', NOW); assert.deepEqual(undo(kept).later, ['x', 'y', 'z']);
  const again = decide(s, ['y'], 'later', NOW); assert.deepEqual(again.later, ['x', 'z', 'y']); assert.deepEqual(undo(again).later, ['x', 'y', 'z']);
  const both = decide(s, ['z', 'x'], 'discard', NOW); assert.deepEqual(undo(both).later, ['x', 'y', 'z']);
  // Survives a save/restore of the record.
  assert.deepEqual(undo(validateRecordState(JSON.parse(JSON.stringify(again)))).later, ['x', 'y', 'z']);
});

test('imágenes que terminan fuera de orden o grupos que llegan tarde no cambian la mano en pantalla', () => {
  const assets = Array.from({ length: 8 }, (_, i) => photo(`a${i}`, i));
  const t = new Table(assets);
  t.decide('keep'); assert.equal(t.front, 'a1');
  // Vision groups a1 with a6 while a1 is on screen: the table does not move.
  t.assets = assets.map(a => ['a1', 'a6'].includes(a.id) ? { ...a, group: 'late', quality: a.id === 'a6' ? .9 : -.5 } : a);
  assert.deepEqual(t.hand.map(a => a.id), ['a1']);
  t.decide('keep'); assert.equal(t.front, 'a2');
  // The window only reads the locked hand and the pile; no completion order is involved.
  assert.deepEqual(upcomingFrom(t.queue, t.hand, t.state.later, 6).map(a => a.id), ['a2', 'a3', 'a4', 'a5', 'a6', 'a7']);
});

test('cambiar filtros reparte una mano nueva y Deshacer vuelve al filtro y a la foto anteriores', () => {
  const assets = [photo('p1', 1), { ...photo('v1', 2), kind: 'video' }, photo('p2', 3), { ...photo('v2', 4), kind: 'video' }];
  const t = new Table(assets);
  t.decide('keep'); assert.equal(t.front, 'v1');
  t.setFilter({ ...initialFilter, media: 'photo' }); assert.equal(t.front, 'p2');
  t.decide('discard'); assert.equal(t.front, undefined);
  t.undo(); assert.equal(t.front, 'p2'); assert.equal(t.filter.media, 'photo');
  t.undo(); assert.equal(t.front, 'p1'); assert.equal(t.filter.media, 'all');
});

test('restaurar o reanudar la sesión vuelve a la misma mano y Deshacer sigue funcionando', () => {
  const t = new Table(['m1', 'm2', 'm3', 'm4'].map((id, i) => photo(id, i, { group: 'm' })));
  t.cycle(); t.decide('keep');
  const memory = new Map(); const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  assert.equal(saveSession('s', { version: 1, active: true, seed: 1, filter: t.filter, context: t.context(), updatedAt: NOW, record: t.state }, storage), true);
  const back = readSession('s', storage);
  const resumed = new Table(t.assets); resumed.state = back.record; resumed.lock = restoreHand(back.context, []);
  assert.deepEqual(resumed.hand.map(a => a.id), t.hand.map(a => a.id));
  resumed.undo(); assert.deepEqual(resumed.hand.map(a => a.id), ['m2', 'm3', 'm4', 'm1']);
});

test('registros anteriores a 0.9.3 (mano sin rotar + rotated) se restauran en el orden mostrado', () => {
  assert.deepEqual(restoreHand({ handIds: ['a', 'b', 'c'], rotated: ['a'], selected: [] }, []).ids, ['b', 'c', 'a']);
  assert.deepEqual(restoreHand(undefined, ['z']).ids, ['z']);
});

test('final del búfer y reposición: la ventana se desliza sin duplicar y se acorta al final', () => {
  const assets = Array.from({ length: 9 }, (_, i) => photo(`w${i}`, i));
  const t = new Table(assets);
  const windows = [];
  for (let i = 0; i < 9; i++) { windows.push(upcomingFrom(t.queue, t.hand, t.state.later, 6).map(a => a.id)); t.decide('keep'); }
  assert.deepEqual(windows[0], ['w0', 'w1', 'w2', 'w3', 'w4', 'w5']);
  assert.deepEqual(windows[3], ['w3', 'w4', 'w5', 'w6', 'w7', 'w8']);
  assert.deepEqual(windows[7], ['w7', 'w8']);
  for (const w of windows) assert.equal(new Set(w).size, w.length);
  assert.equal(t.front, undefined);
});

test('un elemento borrado fuera de CocoWash sale de la mesa sin saltarse el siguiente', () => {
  const t = new Table(sequence());
  t.decide('keep'); assert.equal(t.front, 'B');
  t.assets = t.assets.filter(a => a.id !== 'B'); // gone from Photos (library refresh)
  assert.equal(t.front, 'C');
  t.undo(); assert.equal(t.front, 'A');
  // Undo of a decision whose item vanished: the table deals the next valid one.
  const u = new Table(sequence()); u.decide('keep'); u.assets = u.assets.filter(a => a.id !== 'A'); u.undo(); assert.equal(u.front, 'B');
});

test('eligibleFrom sobre la secuencia ordenada equivale a la ordenación completa anterior', () => {
  const reference = (assets, state, filter, now, seed) => {
    const hash = (id, s) => { let n = s | 0; for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
    const bySize = (a, b, d) => { const x = a.bytes ?? 0, y = b.bytes ?? 0; if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1); return (x - y) * d; };
    const rank = new Map((state.later ?? []).map((id, i) => [id, i + 1])); const postponedLast = filter.smart !== 'later';
    const members = new Set(eligible(assets, state, filter, now, seed).map(a => a.id));
    return assets.filter(a => members.has(a.id)).sort((a, b) => { // library order in, like the old implementation
      if (postponedLast) { const w = (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0); if (w) return w; }
      if (filter.smart === 'text') { const t = (b.text ?? 0) - (a.text ?? 0); if (t) return t; }
      const p = (state.marks[a.id]?.level ?? 0) - (state.marks[b.id]?.level ?? 0); if (p) return p;
      switch (filter.order) { case 'random': return hash(a.id, seed) - hash(b.id, seed); case 'newest': return b.date - a.date; case 'largest': return bySize(a, b, -1) || a.date - b.date; case 'smallest': return bySize(a, b, 1) || a.date - b.date; default: return a.date - b.date; }
    });
  };
  let r = 7; const rnd = () => (r = Math.imul(r ^ r >>> 15, 2246822507) >>> 0) / 4294967296;
  for (let round = 0; round < 40; round++) {
    const assets = Array.from({ length: 60 }, (_, i) => photo(`q${i}`, Math.floor(rnd() * 20), { bytes: rnd() < .7 ? Math.floor(rnd() * 5e6) : undefined, text: rnd() < .2 ? (rnd() < .5 ? 1 : .5) : 0 }));
    let state = initialState();
    for (const a of assets) { const x = rnd(); if (x < .2) state = decide(state, [a.id], 'keep', NOW - 30 * 86400000); else if (x < .3) state = decide(state, [a.id], 'later', NOW); else if (x < .35) state = decide(state, [a.id], 'discard', NOW); }
    for (const order of ['oldest', 'newest', 'largest', 'smallest', 'random']) for (const smart of ['all', 'later', 'text']) for (const includeWaiting of [false, true]) {
      const filter = { ...initialFilter, order, smart, includeWaiting };
      const ordered = eligibleFrom(orderAssets(assets, order, 42), state, filter, NOW).map(a => a.id);
      assert.deepEqual(ordered, reference(assets, state, filter, NOW, 42).map(a => a.id), `${round} ${order} ${smart} ${includeWaiting}`);
    }
  }
});

test('upcomingFrom equivale a repartir mano tras mano', () => {
  let r = 3; const rnd = () => (r = Math.imul(r ^ r >>> 15, 2246822507) >>> 0) / 4294967296;
  for (let round = 0; round < 30; round++) {
    const assets = Array.from({ length: 40 }, (_, i) => photo(`u${i}`, i, rnd() < .5 ? { group: `g${Math.floor(rnd() * 5)}` } : {}));
    let state = initialState(); for (const a of assets) if (rnd() < .15) state = decide(state, [a.id], 'later', NOW);
    const queue = eligible(assets, state, initialFilter, NOW);
    let rest = queue; const expected = [];
    while (rest.length && expected.length < 12) { const hand = handOf(rest, rest[0], state.later); for (const a of hand) if (expected.length < 12) expected.push(a.id); const ids = new Set(hand.map(a => a.id)); rest = rest.filter(a => !ids.has(a.id)); }
    assert.deepEqual(upcomingFrom(queue, [], state.later, 12).map(a => a.id), expected, `round ${round}`);
  }
});
