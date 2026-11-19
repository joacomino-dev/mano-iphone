import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type MotionValue } from 'motion/react';
import { ArrowUUpLeftIcon, FolderSimplePlusIcon } from '@phosphor-icons/react';
import { FinishButton } from './FinishButton';
import { DecisionBar } from './DecisionBar';
import { FilterSwitch, Wordmark } from './Chrome';
import { Stamp, DecisionStamp, DecisionIcon } from './Stamp';
import { cardBox } from './preview';
import { haptic } from './haptics';
import { burst, centreOf } from './particles';
import { onAndroid } from './locales/android';
import { locale, t } from './i18n';
import { Bubble, Hand, Spotlight, Track, layoutRect, radiusOf, screenRect, shapesOf, type Hole, type Shape } from './Coach';
import type { ArtSlot, Pose } from './Characters';
import { PHOTOS, PILE, STEP_COUNT, STEP_IDS, TARGET, advance, applyInput, armedZone, logTutorial, releasedSwipe, startTutorial, stepId, type PhotoId, type StepId, type SwipeKind, type TutorialInput } from './tutorialSteps';

/** First-launch practice (user, 2026-11-19; second pass the same day): the real main
 * screen — header with «Terminar» and its counter, the pile, the decision bar and the
 * tools — on the tutorial's own postcards. Six steps; each waits for its action
 * (gesture or button), confirms it with the stamp, a small burst and a tap, and moves
 * on. The coach (Coach.tsx) lives in a layer over the whole app, edge to edge.
 * Nothing reaches Photos or the decision record. Logic and step log: tutorialSteps.ts. */

/* ---------- Copy: the action in bold, then what it is for. One idea per bubble. ---------- */
type Line = { title: () => string; body?: () => string };
const ASK: Record<StepId, Line> = {
  keep: { title: () => t('Desliza a la derecha'), body: () => t('para conservar esta foto') },
  discard: { title: () => t('¿Esta no te sirve?'), body: () => t('Desliza a la izquierda para borrarla') },
  undo: { title: () => t('¿Te equivocaste?'), body: () => t('Toca Deshacer y la recuperas') },
  favorite: { title: () => t('¿Una foto especial?'), body: () => t('Desliza hacia arriba para guardarla en Favoritas') },
  later: { title: () => t('¿No te decides?'), body: () => t('Desliza hacia abajo y la revisas después') },
  finish: { title: () => t('Toca Terminar'), body: () => t('para borrar lo marcado. Antes, nada se elimina') },
};
const DONE: Record<StepId, Line> = {
  keep: { title: () => t('¡Se queda en tu carrete!') },
  discard: { title: () => t('Marcada para borrar'), body: () => t('Tranqui, aún no se elimina') },
  undo: { title: () => t('¡De vuelta!') },
  favorite: { title: () => t('Guardada en Favoritas') },
  later: { title: () => t('Te la guardo para luego') },
  finish: { title: () => t('¡Listo! Ya sabes lo básico') },
};
const MISS: Record<StepId, () => string> = {
  keep: () => t('Prueba hacia la derecha'), discard: () => t('Prueba hacia la izquierda'), undo: () => t('Toca Deshacer'),
  favorite: () => t('Prueba hacia arriba'), later: () => t('Prueba hacia abajo'), finish: () => t('Toca Terminar'),
};
/** Coqui's face: one pose to ask each thing, another to celebrate it, a shrug to correct.
 * The wink for «Deshacer» waits for its art (Characters.PENDING_ART). */
