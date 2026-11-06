import assert from 'node:assert/strict';
import test from 'node:test';
import { AD_GAP_MS, INTRO_MS, TEST_RULES, AdCadence } from '../src/adCadence.ts';

const ids = (offset, count) => Array.from({ length: count }, (_, i) => 'asset-' + (offset + i));

test('the pile letter waits a minute of sorting and counts distinct reviewed items (20–30)', () => {
  const cadence = new AdCadence(() => 0);
  cadence.review(ids(0, 19));
  cadence.review(ids(0, 19));
  assert.equal(cadence.between(INTRO_MS), false);
  cadence.review(ids(19, 1));
  assert.equal(cadence.between(INTRO_MS - 1), false);
  assert.equal(cadence.between(INTRO_MS), true);
});

test('long sessions keep a letter at most every 30 items, never closer than the gap', () => {
  const cadence = new AdCadence(() => 0.99);
  let now = INTRO_MS;
  for (let i = 0; i < 5; i++) {
    cadence.review(ids(i * 30, 29));
    assert.equal(cadence.between(now), false);
    cadence.review(ids(i * 30 + 29, 1));
    assert.equal(cadence.between(now), true);
    cadence.shown(now, 'deck');
    now += AD_GAP_MS;
  }
  cadence.review(ids(500, 30));
  assert.equal(cadence.between(now - 1), false);
});

test('a fixed letter resets the gap but not the count of the pile letter', () => {
  const cadence = new AdCadence(() => 0);
  cadence.review(ids(0, 20));
  cadence.shown(INTRO_MS, 'review');
  assert.equal(cadence.between(INTRO_MS + AD_GAP_MS - 1), false);
  assert.equal(cadence.between(INTRO_MS + AD_GAP_MS), true);
});

test('test mode shows the pile letter every 4–6 items', () => {
  const cadence = new AdCadence(() => 0, TEST_RULES);
  cadence.review(ids(0, 3));
  assert.equal(cadence.between(0), false);
  cadence.review(ids(3, 1));
  assert.equal(cadence.between(0), true);
});
