/** «Trucos»: the advanced gestures, taught where they happen instead of in the
 * first-launch practice (user, 2026-11-19). Each tip shows once, the first time it
 * makes sense, and a tap dismisses it. Ajustes › Trucos lists them all and can show
 * them again. Pure logic; ContextTips.tsx draws them. */

export type TipId = 'stack' | 'zoom' | 'anchor' | 'album' | 'seal';
export const TIP_IDS: readonly TipId[] = ['stack', 'zoom', 'anchor', 'album', 'seal'];
export const TIPS_KEY = 'cocowash-tips-v1';

/** `decisions` / `keeps`: decisions made on the pile since tips exist (the record keeps
 * only the last ten, so the count lives here). `lastAt`: `decisions` when the last tip
 * showed; the next one waits a couple of cards (never two in a row). */
export type TipsState = { seen: TipId[]; decisions: number; keeps: number; lastAt: number };
/** Decisions between two tips. */
export const GAP = 2;
const empty = (): TipsState => ({ seen: [], decisions: 0, keeps: 0, lastAt: -GAP });
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): Store | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export function readTips(storage: Store | null = store()): TipsState {
  try {
    const raw = JSON.parse(storage?.getItem(TIPS_KEY) ?? 'null') as Partial<TipsState> | null;
    if (!raw || typeof raw !== 'object') return empty();
    const n = (v: unknown) => Number.isFinite(v) ? Math.max(0, Math.floor(v as number)) : 0;
    return { seen: Array.isArray(raw.seen) ? TIP_IDS.filter(id => raw.seen!.includes(id)) : [], decisions: n(raw.decisions), keeps: n(raw.keeps), lastAt: Number.isFinite(raw.lastAt) ? Math.floor(raw.lastAt as number) : -GAP };
  } catch { return empty(); }
}
export function saveTips(state: TipsState, storage: Store | null = store()) {
  try { storage?.setItem(TIPS_KEY, JSON.stringify(state)); } catch { /* tips may show again */ }
}
export const markSeen = (state: TipsState, id: TipId): TipsState => state.seen.includes(id) ? state : { ...state, seen: [...state.seen, id], lastAt: state.decisions };
/** Ajustes › Trucos › «Mostrar los trucos otra vez»: the counts stay, so they come back soon. */
export const resetSeen = (state: TipsState): TipsState => ({ ...state, seen: [], lastAt: -GAP });
export const countDecision = (state: TipsState, action: string): TipsState => ({ ...state, decisions: state.decisions + 1, keeps: state.keeps + (action === 'keep' ? 1 : 0) });

/** What the pile shows right now. `calm`: nothing else is on top (no sheet, anchored
 * view, grid, ad, alert, or a gesture in progress). */
/** `sealed`: the front card shows a seal (it was kept before and comes back). */
export type PileMoment = { calm: boolean; hand: number; front: 'photo' | 'live' | 'video' | null; albums: boolean; sealed?: boolean };

/** Thresholds: «Zoom» after a few decisions on a single photo (there is detail to look
 * at and the basics are known); «Anclar» a few cards later, its own moment; «Álbum»
 * once keeping is a habit. One tip at a time, in this order of priority. */
export const ZOOM_AFTER = 3, ANCHOR_AFTER = 6, ALBUM_AFTER_KEEPS = 5;
export function nextTip(state: TipsState, now: PileMoment): TipId | null {
  if (!now.calm || !now.front || state.decisions - state.lastAt < GAP) return null;
  const unseen = (id: TipId) => !state.seen.includes(id);
  // 1.2 (user, 2026-11-25): the first photo that comes back with a seal says what it means,
  // before anything else: without it, a photo already decided looks like a repeat.
  if (unseen('seal') && now.sealed) return 'seal';
  if (unseen('stack') && now.hand > 1) return 'stack';
  const still = now.front !== 'video' && now.hand === 1;
  if (unseen('zoom') && still && state.decisions >= ZOOM_AFTER) return 'zoom';
  if (unseen('anchor') && !unseen('zoom') && still && state.decisions >= ANCHOR_AFTER) return 'anchor';
  if (unseen('album') && now.albums && state.keeps >= ALBUM_AFTER_KEEPS) return 'album';
  return null;
}