const ASK_POSE: Record<StepId, Pose | ArtSlot> = { keep: 'coqui-point', discard: 'coqui-shrug', undo: 'coqui-wave', favorite: 'coqui-photos', later: 'coqui-think', finish: 'coqui-point' };
const DONE_POSE: Record<StepId, Pose | ArtSlot> = { keep: 'coqui-photos', discard: 'coqui-calm', undo: 'coqui-wink', favorite: 'coqui-cheer', later: 'coqui-think', finish: 'coqui-cheer' };
/** How long each confirmation stays before the next step. */
const DONE_MS: Record<StepId, number> = { keep: 1200, discard: 1700, undo: 1300, favorite: 1300, later: 1200, finish: 1900 };
/** After «Deshacer», the floor photo goes back to the deletion queue (step 6 shows it marked). */
const REQUEUE_MS = 650;
/** No action for this long: the hand travels further and the glow pulses. */
const NUDGE_MS = 4500;

/** The equivalent control of each step (and, for «Terminar», its counter too). */
const TARGETS: Record<StepId, string[]> = { keep: ['.bar-keep'], discard: ['.bar-discard'], favorite: ['.bar-heart'], later: ['.tut-later'], undo: ['.tut-undo'], finish: ['.header-action.finish', '.finish-count'] };
const DIRECTION: Record<SwipeKind, { x: number; y: number }> = { keep: { x: 1, y: 0 }, discard: { x: -1, y: 0 }, favorite: { x: 0, y: -1 }, later: { x: 0, y: 1 } };
const HAPTIC = { keep: 'soft', discard: 'rigid', favorite: 'success', later: 'light' } as const;

/* ---------- Cards: the pile's own card, look and motion ---------- */
type Offset = { x: MotionValue<number>; y: MotionValue<number> };
const CARD_SPRING = { type: 'spring', stiffness: 380, damping: 34 } as const;
const leaveEase = [.32, .72, .36, 1] as const;
/** The pile's exits (ManoApp.cardExit): keep flies right, discard slides left and greys,
 * favourite rises, «Más tarde» drops. */
function exitFor(kind: SwipeKind | '', reduced: boolean) {
  if (reduced || !kind) return { opacity: 0, transition: { duration: reduced ? .14 : .16 } };
  const flight = kind === 'keep' ? { x: 440, rotate: 12 } : kind === 'discard' ? { x: -440, rotate: -12, filter: 'saturate(.3)' } : kind === 'later' ? { y: 520, rotate: 4, scale: .96 } : { y: -560, scale: .92 };
  return { ...flight, opacity: 0, transition: { duration: .34, ease: leaveEase } };
}
type CardEntry = { photo: PhotoId; key: string; back?: boolean };
/** Demo captions: own places and dates (nothing from the person's library). */
const CAPTION: Record<PhotoId, { where: string; date: [number, number, number] }> = {
  beach: { where: 'Montañita', date: [2025, 7, 14] }, floor: { where: '', date: [2025, 10, 3] }, birthday: { where: 'Cuenca', date: [2025, 9, 12] },
  ticket: { where: 'Quito', date: [2025, 10, 2] }, marked: { where: '', date: [2025, 10, 3] },
};
const dateLabel = (d: [number, number, number]) => { try { return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d[0], d[1], d[2])); } catch { return ''; } };
/** The demo tilts the card a touch more than the pile so the direction reads at a glance. */
const TILT = .045;

