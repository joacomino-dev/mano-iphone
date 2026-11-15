import test from 'node:test';
import assert from 'node:assert/strict';
import { repeatedPress } from '../src/textInteraction.ts';

test('photo gestures: only a nearby second press inside the time window suppresses text selection', () => {
  const previous = { clientX: 100, clientY: 100, time: 1000 };
  assert.equal(repeatedPress(undefined, previous, 1100), false);
  assert.equal(repeatedPress(previous, { clientX: 110, clientY: 105 }, 1250), true);
  assert.equal(repeatedPress(previous, previous, 1400), false);
  assert.equal(repeatedPress(previous, { clientX: 144, clientY: 100 }, 1100), false);
  assert.equal(repeatedPress(previous, previous, 999), false);
});
