/** The first-launch practice (user, 2026-11-19): six steps, each asking for one real
 * action on the tutorial's own postcards, with the gesture or its button. Nothing here
 * touches Photos or the decision record: the deck, the counter and «Deshacer» are the
 * tutorial's own. Pure logic (state, swipe reading, the local step log) so the screen
 * (Tutorial.tsx) only draws it. */

export type SwipeKind = 'keep' | 'discard' | 'favorite' | 'later';
export type StepId = SwipeKind | 'undo' | 'finish';
/** What the person did: a released swipe, or a press on one of the screen's buttons. */
export type TutorialInput = { kind: SwipeKind | 'undo' | 'finish'; via: 'gesture' | 'button' };

export const STEP_IDS: readonly StepId[] = ['keep', 'discard', 'undo', 'favorite', 'later', 'finish'];
export const STEP_COUNT = STEP_IDS.length;

/** The same distances as the pile (ManoApp: zoneOf / end): the stamp arms at 45 px and a
 * release decides past 65 px across or 70 px up/down, whichever axis leads. The
 * practice teaches exactly the gesture the pile will read. */
export const ARM_AT = 45;
export function armedZone(dx: number, dy: number): SwipeKind | '' {
  return dx > ARM_AT ? 'keep' : dx < -ARM_AT ? 'discard' : dy < -ARM_AT ? 'favorite' : dy > ARM_AT ? 'later' : '';
}
export function releasedSwipe(dx: number, dy: number): SwipeKind | null {
  if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'keep' : 'discard';
  if (dy < -70 && Math.abs(dy) > Math.abs(dx)) return 'favorite';
  if (dy > 70 && Math.abs(dy) > Math.abs(dx)) return 'later';
  return null;
}

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
  if (input.kind === stepId(state)) return { state: { ...state, phase: 'done' }, accepted: true };
  return { state: { ...state, phase: 'missed', misses: state.misses + 1 }, accepted: false };
}
/** After the confirmation: the next step, or the end. */
export function advance(state: TutorialState): TutorialState {
  if (state.phase !== 'done') return state;
  const step = state.step + 1;
  return step >= STEP_COUNT ? { ...state, finished: true } : { step, phase: 'ask', misses: 0, finished: false };
}

/** The tutorial's own pile: which postcard is on top at each step. Each one invites
 * its gesture (user, 2026-11-19): a lovely sunset to keep, a blurry photo of the floor
 * taken by accident to delete, a birthday to love, a receipt you may still need to
 * leave for later; at «Terminar», the photo marked for deletion is back on screen. */
export const PHOTOS = {
  beach: { src: '/assets/demo/postcard-1.svg', width: 200, height: 300, marked: false },
  floor: { src: '/assets/demo/tutorial-floor.svg', width: 200, height: 300, marked: false },
  birthday: { src: '/assets/demo/tutorial-birthday.svg', width: 200, height: 280, marked: false },
  ticket: { src: '/assets/demo/postcard-7.svg', width: 200, height: 300, marked: false },
  marked: { src: '/assets/demo/tutorial-floor.svg', width: 200, height: 300, marked: true },
} as const;
export type PhotoId = keyof typeof PHOTOS;
/** Order of the pile. The floor photo is deleted (step 2), comes back with «Deshacer»
 * (step 3) and goes back to the deletion queue, so step 6 shows it marked. */
export const PILE: readonly PhotoId[] = ['beach', 'floor', 'birthday', 'ticket', 'marked'];

/** Where each step's target lives on the replica of the main screen. */
export const TARGET: Record<StepId, 'card' | 'undo' | 'finish'> = { keep: 'card', discard: 'card', undo: 'undo', favorite: 'card', later: 'card', finish: 'finish' };

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