function TutorialCard({ entry, stage, reduced, register, drag, label }: { entry: CardEntry; stage: { width: number; height: number }; reduced: boolean; register: (key: string, offset: Offset) => () => void; drag?: { down: (e: PointerEvent) => void; move: (e: PointerEvent) => void; up: (e: PointerEvent) => void; key: (e: KeyboardEvent) => void }; label: string }) {
  const photo = PHOTOS[entry.photo];
  const { cardWidth, cardHeight } = cardBox(stage, { width: photo.width, height: photo.height, kind: 'photo' }, false);
  const ox = useMotionValue(0), oy = useMotionValue(0);
  const x = useMotionValue(entry.back && !reduced ? -440 : 0), y = useMotionValue(0), rotate = useMotionValue(entry.back && !reduced ? -12 : 0);
  useEffect(() => register(entry.key, { x: ox, y: oy }), [entry.key]);
  // The finger (and the coach's demo) moves the card 1:1 across, damped up/down, like the pile.
  useEffect(() => {
    const sync = () => { x.stop(); y.stop(); rotate.stop(); x.set(ox.get()); y.set(oy.get() * .55); rotate.set(ox.get() * TILT); };
    const a = ox.on('change', sync), b = oy.on('change', sync);
    if (entry.back && !reduced) { animate(x, 0, CARD_SPRING); animate(rotate, 0, CARD_SPRING); }
    return () => { a(); b(); };
  }, []);
  const caption = CAPTION[entry.photo];
  return <motion.article data-testid={`tutorial-card-${entry.photo}`} className={`photo-card paper front ${photo.marked ? 'is-marked' : ''}`}
    style={{ zIndex: 20, width: cardWidth, height: cardHeight, left: `calc(50% - ${cardWidth / 2}px)`, top: `calc(50% - ${cardHeight / 2}px)`, x, y, rotate, touchAction: 'none' }}
    initial={entry.back ? { opacity: reduced ? 0 : .4 } : reduced ? { opacity: 0 } : { opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }}
    variants={{ leave: (kind: SwipeKind | '') => exitFor(kind, reduced) }} exit="leave" transition={reduced ? { duration: .14 } : CARD_SPRING}
    tabIndex={0} aria-label={label}
    onPointerDown={drag?.down} onPointerMove={drag?.move} onPointerUp={drag?.up} onPointerCancel={drag?.up} onLostPointerCapture={drag?.up} onKeyDown={drag?.key}>
    <div className="photo-window"><img src={photo.src} alt="" draggable={false}/></div>
    <span className="polaroid-caption"><span className="caption-where">{caption.where}</span><span className="caption-when">{dateLabel(caption.date)}</span></span>
    {/* Step 6: the photo marked for deletion, with its ticket — waiting for «Terminar». */}
    {photo.marked && <span className="tut-marked" aria-hidden="true"><Stamp kind="discard" word lettering/></span>}
  </motion.article>;
}

