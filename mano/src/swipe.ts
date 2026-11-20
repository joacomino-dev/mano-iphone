/** How the pile reads a swipe (shared by ManoApp and the first-launch practice, so the
 * practice teaches exactly what the pile does). User report, 2026-11-19: swipes that
 * «moved a little and were ignored». Three rules fix that:
 *
 * 1. What you see is what you get: the stamp arms at the same distance at which letting
 *    go decides, and with the same leading axis (before, it armed at 45 px but only
 *    decided at 65/70 px, and armed on the trailing axis of a diagonal).
 * 2. A quick flick decides, like every phone list: enough speed along the leading axis
 *    over a short distance (before, only distance counted, so flicks sprang back).
 * 3. Decisions need one axis to clearly lead, so a diagonal never picks the wrong side. */

export type SwipeKind = 'keep' | 'discard' | 'favorite' | 'later';
/** Release distances (px): across, and up/down (vertical drags move the card at 55 %). */
export const DECIDE_X = 56, DECIDE_Y = 64;
/** A flick: at least this speed (px/ms) along the leading axis, over at least this distance. */
export const FLICK_SPEED = .35, FLICK_MIN = 22;
/** The leading axis must beat the other by this factor. */
const LEAD = 1.15;

const along = (dx: number, dy: number): 'x' | 'y' | null => Math.abs(dx) >= Math.abs(dy) * LEAD ? 'x' : Math.abs(dy) >= Math.abs(dx) * LEAD ? 'y' : null;
const kindOf = (axis: 'x' | 'y', value: number): SwipeKind => axis === 'x' ? (value > 0 ? 'keep' : 'discard') : (value < 0 ? 'favorite' : 'later');

/** The stamp to show while dragging: exactly the decision a release here would make by distance. */
export function swipeZone(dx: number, dy: number): SwipeKind | '' {
  const axis = along(dx, dy);
  if (axis === 'x' && Math.abs(dx) >= DECIDE_X) return kindOf('x', dx);
  if (axis === 'y' && Math.abs(dy) >= DECIDE_Y) return kindOf('y', dy);
  return '';
}

/** The decision at release: by distance (as the stamp shows), or a flick by speed. `vx/vy`
 * are px/ms over the last moments of the drag. */
export function swipeDecision(dx: number, dy: number, vx = 0, vy = 0): SwipeKind | null {
  const zone = swipeZone(dx, dy);
  if (zone) return zone;
  const axis = along(dx, dy);
  if (!axis) return null;
  const distance = axis === 'x' ? dx : dy, speed = axis === 'x' ? vx : vy;
  // The flick must go the way the finger travelled.
  if (Math.abs(distance) >= FLICK_MIN && Math.sign(speed) === Math.sign(distance) && Math.abs(speed) >= FLICK_SPEED) return kindOf(axis, distance);
  return null;
}

/** Speed over the last ~90 ms of samples (time in ms, positions in px). */
export type Sample = { t: number; x: number; y: number };
export function releaseVelocity(samples: readonly Sample[], window = 90): { vx: number; vy: number } {
  if (samples.length < 2) return { vx: 0, vy: 0 };
  // Only the last moments count: a finger that rests, then flicks, is a flick (the resting
  // touch-down must not dilute the speed).
  const last = samples[samples.length - 1];
  let first = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0; i--) { if (last.t - samples[i].t > window) break; first = samples[i]; }
  const dt = Math.max(1, last.t - first.t);
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/** A hold that turns out to be a swipe: the finger rested past the hold time, then
 * travelled clearly sideways (the anchored view is reached downward, never sideways). */
export const holdBecomesSwipe = (dx: number, dy: number) => Math.abs(dx) >= DECIDE_X && Math.abs(dx) >= Math.abs(dy) * 1.6;
