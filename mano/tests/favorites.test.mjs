import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeFavorites, favoritesToSend, queueFavorites, withoutFavorites } from '../src/favoritePending.ts';

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

test('an in-flight gallery change keeps the opposite undo as explicit pending work',()=>{
  assert.deepEqual(queueFavorites({a:true},['a'],false,{a:true}),{a:false});
  assert.deepEqual(queueFavorites({a:false},['a'],true,{a:false}),{a:true});
  // Before any native request, the original round-level cancellation stays.
  assert.deepEqual(queueFavorites({a:true},['a'],false),{});
});

test('old acknowledgement only clears matching intents in its own batch',()=>{
  assert.deepEqual(acknowledgeFavorites({a:false,b:true,c:true},['a','b'],true),{a:false,c:true});
  assert.deepEqual(acknowledgeFavorites({a:true,b:false},['b'],false),{a:true});
});
