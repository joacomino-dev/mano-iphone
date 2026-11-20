/** The first-launch practice (user, 2026-11-19; eight steps from 2026-11-20): each asking for one real
 * action on the tutorial's own postcards, with the gesture or its button. Nothing here
 * touches Photos or the decision record: the deck, the counter and «Deshacer» are the
 * tutorial's own. Pure logic (state, swipe reading, the local step log) so the screen
 * (Tutorial.tsx) only draws it. */

import { swipeDecision, swipeZone, type SwipeKind } from './swipe.ts';
export type { SwipeKind };
/** The actions a step can ask for. */
export type Action = SwipeKind | 'undo' | 'finish';
/** What the person did: a released swipe, or a press on one of the screen's buttons. */
export type TutorialInput = { kind: Action; via: 'gesture' | 'button' };

/** Eight steps (user, 2026-11-20): keep a good photo; delete a lovely one «by mistake»,
 * get it back with «Deshacer» and keep it; love one; leave one for later; delete the
 * photo that really is useless; and «Terminar», where it stays marked. Deleting is
 * shown twice: once undone (nothing is lost), once for real (this is how it goes). */
export type StepId = 'keep' | 'mistake' | 'undo' | 'rescue' | 'favorite' | 'later' | 'discard' | 'finish';
export const STEP_IDS: readonly StepId[] = ['keep', 'mistake', 'undo', 'rescue', 'favorite', 'later', 'discard', 'finish'];
export const STEP_COUNT = STEP_IDS.length;
/** The action each step waits for. */
export const EXPECTS: Record<StepId, Action> = { keep: 'keep', mistake: 'discard', undo: 'undo', rescue: 'keep', favorite: 'favorite', later: 'later', discard: 'discard', finish: 'finish' };

/** The pile's own reading of a swipe (swipe.ts): the practice teaches exactly the gesture
 * the pile will read — the same distances, the same stamp, the same quick flick. */
export const armedZone = swipeZone;
export const releasedSwipe = (dx: number, dy: number, vx = 0, vy = 0) => swipeDecision(dx, dy, vx, vy);

/** `ask`: waiting for the action. `done`: the step's confirmation is on screen.
 * `missed`: a different action came; the step stays and Coqui corrects. */
export type Phase = 'ask' | 'done' | 'missed';
export type TutorialState = { step: number; phase: Phase; misses: number; finished: boolean };
export const startTutorial = (): TutorialState => ({ step: 0, phase: 'ask', misses: 0, finished: false });
export const stepId = (state: TutorialState): StepId => STEP_IDS[Math.min(state.step, STEP_COUNT - 1)];

/** Reads one action. Only the action the step asks for counts; anything else is a miss
 * (the photo comes back, nothing is recorded). While a confirmation plays, input waits. */
export function applyInput(state: TutorialState, input: TutorialInput): { state: TutorialState; accepted: boolean } {
  if (state.finished || state.phase === 'done') return { state, accepted: false };
  if (input.kind === EXPECTS[stepId(state)]) return { state: { ...state, phase: 'done' }, accepted: true };
  return { state: { ...state, phase: 'missed', misses: state.misses + 1 }, accepted: false };
}
/** After the confirmation: the next step, or the end. */
export function advance(state: TutorialState): TutorialState {
  if (state.phase !== 'done') return state;
  const step = state.step + 1;
  return step >= STEP_COUNT ? { ...state, finished: true } : { step, phase: 'ask', misses: 0, finished: false };
}

/** The tutorial's own pile, in order. Each photo invites its gesture: a lovely sunset to
 * keep, a field of flowers worth keeping (deleted by mistake, then rescued), a birthday
 * to love, a receipt you may still need, and a blurry photo of the floor taken by
 * accident — deleted for real. At «Terminar» the pile is empty: what was marked waits in the
 * counter on «Terminar» (showing the deleted photo again read as if it had not gone; user, 2026-11-20). */
export const PHOTOS = {
  beach: { src: '/assets/demo/postcard-1.svg', width: 200, height: 300 },
  flowers: { src: '/assets/demo/postcard-6.svg', width: 200, height: 300 },
  birthday: { src: '/assets/demo/tutorial-birthday.svg', width: 200, height: 280 },
  ticket: { src: '/assets/demo/postcard-7.svg', width: 200, height: 300 },
  floor: { src: '/assets/demo/tutorial-floor.svg', width: 200, height: 300 },
} as const;
export type PhotoId = keyof typeof PHOTOS;
/** The flowers leave with the mistake and come back with «Deshacer» on top again. */
export const PILE: readonly PhotoId[] = ['beach', 'flowers', 'birthday', 'ticket', 'floor'];

/** Where each step's target lives on the replica of the main screen. */
export const TARGET: Record<StepId, 'card' | 'undo' | 'finish'> = { keep: 'card', mistake: 'card', undo: 'undo', rescue: 'card', favorite: 'card', later: 'card', discard: 'card', finish: 'finish' };

/* ---------- Step log: on this device only ----------
 * The project sends nothing anywhere (no telemetry: AGENTS.md), so «where do people
 * leave or skip» is counted locally: how many times each step was reached, where the
 * practice was skipped, how often it was finished. Read it in Ajustes (developer
 * builds) or from the web inspector; nothing leaves the iPhone. */
export const TUTORIAL_LOG_KEY = 'cocowash-tutorial-log-v1';
export type TutorialLog = { started: number; completed: number; reached: number[]; skipped: number[]; missed: number[] };
const emptyLog = (): TutorialLog => ({ started: 0, completed: 0, reached: Array(STEP_COUNT).fill(0), skipped: Array(STEP_COUNT).fill(0), missed: Array(STEP_COUNT).fill(0) });
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): Store | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export function readTutorialLog(storage: Store | null = store()): TutorialLog {
  const base = emptyLog();
  try {
    const raw = JSON.parse(storage?.getItem(TUTORIAL_LOG_KEY) ?? 'null') as Partial<TutorialLog> | null;
    if (!raw || typeof raw !== 'object') return base;
    const counts = (list: unknown) => base.reached.map((_, i) => Array.isArray(list) && Number.isFinite(list[i]) ? Math.max(0, Math.floor(list[i] as number)) : 0);
    const count = (n: unknown) => Number.isFinite(n) ? Math.max(0, Math.floor(n as number)) : 0;
    return { started: count(raw.started), completed: count(raw.completed), reached: counts(raw.reached), skipped: counts(raw.skipped), missed: counts(raw.missed) };
  } catch { return base; }
}
export type LogEvent = { type: 'start' } | { type: 'reach' | 'skip' | 'miss'; step: number } | { type: 'complete' };
export function logTutorial(event: LogEvent, storage: Store | null = store()): TutorialLog {
  const log = readTutorialLog(storage);
  const at = 'step' in event ? Math.max(0, Math.min(STEP_COUNT - 1, event.step)) : 0;
  if (event.type === 'start') log.started++;
  else if (event.type === 'complete') log.completed++;
  else if (event.type === 'reach') log.reached[at]++;
  else if (event.type === 'skip') log.skipped[at]++;
  else log.missed[at]++;
  try { storage?.setItem(TUTORIAL_LOG_KEY, JSON.stringify(log)); } catch { /* the log is optional */ }
  return log;
}