/* ---------- Where things are, in the coach layer's coordinates ---------- */
type Spots = { card: Shape | null; target: Shape[]; button: Hole | null; strip: Hole | null; tools: Hole | null; progress: Hole | null };
const NO_SPOTS: Spots = { card: null, target: [], button: null, strip: null, tools: null, progress: null };
function useSpots(root: HTMLElement | null, layer: HTMLElement | null, step: StepId, watch: unknown[]) {
  const [spots, setSpots] = useState<Spots>(NO_SPOTS);
  const measure = useCallback(() => {
    if (!root || !layer) return;
    const origin = screenRect(root, layer);
    const local = (el: HTMLElement | null, r = 16) => { const box = layoutRect(el, root, 0, r); return box && origin ? { ...box, x: box.x + origin.x, y: box.y + origin.y } : null; };
    // The card: its own corners, a hair of margin (no frame around the frame).
    const cardEl = root.querySelector<HTMLElement>('.photo-card.front');
    const cardBoxed = local(cardEl, radiusOf(cardEl, 4));
    const card: Shape | null = cardBoxed && { kind: 'rect', box: { x: cardBoxed.x - 3, y: cardBoxed.y - 3, w: cardBoxed.w + 6, h: cardBoxed.h + 6, r: cardBoxed.r + 3 } };
    const els = TARGETS[step].map(selector => root.querySelector(selector));
    const target = shapesOf(els, layer, 6);
    const button = screenRect(els[0], layer);
    const next: Spots = { card, target, button, strip: local(root.querySelector('.tut-coach')), tools: local(root.querySelector('.archive-tools')), progress: local(root.querySelector('.tut-progress')) };
    setSpots(s => JSON.stringify(s) === JSON.stringify(next) ? s : next);
  }, [root, layer, step]);
  useLayoutEffect(() => { measure(); const a = setTimeout(measure, 120), b = setTimeout(measure, 480); return () => { clearTimeout(a); clearTimeout(b); }; }, [measure, ...watch]);
  useEffect(() => {
    if (!root) return;
    const observer = new ResizeObserver(measure); observer.observe(root);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [root, measure]);
  return spots;
}

/* ---------- The practice ---------- */
export function Tutorial({ done, skip }: { done: () => void; skip: (step: number) => void }) {
  const reduced = !!useReducedMotion();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  // The coach covers the whole app, edge to edge (the screen itself sits inside the safe areas).
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setHost(root?.closest<HTMLElement>('.mano-app') ?? null); }, [root]);
  const [tut, setTut] = useState(startTutorial);
  const tutNow = useRef(tut); tutNow.current = tut;
  const id = stepId(tut);
  const asking = !tut.finished && tut.phase !== 'done';
  const [pile, setPile] = useState<CardEntry[]>(() => PILE.map(photo => ({ photo, key: photo })));
  const pileNow = useRef(pile); pileNow.current = pile;
  const revision = useRef(0);
  const [pending, setPending] = useState(0);
  const [zone, setZone] = useState<SwipeKind | ''>(''); const zoneNow = useRef<SwipeKind | ''>('');
  const [flash, setFlash] = useState<{ kind: SwipeKind; key: number } | null>(null);
  const [touching, setTouching] = useState(false);
  const [nudge, setNudge] = useState(false);
  const exitKind = useRef<SwipeKind | ''>('');
  // Finished or skipped: the screen is on its way out and takes no more input.
  const leaving = useRef(false);
  const offsets = useRef(new Map<string, Offset>());
  const register = useCallback((key: string, offset: Offset) => { offsets.current.set(key, offset); return () => { if (offsets.current.get(key) === offset) offsets.current.delete(key); }; }, []);
  const frontOffset = () => { const first = pileNow.current[0]; return first ? offsets.current.get(first.key) : undefined; };

  /* Layout: the stage's size for the card, and where the lit areas are. */
  const [stage, setStage] = useState({ width: 340, height: 420 });
  const stageObserver = useRef<ResizeObserver | null>(null);
  const stageRef = useCallback((el: HTMLElement | null) => { stageObserver.current?.disconnect(); if (!el) return; const o = new ResizeObserver(([entry]) => setStage({ width: entry.contentRect.width, height: entry.contentRect.height })); o.observe(el); stageObserver.current = o; }, []);
  const spots = useSpots(root, layer, id, [tut.step, tut.phase, pile[0]?.key, stage.width, stage.height, pending]);

  /* Step log (this device only) and the idle nudge. */
  const started = useRef(false);
  useEffect(() => { if (started.current) return; started.current = true; logTutorial({ type: 'start' }); }, []);
  const reached = useRef(-1);
  useEffect(() => { if (tut.finished || reached.current >= tut.step) return; reached.current = tut.step; logTutorial({ type: 'reach', step: tut.step }); }, [tut.step]);
  useEffect(() => { setNudge(false); }, [tut.step]);
  useEffect(() => { if (!asking || touching || nudge) return; const timer = setTimeout(() => setNudge(true), NUDGE_MS); return () => clearTimeout(timer); }, [asking, touching, nudge, tut.step]);

  /* Doing the step's action, or something else. Each achievement has its own small burst
   * and its own tap: a soft glow to keep, stars for a favourite, a little dust that fades
   * for a deletion, confetti at the end. Nothing for «Más tarde». */
  const cardCentre = () => centreOf(root?.querySelector('.photo-card.front'));
  const perform = (kind: TutorialInput['kind']) => {
    if (kind === 'undo') {
      revision.current++;
      setPile(p => [{ photo: 'floor', key: `floor~${revision.current}`, back: true }, ...p]);
      setPending(n => Math.max(0, n - 1)); haptic('light');
      return;
    }
    if (kind === 'finish') {
      haptic('success');
      const box = root?.getBoundingClientRect();
      if (box) burst('tutorial', { x: box.left + box.width / 2, y: box.top + box.height * .42 }, 'paper', 26);
      return;
    }
    const at = cardCentre();
    if (at && kind === 'keep') burst('tutorial', at, 'glow', 3);
    if (at && kind === 'favorite') burst('tutorial', { x: at.x, y: at.y - 40 }, 'sparkle', 7, 30);
    if (at && kind === 'discard') burst('tutorial', { x: at.x - 30, y: at.y }, 'dust', 12, 40);
    exitKind.current = kind;
    setPile(p => p.slice(1));
    setFlash({ kind, key: performance.now() });
    if (kind === 'discard') setPending(n => n + 1);
    haptic(HAPTIC[kind]);
  };
  const springBack = () => { const o = frontOffset(); if (!o) return; if (reduced) { o.x.set(0); o.y.set(0); } else { animate(o.x, 0, CARD_SPRING); animate(o.y, 0, CARD_SPRING); } };
  const act = (input: TutorialInput) => {
    const now = tutNow.current;
    if (leaving.current || now.finished || now.phase === 'done') return;
    const { state, accepted } = applyInput(now, input);
    tutNow.current = state; setTut(state);
    if (accepted) { perform(input.kind); return; }
    springBack(); setNudge(true); haptic('warning');
    logTutorial({ type: 'miss', step: now.step });
  };
  // After the confirmation: the next step (after «Deshacer», the floor photo goes back
  // to the queue first), or the end.
  useEffect(() => {
    if (tut.phase !== 'done') return;
    let follow: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      if (id === 'finish') { leaving.current = true; logTutorial({ type: 'complete' }); done(); return; }
      if (id === 'undo') {
        const at = cardCentre(); if (at) burst('tutorial', { x: at.x - 30, y: at.y }, 'dust', 8, 40);
        exitKind.current = 'discard'; setPile(p => p.slice(1)); setPending(n => n + 1); setFlash({ kind: 'discard', key: performance.now() }); haptic('rigid');
        follow = setTimeout(() => setTut(advance), REQUEUE_MS);
        return;
      }
      setTut(advance);
    }, DONE_MS[id]);
    return () => { clearTimeout(timer); if (follow) clearTimeout(follow); };
  }, [tut.phase, tut.step]);

  /* The finger on the card. */
  const grip = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const stopCoach = useRef<() => boolean>(() => false);
  const down = (e: PointerEvent) => {
    if (!asking || leaving.current || grip.current || e.button > 0) return;
    const o = frontOffset(); if (!o) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic or ended pointer: moves still arrive on the card */ }
    // The finger takes over at once: the coach's loop stops here, not a render later.
    // Caught mid-demo, the card was moved by the coach, not by the person: it heads
    // back home and only the finger's own travel counts (a tap never decides).
    const demo = stopCoach.current(); o.x.stop(); o.y.stop();
    if (demo && !reduced) { animate(o.x, 0, CARD_SPRING); animate(o.y, 0, CARD_SPRING); }
    grip.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: demo ? 0 : o.x.get(), oy: demo ? 0 : o.y.get() };
    if (demo && reduced) { o.x.set(0); o.y.set(0); }
    setTouching(true);
  };
  const move = (e: PointerEvent) => {
    const g = grip.current; if (!g || g.id !== e.pointerId) return;
    const o = frontOffset(); if (!o) return;
    const dx = g.ox + e.clientX - g.x, dy = g.oy + e.clientY - g.y;
    o.x.stop(); o.y.stop(); o.x.set(dx); o.y.set(dy);
    const next = armedZone(dx, dy);
    if (next !== zoneNow.current) { zoneNow.current = next; setZone(next); if (next) haptic('selection'); }
  };
  const up = (e: PointerEvent) => {
    const g = grip.current; if (!g || g.id !== e.pointerId) return;
    grip.current = null; setTouching(false);
    zoneNow.current = ''; setZone('');
    // Decided by the finger's travel from where the card was taken (as the pile does).
    const kind = e.type === 'pointercancel' || e.type === 'lostpointercapture' ? null : releasedSwipe(g.ox + e.clientX - g.x, g.oy + e.clientY - g.y);
    if (kind) act({ kind, via: 'gesture' }); else springBack();
  };
  // Keyboard: the arrows are the four swipes on the focused card.
  const key = (e: KeyboardEvent) => {
    const kind = ({ ArrowRight: 'keep', ArrowLeft: 'discard', ArrowUp: 'favorite', ArrowDown: 'later' } as const)[e.key as 'ArrowRight'];
    if (!kind) return; e.preventDefault(); act({ kind, via: 'button' });
  };

  /* The coach's hand. On the card: it lands, drags the card along the track (the card
   * tilts and its stamp shows) and lets go; then again. On a button: it waits beside
   * it — never over its word — and pokes it. */
  const target = TARGET[id];
  const way = target === 'card' ? DIRECTION[id as SwipeKind] : null;
  const distance = way ? (way.y ? 120 : 110) * (nudge ? 1.25 : 1) : 0;
  const hx = useMotionValue(0), hy = useMotionValue(0), ho = useMotionValue(0), hs = useMotionValue(1), hp = useMotionValue(1), track = useMotionValue(0);
  const cardBounds = spots.card?.box;
  const handAt = way && cardBounds ? { x: cardBounds.x + cardBounds.w / 2 - way.x * 26, y: cardBounds.y + cardBounds.h * .62 - way.y * 22 }
    : spots.button ? id === 'undo' ? { x: spots.button.x + spots.button.w + 4, y: spots.button.y + spots.button.h / 2 } : { x: spots.button.x - 4, y: spots.button.y + spots.button.h / 2 } : null;
  const turn = way ? 0 : id === 'undo' ? -90 : 90;
  const poke = id === 'undo' ? -8 : 8;
  useEffect(() => {
    const show = asking && !touching && !!handAt;
    // A fade still running from the last run would win over the values set below.
    for (const value of [hx, hy, ho, hs, hp, track]) value.stop();
    if (!show) { animate(ho, 0, { duration: .12 }); animate(track, 0, { duration: .12 }); return; }
    if (reduced) { hx.set(0); hy.set(0); hs.set(1); hp.set(1); ho.set(1); track.set(way ? 1 : 0); return; }
    let alive = true;
    const runs: { stop: () => void }[] = [];
    stopCoach.current = () => { const was = alive; alive = false; runs.forEach(r => r.stop()); ho.set(0); track.set(0); return was && target === 'card'; };
    const run = (value: MotionValue<number>, to: number, options: object) => { if (!alive) return Promise.resolve(); const c = animate(value, to, options); runs.push(c); return c; };
    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    const loop = async () => {
      // The lit area settles first; then the hand.
      await sleep(tut.phase === 'missed' ? 250 : 600);
      while (alive) {
        hx.set(0); hy.set(0); hs.set(1.14); hp.set(1); ho.set(0);
        await Promise.all([run(ho, 1, { duration: .16 }), run(hs, 1, { type: 'spring', stiffness: 520, damping: 30 }), run(track, way ? .95 : 0, { duration: .2 }), run(hp, .8, { duration: .16 })]);
        if (!alive) return;
        if (way) {
          const o = frontOffset(); if (!o) return;
          const duration = nudge ? .8 : .66, ease = [.45, 0, .2, 1] as const;
          // The finger travels the real release distance; the card follows it as the pile does.
          const arming = setTimeout(() => { if (alive && !grip.current) { zoneNow.current = id as SwipeKind; setZone(id as SwipeKind); } }, duration * 520);
          await Promise.all([run(o.x, way.x * distance, { duration, ease }), run(o.y, way.y * distance, { duration, ease }), run(hx, way.x * distance, { duration, ease }), run(hy, way.y * distance, { duration, ease })]);
          clearTimeout(arming);
          if (!alive) return;
          await sleep(320);
          if (!alive || grip.current) return;
          zoneNow.current = ''; setZone('');
          run(hp, 1, { duration: .12 }); run(ho, 0, { duration: .2 }); run(hs, 1.08, { duration: .2 }); run(track, 0, { duration: .3 });
          await Promise.all([run(o.x, 0, CARD_SPRING), run(o.y, 0, CARD_SPRING)]);
        } else {
          for (let i = 0; i < 2 && alive; i++) {
            await Promise.all([run(hx, turn ? poke : 0, { duration: .14 }), run(hy, turn ? 0 : -8, { duration: .14 }), run(hp, .6, { duration: .12 })]);
            await Promise.all([run(hx, 0, { duration: .2 }), run(hy, 0, { duration: .2 }), run(hp, .8, { duration: .2 })]);
            await sleep(140);
          }
          await sleep(220);
          run(ho, 0, { duration: .2 }); run(hp, 1, { duration: .2 });
        }
        await sleep(nudge ? 450 : 900);
      }
    };
    void loop();
    return () => {
      alive = false; runs.forEach(r => r.stop()); stopCoach.current = () => false;
      if (grip.current) return;
      if (zoneNow.current) { zoneNow.current = ''; setZone(''); }
      // Stopped mid-demo (nudge, step change): the card goes home, unless it is leaving with a decision.
      const o = target === 'card' && tutNow.current.phase !== 'done' ? frontOffset() : undefined;
      if (o && (o.x.get() || o.y.get())) { animate(o.x, 0, CARD_SPRING); animate(o.y, 0, CARD_SPRING); }
    };
  }, [asking, touching, nudge, reduced, tut.step, tut.phase, !!handAt, pile[0]?.key]);

  const skipNow = () => { if (leaving.current) return; leaving.current = true; logTutorial({ type: 'skip', step: tut.step }); haptic('selection'); skip(tut.step); };
  const line = tut.phase === 'done' ? DONE[id] : tut.phase === 'missed' ? { title: () => t('¡Casi!'), body: MISS[id] } : ASK[id];
  const pose: Pose | ArtSlot = tut.phase === 'done' ? DONE_POSE[id] : tut.phase === 'missed' ? 'coqui-shrug' : ASK_POSE[id];
  const front = pile[0];
  // Coqui's place: above the pile; for «hacia arriba» he waits over the tools row
  // (unused in that step), so the rising photo never runs into him.
  const coachAt = id === 'favorite' ? spots.tools : spots.strip;
  const follow = target === 'card' && front ? offsets.current.get(front.key) : undefined;
  const nowNumber = Math.min(tut.step + 1, STEP_COUNT);
  const locked = !asking;
  const lineText = `${line.title()}${line.body ? ` ${line.body()}` : ''}`;

  const coach = layer && <>
    <Spotlight on={asking} card={target === 'card' && spots.card && follow ? { shape: spots.card, x: follow.x, y: follow.y, ky: .55 } : null} target={spots.target} travelKey={id} strong={nudge}/>
    {way && handAt && <Track from={handAt} dx={way.x * distance} dy={way.y * distance} opacity={track}/>}
    {handAt && asking && <Hand at={handAt} x={hx} y={hy} opacity={ho} scale={hs} press={hp} turn={turn}/>}
    {coachAt && <motion.div className={`coach-float ${coachAt === spots.tools ? 'is-low' : ''}`} initial={false} animate={{ left: coachAt.x, top: coachAt.y, width: coachAt.w, height: coachAt.h }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }}>
      <Bubble pose={pose} title={line.title()} body={line.body?.()} tone={tut.phase}/>
    </motion.div>}
    {spots.progress && <div className="tut-progress-float" style={{ left: spots.progress.x, top: spots.progress.y, width: spots.progress.w, height: spots.progress.h }}>
      <div className="tut-steps" role="progressbar" aria-label={t('Progreso de la práctica')} aria-valuemin={1} aria-valuemax={STEP_COUNT} aria-valuenow={nowNumber} aria-valuetext={t('Paso {n} de {total}', { n: nowNumber, total: STEP_COUNT })}>
        {STEP_IDS.map((step, i) => <span key={step} className={i === tut.step ? 'is-now' : ''}><motion.i initial={false} animate={{ scaleX: i < tut.step || (i === tut.step && tut.phase === 'done') ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}/></span>)}
      </div>
      <span className="tut-count" aria-hidden="true">{nowNumber}/{STEP_COUNT}</span>
      <button type="button" className="tut-skip" onClick={skipNow}>{t('Saltar')}</button>
    </div>}
  </>;

  return <div ref={setRoot} className={`session-content tutorial ${tut.phase === 'done' ? 'is-celebrating' : ''}`} aria-roledescription={t('Práctica')}>
    <header className="archive-header is-session">
      <span className="tut-inert" inert><FilterSwitch on toggle={() => {}} edit={() => {}}/></span>
      <h1 className="header-brand"><div className="brand-status"><span className="brand-wordmark" aria-hidden="true"><Wordmark/></span><span className="sr-only">CocoWash</span></div></h1>
      <FinishButton pending={pending} busy={locked} announce={() => {}} finish={() => act({ kind: 'finish', via: 'button' })}/>
    </header>
    {/* Room for the progress row and Coqui's bubble; both are drawn by the coach layer. */}
    <div className="archive-progress tut-progress" aria-hidden="true"/>
    <div className="tut-coach" aria-hidden="true"/>
    <section ref={stageRef} className={`hand-space ${zone}`} aria-label={t('Pila de práctica')}>
      <div className="polaroid-stack">
        <AnimatePresence custom={exitKind.current}>{front && <TutorialCard key={front.key} entry={front} stage={stage} reduced={reduced} register={register}
          drag={{ down, move, up, key }} label={t('Foto de práctica. Desliza o usa los botones de abajo.')}/>}</AnimatePresence>
        <AnimatePresence>{zone && <motion.span key={zone} className={`drag-stamp ${zone}`}>
          <motion.span className="drag-stamp-ink" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.28, rotate: zone === 'discard' ? -5 : 5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: .1 } } : { opacity: 0, scale: 1.1, transition: { duration: .1, ease: [.2, .8, .2, 1] } }}
            transition={reduced ? { duration: .12 } : { type: 'spring', duration: .22, bounce: .28 }}><Stamp kind={zone} word lettering/></motion.span>
        </motion.span>}</AnimatePresence>
        {flash && <DecisionStamp key={flash.key} kind={flash.kind} lettering particles={false} reduced={reduced} done={() => setFlash(f => f?.key === flash.key ? null : f)}/>}
      </div>
    </section>
    <DecisionBar count={1} disabled={locked} favoriteOn={false} armed={zone}
      onDiscard={() => act({ kind: 'discard', via: 'button' })} onFavorite={() => act({ kind: 'favorite', via: 'button' })} onKeep={() => act({ kind: 'keep', via: 'button' })}/>
    <footer className="archive-tools">
      <button className="tut-undo" onClick={() => act({ kind: 'undo', via: 'button' })} disabled={locked || tut.step === 0} aria-label={t('Deshacer la última decisión')}><span className="tool-icon"><ArrowUUpLeftIcon size={24} className="flip-rtl"/></span><span className="tool-label">{t('Deshacer')}</span></button>
      <button className="later tut-later" aria-label={t('Dejar para más tarde')} disabled={locked} onClick={() => act({ kind: 'later', via: 'button' })}><span className="tool-icon"><DecisionIcon kind="later" size={24}/></span><span className="tool-label">{t('Más tarde')}</span></button>
      {onAndroid() ? <span aria-hidden="true"/> : <button className="tut-album" disabled aria-hidden="true" tabIndex={-1}><span className="tool-icon"><FolderSimplePlusIcon size={24}/></span><span className="tool-label">{t('Álbum')}</span></button>}
    </footer>
    {host && createPortal(<div ref={setLayer} className={`coach-layer ${asking ? 'is-dim' : ''}`}>{coach}</div>, host)}
    <p className="sr-only" role="status" aria-live="polite">{lineText}</p>
  </div>;
}
