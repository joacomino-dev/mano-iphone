import test from 'node:test';
import assert from 'node:assert/strict';
import { favoritesToSend, queueFavorites, withoutFavorites } from '../src/favoritePending.ts';

test('a heart and its undo before the round ends send nothing to the gallery', () => {
  let pending = queueFavorites({}, ['a', 'b'], true);
  assert.deepEqual(pending, { a: true, b: true });
  pending = queueFavorites(pending, ['a'], false);
  assert.deepEqual(pending, { b: true });
});

test('removing a gallery favourite is queued, and re-adding it cancels the change', () => {
  let pending = queueFavorites({}, ['x'], false);
  assert.deepEqual(favoritesToSend(pending, false), ['x']);
  pending = queueFavorites(pending, ['x'], true);
  assert.deepEqual(pending, {});
});

test('batches per value, optionally limited to some items, and cleared once sent', () => {
  const pending = { a: true, b: false, c: false };
  assert.deepEqual(favoritesToSend(pending, true), ['a']);
  assert.deepEqual(favoritesToSend(pending, false), ['b', 'c']);
  assert.deepEqual(favoritesToSend(pending, false, ['c', 'z']), ['c']);
  assert.deepEqual(withoutFavorites(pending, ['b', 'c']), { a: true });
});
