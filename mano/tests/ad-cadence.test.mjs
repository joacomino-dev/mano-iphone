import assert from 'node:assert/strict';
import test from 'node:test';
import { TEST_RULES, AdCadence } from '../src/adCadence.ts';

const ids = (offset, count) => Array.from({ length: count }, (_, i) => 'asset-' + (offset + i));

// 1.2 (user, 2026-11-25): a letter every 15–20 decided photos, from the first one, with no time gate.
test('the pile letter comes after 15 distinct reviewed items at the earliest', () => {
  const cadence = new AdCadence(() => 0);
  cadence.review(ids(0, 14));
  cadence.review(ids(0, 14));
  assert.equal(cadence.between(0), false, 'the same items twice do not count twice');
  cadence.review(ids(14, 1));
  assert.equal(cadence.between(0), true, 'no minute of sorting is required');
});

test('every letter lands between 15 and 20 items, in a long session too', () => {
  for (const roll of [0, 0.5, 0.99]) {
    const cadence = new AdCadence(() => roll);
    let offset = 0;
    for (let round = 0; round < 6; round++) {
      let count = 0;
      while (!cadence.between(round * 1000)) { cadence.review(ids(offset++, 1)); count++; }
      assert.ok(count >= 15 && count <= 20, `letter after ${count} items (roll ${roll})`);
      cadence.shown(round * 1000, 'deck');
    }
  }
});

test('a fixed letter (review, summary) neither delays nor advances the pile letter', () => {
  const cadence = new AdCadence(() => 0);
  cadence.review(ids(0, 15));
  cadence.shown(0, 'review');
  assert.equal(cadence.between(0), true);
});

test('test mode shows the pile letter every 4–6 items', () => {
  const cadence = new AdCadence(() => 0, TEST_RULES);
  cadence.review(ids(0, 3));
  assert.equal(cadence.between(0), false);
  cadence.review(ids(3, 1));
  assert.equal(cadence.between(0), true);
});
