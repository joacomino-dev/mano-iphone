import { handOf, type Asset, type DecisionContext, type RecordState } from './domain.ts';
import { bestShot } from './insights.ts';

/** The hand on the table, locked.
 *
 * One canonical sequence decides what comes next (domain.ts `eligibleFrom`),
 * but once a hand is on screen it stays exactly as it is — same items, same
 * order — until the person acts on it. Nothing that happens in the background
 * moves it: similar groups or weights arriving, a preview finishing first, a
 * library refresh. Only a decision, «Siguiente» in a group, undo or a filter
 * change replace it. Undo restores the very order the person saw.
 *
 * `ids` front first; `best` is the group's «Mejor toma», chosen once when the
 * hand is dealt (never re-chosen on a subset after a decision or an undo). */
export type HandLock = { ids: string[]; best?: string };
export const NO_HAND: HandLock = { ids: [] };

/** Still playable on the table: in the library, not queued for deletion or
 * removed, and on the right side of «Favoritas». Decided items leave the hand
 * explicitly (`afterDecision`); this only guards against outside changes. */
export function playable(state: RecordState, favorites: boolean) {
  const pending = new Set(state.pending), removed = new Set(state.removed), favs = new Set(state.favorites);
  return (a: Asset | undefined): a is Asset => !!a && !pending.has(a.id) && !removed.has(a.id) && favs.has(a.id) === favorites;
}

export function lockedHand(lock: HandLock, byId: ReadonlyMap<string, Asset>, isPlayable: (a: Asset | undefined) => a is Asset): Asset[] {
  return lock.ids.map(id => byId.get(id)).filter(isPlayable);
}

/** The next hand from the front of the pile (a similar group of up to five, or
 * one item), with the clearly best shot moved to the front. */
export function dealHand(queue: Asset[], later: readonly string[] = []): HandLock {
  const first = queue[0];
  if (!first) return NO_HAND;
  const hand = handOf(queue, first, later);
  const best = hand.length > 1 ? bestShot(hand) : undefined;
  const ids = hand.map(a => a.id);
  return { ids: best ? [best, ...ids.filter(id => id !== best)] : ids, ...(best ? { best } : {}) };
}

/** What stays on the table after deciding `decided`: the rest of the hand, in
 * the order it was shown. Empty when the hand is done. */
export function afterDecision(hand: Asset[], decided: readonly string[], best?: string): HandLock {
  const ids = hand.map(a => a.id).filter(id => !decided.includes(id));
  return ids.length ? { ids, ...(best && ids.includes(best) ? { best } : {}) } : NO_HAND;
}

/** «Siguiente» in a group: the front card goes to the back. */
export function cycleHand(hand: Asset[], best?: string): HandLock {
  if (hand.length < 2) return { ids: hand.map(a => a.id), ...(best ? { best } : {}) };
  const ids = hand.map(a => a.id);
  return { ids: [...ids.slice(1), ids[0]], ...(best ? { best } : {}) };
}

/** The hand a decision was made on, exactly as it was shown. Records written
 * before 0.9.3 stored the unrotated hand plus `rotated`; replay that order. */
export function restoreHand(context: DecisionContext | undefined, fallback: readonly string[]): HandLock {
  const ids = context?.handIds?.length ? [...context.handIds] : [...fallback];
  const rotated = context?.rotated ?? [];
  const shown = rotated.length ? ids.sort((a, b) => rotated.indexOf(a) - rotated.indexOf(b)) : ids;
  const best = context?.best && shown.includes(context.best) ? context.best : undefined;
  return { ids: shown, ...(best ? { best } : {}) };
}

/** The read-ahead window: the hand on the table, then the next hands as the
 * pile will deal them (groups flattened), up to `limit` items. Linear in the
 * pile: each similar group is indexed once. */
export function upcomingFrom(queue: Asset[], hand: Asset[], later: readonly string[] = [], limit = 6): Asset[] {
  const result: Asset[] = []; const seen = new Set<string>();
  const add = (a: Asset) => { if (!seen.has(a.id) && result.length < limit) { seen.add(a.id); result.push(a); } };
  hand.forEach(add);
  const waiting = new Set(later);
  const groups = new Map<string, Asset[]>();
  for (const a of queue) if (a.group) { const g = groups.get(a.group); if (g) g.push(a); else groups.set(a.group, [a]); }
  for (const first of queue) {
    if (result.length >= limit) break;
    if (seen.has(first.id)) continue;
    if (!first.group) { add(first); continue; }
    // Same members handOf() would deal from here (postponed ones stay apart).
    const skipWaiting = !waiting.has(first.id);
    let taken = 0;
    for (const member of groups.get(first.group)!) {
      if (taken >= 5) break;
      if (seen.has(member.id) || (skipWaiting && waiting.has(member.id))) continue;
      add(member); taken++;
    }
  }
  return result;
}
