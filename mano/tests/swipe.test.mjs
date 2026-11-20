import test from 'node:test';
import assert from 'node:assert/strict';
import { DECIDE_X, DECIDE_Y, FLICK_MIN, swipeZone, swipeDecision, releaseVelocity, holdBecomesSwipe } from '../src/swipe.ts';

test('the stamp arms exactly where letting go decides, on the leading axis', () => {
  for (const [dx, dy] of [[DECIDE_X, 0], [-DECIDE_X, 5], [0, -DECIDE_Y], [3, DECIDE_Y], [DECIDE_X - 1, 0], [80, 75], [-30, 90]]) {
    assert.equal(swipeZone(dx, dy) || null, swipeDecision(dx, dy), `${dx},${dy}`);
  }
  assert.equal(swipeZone(-90, -85), '', 'a diagonal never picks a side');
  assert.equal(swipeZone(-90, 30), 'discard');
});

test('a quick flick decides over a short distance; a slow nudge does not', () => {
  assert.equal(swipeDecision(-FLICK_MIN, 0, -.6, 0), 'discard');
  assert.equal(swipeDecision(FLICK_MIN + 4, 2, .5, 0), 'keep');
  assert.equal(swipeDecision(0, -30, 0, -.7), 'favorite');
  assert.equal(swipeDecision(-FLICK_MIN + 2, 0, -2, 0), null, 'too short even when fast');
  assert.equal(swipeDecision(-40, 0, -.1, 0), null, 'too slow');
  assert.equal(swipeDecision(-40, 0, .8, 0), null, 'a flick back the other way is not a decision');
});

test('release speed is read over the last moments of the drag', () => {
  const samples = [{ t: 0, x: 0, y: 0 }, { t: 200, x: -5, y: 0 }, { t: 260, x: -35, y: 0 }, { t: 290, x: -50, y: 0 }];
  const { vx } = releaseVelocity(samples);
  assert.ok(vx < -.4, `vx ${vx}`);
  assert.deepEqual(releaseVelocity([{ t: 0, x: 0, y: 0 }]), { vx: 0, vy: 0 });
});

test('a rest followed by a clear sideways travel is a swipe, a downward one stays a look', () => {
  assert.equal(holdBecomesSwipe(-DECIDE_X - 4, 10), true);
  assert.equal(holdBecomesSwipe(-30, 0), false);
  assert.equal(holdBecomesSwipe(20, 120), false);
});
