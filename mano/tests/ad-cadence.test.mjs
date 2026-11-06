import assert from 'node:assert/strict';
import test from 'node:test';
import { AD_GAP_MS, INTRO_MS, AdCadence } from '../src/adCadence.ts';

const ids = (offset, count) => Array.from({ length: count }, (_, i) => 'asset-' + (offset + i));

test('deck respects the initial grace and counts distinct reviewed items', () => {
  const cadence = new AdCadence(() => 0);
  cadence.review(ids(0, 19));
  cadence.review(ids(0, 19));
  assert.equal(cadence.between(INTRO_MS), false);
  cadence.review(ids(19, 1));
  assert.equal(cadence.between(INTRO_MS - 1), false);
  assert.equal(cadence.between(INTRO_MS), true);
});

test('long cleaning sessions can show more than two deck ads, at most 30 reviews apart', () => {
  const cadence = new AdCadence(() => 0.99);
  for (let i = 0; i < 5; i++) {
    cadence.review(ids(i * 30, 29));
    assert.equal(cadence.between(INTRO_MS), false);
    cadence.review(ids(i * 30 + 29, 1));
    assert.equal(cadence.between(INTRO_MS), true);
    cadence.shown(INTRO_MS, 'deck');
  }
});

test('first eligible finish retries when no ad renders; subsequent finishes are capped at two per day', () => {
  const cadence = new AdCadence();
  const day = '2026-11-05';
  assert.equal(cadence.finish(INTRO_MS - 1, day), false);
  cadence.shown(INTRO_MS, 'deck');
  assert.equal(cadence.finish(INTRO_MS, day), true);
  cadence.missedFinish();
  assert.equal(cadence.finish(INTRO_MS, day), true);
  cadence.shown(INTRO_MS, 'finish');
  assert.equal(cadence.finish(INTRO_MS + AD_GAP_MS - 1, day), false);
  const later = INTRO_MS + AD_GAP_MS;
  assert.equal(cadence.finish(later, day), false);
  assert.equal(cadence.finish(later, day), false);
  assert.equal(cadence.finish(later, day), true);
  cadence.shown(later, 'finish');
  const reopened = new AdCadence(Math.random, cadence.finishSnapshot());
  assert.equal(reopened.finish(later + AD_GAP_MS, day), false);
  assert.equal(reopened.finish(later + AD_GAP_MS, '2026-11-06'), false);
  assert.equal(reopened.finish(later + AD_GAP_MS, '2026-11-06'), false);
  assert.equal(reopened.finish(later + AD_GAP_MS, '2026-11-06'), true);
});

test('test mode shows deck ads every 4-6 reviewed items and a finish card every other close', async () => {
  const { TEST_RULES } = await import('../src/adCadence.ts');
  const cadence = new AdCadence(() => 0, undefined, TEST_RULES);
  cadence.review(ids(0, 3));
  assert.equal(cadence.between(0), false);
  cadence.review(ids(3, 1));
  assert.equal(cadence.between(0), true);
  for (let i = 0; i < 5; i++) { assert.equal(cadence.finish(0, '2026-11-05'), true); cadence.shown(0, 'finish'); assert.equal(cadence.finish(0, '2026-11-05'), false); }
});

test('the review letter gives way when the summary letter is due, so they take turns', async () => {
  const { TEST_RULES } = await import('../src/adCadence.ts');
  const cadence = new AdCadence(() => 0, undefined, TEST_RULES);
  const day = '2026-11-05';
  assert.equal(cadence.finishDue(0, day), true);
  assert.equal(cadence.finish(0, day), true); cadence.shown(0, 'finish');
  assert.equal(cadence.finishDue(0, day), false);
  assert.equal(cadence.finish(0, day), false);
  assert.equal(cadence.finishDue(0, day), true);
});
