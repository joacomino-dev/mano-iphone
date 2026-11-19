import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPS_KEY, countDecision, markSeen, nextTip, readTips, resetSeen, saveTips, ZOOM_AFTER, ANCHOR_AFTER, ALBUM_AFTER_KEEPS } from '../src/tips.ts';

const fresh = () => ({ seen: [], decisions: 0, keeps: 0, lastAt: -2 });
const moment = (over = {}) => ({ calm: true, hand: 1, front: 'photo', albums: true, ...over });
const after = (n, keeps = 0) => ({ ...fresh(), decisions: n, keeps });

test('the stack tip shows the first time a group is on the pile', () => {
  assert.equal(nextTip(fresh(), moment({ hand: 3 })), 'stack');
  assert.equal(nextTip(fresh(), moment({ hand: 1 })), null);
  assert.equal(nextTip(markSeen(fresh(), 'stack'), moment({ hand: 3 })), null, 'once only');
});

test('nothing shows over something else: sheets, anchored view, grid, a gesture, an empty pile', () => {
  assert.equal(nextTip(fresh(), moment({ hand: 3, calm: false })), null);
  assert.equal(nextTip(fresh(), moment({ hand: 3, front: null })), null);
});

test('zoom after a few decisions on a single photo; never on a video', () => {
  assert.equal(nextTip(after(ZOOM_AFTER - 1), moment()), null);
  assert.equal(nextTip(after(ZOOM_AFTER), moment()), 'zoom');
  assert.equal(nextTip(after(ZOOM_AFTER), moment({ front: 'video' })), null);
  assert.equal(nextTip(after(ZOOM_AFTER), moment({ front: 'live' })), 'zoom');
});

test('anchoring comes after zoom, a couple of cards later, never two tips in a row', () => {
  let state = after(ANCHOR_AFTER);
  state = markSeen(state, 'zoom');
  assert.equal(state.lastAt, ANCHOR_AFTER);
  assert.equal(nextTip(state, moment()), null, 'right after a tip, the next one waits');
  state = countDecision(countDecision(state, 'later'), 'later');
  assert.equal(nextTip(state, moment()), 'anchor');
  assert.equal(nextTip({ ...after(20), seen: [] }, moment({ front: 'video' })), null);
});

test('albums once keeping is a habit, and only where «Álbum» exists', () => {
  const keeper = { ...after(10, ALBUM_AFTER_KEEPS), seen: ['stack', 'zoom', 'anchor'] };
  assert.equal(nextTip(keeper, moment()), 'album');
  assert.equal(nextTip(keeper, moment({ albums: false })), null, 'Android has no «Álbum» button');
  assert.equal(nextTip({ ...keeper, keeps: ALBUM_AFTER_KEEPS - 1 }, moment()), null);
});

test('counting decisions and showing them again from Ajustes', () => {
  let state = countDecision(countDecision(fresh(), 'keep'), 'discard');
  assert.deepEqual([state.decisions, state.keeps], [2, 1]);
  state = resetSeen(markSeen(state, 'stack'));
  assert.deepEqual(state.seen, []);
  assert.equal(state.decisions, 2, 'the counts stay');
});

test('stored state survives reloads and damaged values', () => {
  const data = new Map(); const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  saveTips(markSeen(after(4, 2), 'stack'), storage);
  assert.deepEqual(readTips(storage), { seen: ['stack'], decisions: 4, keeps: 2, lastAt: 4 });
  data.set(TIPS_KEY, '{"seen":["stack","bogus"],"decisions":-3}');
  assert.deepEqual(readTips(storage), { seen: ['stack'], decisions: 0, keeps: 0, lastAt: -2 });
  data.set(TIPS_KEY, 'not json');
  assert.deepEqual(readTips(storage).seen, []);
});
