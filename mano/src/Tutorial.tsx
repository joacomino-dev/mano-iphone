import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type MotionValue } from 'motion/react';
import { ArrowUUpLeftIcon, FolderSimplePlusIcon } from '@phosphor-icons/react';
import { FinishButton } from './FinishButton';
import { DecisionBar } from './DecisionBar';
import { FilterSwitch, Wordmark } from './Chrome';
import { Stamp, DecisionStamp, DecisionIcon } from './Stamp';
import { cardBox } from './preview';
import { haptic } from './haptics';
import { burst } from './particles';
import { onAndroid } from './locales/android';
import { locale, t } from './i18n';
import { Bubble, Dim, Hand, Ring, layoutRect, type Hole } from './Coach';
import type { ArtSlot, Pose } from './Characters';
import { PHOTOS, PILE, STEP_COUNT, STEP_IDS, TARGET, advance, applyInput, armedZone, logTutorial, releasedSwipe, startTutorial, stepId, type PhotoId, type StepId, type SwipeKind, type TutorialInput } from './tutorialSteps';

/** First-launch practice (user, 2026-11-19): the real main screen — header with
 * «Terminar» and its counter, the pile, the decision bar and the tools — on the
 * tutorial's own postcards. Six steps; each waits for its action (gesture or button),
 * confirms it with the stamp, particles and a tap, and moves on. Nothing reaches Photos
 * or the decision record. Coach marks: Coach.tsx. Logic and step log: tutorialSteps.ts. */

/* ---------- Copy: one line to ask, one to confirm, one to correct ---------- */
const ASK: Record<StepId, () => string> = {
  keep: () => t('Desliza a la derecha'), discard: () => t('Desliza a la izquierda'), undo: () => t('¿Te equivocaste? Toca aquí'),
  favorite: () => t('Desliza hacia arriba'), later: () => t('Desliza hacia abajo'), finish: () => t('Lo marcado solo se borra cuando confirmas aquí'),
};
const DONE: Record<StepId, () => string> = {
  keep: () => t('Se queda en tu carrete'), discard: () => t('Marcada para borrar. Tranqui, aún no se elimina'), undo: () => t('¡Recuperada! Siempre puedes deshacer'),
  favorite: () => t('Guardada en Favoritas'), later: () => t('La revisas después'), finish: () => t('¡Listo! Ya sabes lo básico'),
};
const MISS: Record<StepId, () => string> = {
  keep: () => t('¡Casi! Prueba hacia la derecha'), discard: () => t('¡Casi! Prueba hacia la izquierda'), undo: () => t('¡Casi! Toca Deshacer'),
  favorite: () => t('¡Casi! Prueba hacia arriba'), later: () => t('¡Casi! Prueba hacia abajo'), finish: () => t('¡Casi! Toca Terminar'),
};
/** Coqui's face for each confirmation: pleased to keep, calm about deleting, a wink
 * for «Deshacer» (art pending: Characters.PENDING_ART), thrilled by a favourite. */
const DONE_POSE: Record<StepId, Pose | ArtSlot> = { keep: 'coqui-photos', discard: 'coqui-calm', undo: 'coqui-wink', favorite: 'coqui-cheer', later: 'coqui-think', finish: 'coqui-cheer' };
/** How long each confirmation stays before the next step (the discard's line is the longest). */
const DONE_MS: Record<StepId, number> = { keep: 1200, discard: 1800, undo: 1400, favorite: 1300, later: 1200, finish: 1900 };
/** After «Deshacer», the screenshot goes back to the deletion queue (step 6 shows one marked photo). */
const REQUEUE_MS = 650;
/** No action for this long: the hand travels further and the target ring pulses harder. */
const NUDGE_MS = 4500;

/** The equivalent button of each step, lit next to the photo. */
const BUTTON: Record<StepId, string> = { keep: '.bar-keep', discard: '.bar-discard', favorite: '.bar-heart', later: '.tut-later', undo: '.tut-undo', finish: '.header-action.finish' };
const DIRECTION: Record<SwipeKind, { x: number; y: number; arrow: 'right' | 'left' | 'up' | 'down' }> = {
  keep: { x: 1, y: 0, arrow: 'right' }, discard: { x: -1, y: 0, arrow: 'left' }, favorite: { x: 0, y: -1, arrow: 'up' }, later: { x: 0, y: 1, arrow: 'down' },
};
const HAPTIC = { keep: 'soft', discard: 'rigid', favorite: 'success', later: 'light' } as const;

/* ---------- Cards: the pile's own look and motion ---------- */
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
  beach: { where: 'Montañita', date: [2025, 7, 14] }, screenshot: { where: '', date: [2021, 2, 3] }, birthday: { where: 'Cuenca', date: [2025, 9, 12] },
  coffee: { where: 'Quito', date: [2025, 10, 2] }, flowers: { where: 'Cotacachi', date: [2025, 8, 20] },
};
const dateLabel = (d: [number, number, number]) => { try { return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d[0], d[1], d[2])); } catch { return ''; } };

function TutorialCard({ entry, index, stage, reduced, register, drag, label }: { entry: CardEntry; index: number; stage: { width: number; height: number }; reduced: boolean; register: (key: string, offset: Offset) => () => void; drag?: { down: (e: PointerEvent) => void; move: (e: PointerEvent) => void; up: (e: PointerEvent) => void; key: (e: KeyboardEvent) => void }; label: string }) {
  const photo = PHOTOS[entry.photo];
  const { cardWidth, cardHeight } = cardBox(stage, { width: photo.width, height: photo.height, kind: 'photo' }, false);
  const front = index === 0;
  const base = front ? { x: 0, y: 0, r: 0 } : { x: 8, y: -6, r: 4 };
  const ox = useMotionValue(0), oy = useMotionValue(0);
  const x = useMotionValue(entry.back && !reduced ? -440 : base.x), y = useMotionValue(base.y), rotate = useMotionValue(entry.back && !reduced ? -12 : base.r);
  const pose = useRef({ base, front }); pose.current = { base, front };
  useEffect(() => register(entry.key, { x: ox, y: oy }), [entry.key]);
  // The finger (and the coach's demo) moves the front card 1:1 across, damped up/down, like the pile.
  useEffect(() => {
    const sync = () => { const p = pose.current; if (!p.front) return; x.stop(); y.stop(); rotate.stop(); x.set(p.base.x + ox.get()); y.set(p.base.y + oy.get() * .55); rotate.set(p.base.r + ox.get() * .035); };
    const a = ox.on('change', sync), b = oy.on('change', sync);
    return () => { a(); b(); };
  }, []);
  useEffect(() => {
    if (reduced) { x.set(base.x); y.set(base.y); rotate.set(base.r); return; }
    const runs = [animate(x, base.x + ox.get(), CARD_SPRING), animate(y, base.y + oy.get() * .55, CARD_SPRING), animate(rotate, base.r, CARD_SPRING)];
    return () => runs.forEach(run => run.stop());
  }, [front, reduced]);
  const caption = CAPTION[entry.photo];
  return <motion.article data-testid={`tutorial-card-${entry.photo}`} className={`photo-card paper ${front ? 'front' : ''}`} inert={!front}
    style={{ zIndex: 20 - index, width: cardWidth, height: cardHeight, left: `calc(50% - ${cardWidth / 2}px)`, top: `calc(50% - ${cardHeight / 2}px)`, x, y, rotate, touchAction: 'none' }}
    initial={entry.back ? { opacity: reduced ? 0 : .4 } : reduced ? false : { opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 - index * .018 }}
    variants={{ leave: (kind: SwipeKind | '') => exitFor(kind, reduced) }} exit="leave" transition={reduced ? { duration: .14 } : CARD_SPRING}
    tabIndex={front ? 0 : -1} aria-hidden={!front} aria-label={front ? label : undefined}
    onPointerDown={drag?.down} onPointerMove={drag?.move} onPointerUp={drag?.up} onPointerCancel={drag?.up} onLostPointerCapture={drag?.up} onKeyDown={drag?.key}>
    <div className="photo-window"><img src={photo.src} alt="" draggable={false}/></div>
    <span className="polaroid-caption"><span className="caption-where">{caption.where}</span><span className="caption-when">{dateLabel(caption.date)}</span></span>
  </motion.article>;
}

/* ---------- The practice ---------- */
export function Tutorial({ done, skip }: { done: () => void; skip: (step: number) => void }) {
  const reduced = !!useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
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

  /* Layout: the stage's size for the cards, and where the lit areas are. */
  const [stage, setStage] = useState({ width: 340, height: 420 });
  const stageObserver = useRef<ResizeObserver | null>(null);
  const stageRef = useCallback((el: HTMLElement | null) => { stageObserver.current?.disconnect(); if (!el) return; const o = new ResizeObserver(([entry]) => setStage({ width: entry.contentRect.width, height: entry.contentRect.height })); o.observe(el); stageObserver.current = o; }, []);
  const [spots, setSpots] = useState<{ strip: Hole | null; tools: Hole | null; card: Hole | null; button: Hole | null }>({ strip: null, tools: null, card: null, button: null });
  const measure = useCallback(() => {
    const r = root.current; if (!r) return;
    const step = stepId(tutNow.current);
    const card = layoutRect(r.querySelector<HTMLElement>('.photo-card.front'), r, 10, 14);
    // «Terminar» carries its counter above its corner: the lit area takes it in.
    const button = layoutRect(r.querySelector<HTMLElement>(BUTTON[step]), r, step === 'finish' ? 13 : 5, 24);
    const strip = layoutRect(r.querySelector<HTMLElement>('.tut-coach'), r, 0, 22);
    const tools = layoutRect(r.querySelector<HTMLElement>('.archive-tools'), r, 0, 22);
    const next = { strip, tools, card, button };
    setSpots(s => JSON.stringify(s) === JSON.stringify(next) ? s : next);
  }, []);
  useLayoutEffect(() => { measure(); const timer = setTimeout(measure, 420); return () => clearTimeout(timer); }, [measure, tut.step, pile[0]?.key, stage.width, stage.height]);
  useEffect(() => {
    const r = root.current; window.addEventListener('resize', measure);
    const observer = r ? new ResizeObserver(measure) : null; if (r) observer!.observe(r);
    return () => { window.removeEventListener('resize', measure); observer?.disconnect(); };
  }, [measure]);

  /* Step log (this device only) and the idle nudge. */
  const started = useRef(false);
  useEffect(() => { if (started.current) return; started.current = true; logTutorial({ type: 'start' }); }, []);
  const reached = useRef(-1);
  useEffect(() => { if (tut.finished || reached.current >= tut.step) return; reached.current = tut.step; logTutorial({ type: 'reach', step: tut.step }); }, [tut.step]);
  useEffect(() => { setNudge(false); }, [tut.step]);
  useEffect(() => { if (!asking || touching || nudge) return; const timer = setTimeout(() => setNudge(true), NUDGE_MS); return () => clearTimeout(timer); }, [asking, touching, nudge, tut.step]);

  /* Doing the step's action, or something else. */
  const perform = (kind: TutorialInput['kind']) => {
    if (kind === 'undo') {
      revision.current++;
      setPile(p => [{ photo: 'screenshot', key: `screenshot~${revision.current}`, back: true }, ...p]);
      setPending(n => Math.max(0, n - 1)); haptic('light');
      return;
    }
    if (kind === 'finish') {
      haptic('success');
      const box = root.current?.getBoundingClientRect();
      if (box) burst('tutorial', { x: box.left + box.width / 2, y: box.top + box.height * .42 }, 'paper', 22);
      return;
    }
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
  // After the confirmation: the next step (after «Deshacer», the screenshot goes back
  // to the queue first), or the end.
  useEffect(() => {
    if (tut.phase !== 'done') return;
    let follow: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      if (id === 'finish') { leaving.current = true; logTutorial({ type: 'complete' }); done(); return; }
      if (id === 'undo') {
        exitKind.current = 'discard'; setPile(p => p.slice(1)); setPending(n => n + 1); setFlash({ kind: 'discard', key: performance.now() }); haptic('rigid');
        follow = setTimeout(() => setTut(advance), REQUEUE_MS);
        return;
      }
      setTut(advance);
    }, DONE_MS[id]);
    return () => { clearTimeout(timer); if (follow) clearTimeout(follow); };
  }, [tut.phase, tut.step]);

  /* The finger on the front card. */
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

  /* The coach's hand: loops the gesture until the person does it. */
  const hx = useMotionValue(0), hy = useMotionValue(0), ho = useMotionValue(0), hs = useMotionValue(1), hp = useMotionValue(1);
  const target = TARGET[id];
  const handAt = target === 'card' ? spots.card && { x: spots.card.x + spots.card.w / 2, y: spots.card.y + spots.card.h * .58 } : spots.button && { x: spots.button.x + spots.button.w / 2, y: spots.button.y + spots.button.h / 2 };
  useEffect(() => {
    const show = asking && !touching && !!handAt;
    if (!show) { animate(ho, 0, { duration: .12 }); return; }
    if (reduced) { hx.set(0); hy.set(0); hs.set(1); hp.set(1); ho.set(1); return; }
    let alive = true;
    const runs: { stop: () => void }[] = [];
    stopCoach.current = () => { const was = alive; alive = false; runs.forEach(r => r.stop()); ho.set(0); return was && target === 'card'; };
    const run = (value: MotionValue<number>, to: number, options: object) => { if (!alive) return Promise.resolve(); const c = animate(value, to, options); runs.push(c); return c; };
    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    const loop = async () => {
      await sleep(tut.phase === 'missed' ? 250 : 650);
      while (alive) {
        hx.set(0); hy.set(0); hs.set(1.16); hp.set(1); ho.set(0);
        await Promise.all([run(ho, 1, { duration: .16 }), run(hs, 1, { type: 'spring', stiffness: 520, damping: 30 }), run(hp, .78, { duration: .16 })]);
        if (!alive) return;
        if (target === 'card') {
          const o = frontOffset(); if (!o) return;
          const way = DIRECTION[id as SwipeKind], distance = nudge ? 128 : 92, duration = nudge ? .78 : .62, ease = [.45, 0, .2, 1] as const;
          // The finger travels the real release distance; the card follows it as the pile does.
          const arming = setTimeout(() => { if (alive && !grip.current) { zoneNow.current = id as SwipeKind; setZone(id as SwipeKind); } }, duration * 520);
          await Promise.all([run(o.x, way.x * distance, { duration, ease }), run(o.y, way.y * distance, { duration, ease }), run(hx, way.x * distance, { duration, ease }), run(hy, way.y * distance, { duration, ease })]);
          clearTimeout(arming);
          if (!alive) return;
          await sleep(300);
          if (!alive) return;
          if (grip.current) return;
          zoneNow.current = ''; setZone('');
          run(hp, 1, { duration: .12 }); run(ho, 0, { duration: .2 }); run(hs, 1.1, { duration: .2 });
          await Promise.all([run(o.x, 0, CARD_SPRING), run(o.y, 0, CARD_SPRING)]);
        } else {
          for (let i = 0; i < 2 && alive; i++) { await run(hp, .62, { duration: .1 }); await run(hp, .78, { duration: .18 }); await sleep(120); }
          await sleep(260);
          run(ho, 0, { duration: .2 }); run(hp, 1, { duration: .2 });
        }
        await sleep(nudge ? 450 : 850);
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
  const line = tut.phase === 'done' ? DONE[id]() : tut.phase === 'missed' ? MISS[id]() : ASK[id]();
  const pose: Pose | ArtSlot = tut.phase === 'done' ? DONE_POSE[id] : tut.phase === 'missed' ? 'coqui-shrug' : 'coqui-point';
  const front = pile[0];
  // Coqui's place: his strip above the pile; for «hacia arriba» he waits over the tools
  // row (unused in that step), so the rising photo never runs into his line.
  const coachAt = id === 'favorite' ? spots.tools : spots.strip;
  const coachHole = coachAt && { ...coachAt, x: coachAt.x - 2, y: coachAt.y - 2, w: coachAt.w + 4, h: coachAt.h + 4 };
  const holes = useMemo(() => [coachHole, target === 'card' ? spots.card : null, spots.button].filter((h): h is Hole => !!h), [spots, id]);
  const follow = target === 'card' && spots.card && front && offsets.current.get(front.key);
  const followIndex = coachHole ? 1 : 0;
  const followSpec = useMemo(() => follow ? { index: followIndex, x: follow.x, y: follow.y, ky: .55 } : undefined, [follow, followIndex]);
  const locked = !asking;
  const nowNumber = Math.min(tut.step + 1, STEP_COUNT);
  return <div ref={root} className={`session-content tutorial ${tut.phase === 'done' ? 'is-celebrating' : ''}`} aria-roledescription={t('Práctica')}>
    <header className="archive-header is-session">
      <span className="tut-inert" inert><FilterSwitch on toggle={() => {}} edit={() => {}}/></span>
      <h1 className="header-brand"><div className="brand-status"><span className="brand-wordmark" aria-hidden="true"><Wordmark/></span><span className="sr-only">CocoWash</span></div></h1>
      <FinishButton pending={pending} busy={locked} announce={() => {}} finish={() => act({ kind: 'finish', via: 'button' })}/>
    </header>
    <div className="archive-progress tut-progress">
      <div className="tut-steps" role="progressbar" aria-label={t('Progreso de la práctica')} aria-valuemin={1} aria-valuemax={STEP_COUNT} aria-valuenow={nowNumber} aria-valuetext={t('Paso {n} de {total}', { n: nowNumber, total: STEP_COUNT })}>
        {STEP_IDS.map((step, i) => <span key={step} className={i === tut.step ? 'is-now' : ''}><motion.i initial={false} animate={{ scaleX: i < tut.step || (i === tut.step && tut.phase === 'done') ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}/></span>)}
      </div>
      <span className="tut-count" aria-hidden="true">{t('{n} de {total}', { n: nowNumber, total: STEP_COUNT })}</span>
      <button type="button" className="tut-skip" onClick={skipNow}>{t('Saltar')}</button>
    </div>
    <div className="tut-coach" aria-hidden="true"/>
    {coachAt && <motion.div className={`coach-float ${coachAt === spots.tools ? 'is-low' : ''}`} initial={false} animate={{ left: coachAt.x, top: coachAt.y, width: coachAt.w, height: coachAt.h }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }}>
      <Bubble pose={pose} text={line} tone={tut.phase} hop={tut.phase === 'done' && (id === 'favorite' || id === 'finish')}/>
    </motion.div>}
    <section ref={stageRef} className={`hand-space ${zone}`} aria-label={t('Pila de práctica')}>
      <div className="polaroid-stack">
        <AnimatePresence custom={exitKind.current}>{pile.slice(0, 2).reverse().map(entry => {
          const index = pile.indexOf(entry);
          return <TutorialCard key={entry.key} entry={entry} index={index} stage={stage} reduced={reduced} register={register}
            drag={index === 0 ? { down, move, up, key } : undefined} label={t('Foto de práctica. Desliza o usa los botones de abajo.')}/>;
        })}</AnimatePresence>
        <AnimatePresence>{zone && <motion.span key={zone} className={`drag-stamp ${zone}`}>
          <motion.span className="drag-stamp-ink" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.28, rotate: zone === 'discard' ? -5 : 5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: .1 } } : { opacity: 0, scale: 1.1, transition: { duration: .1, ease: [.2, .8, .2, 1] } }}
            transition={reduced ? { duration: .12 } : { type: 'spring', duration: .22, bounce: .28 }}><Stamp kind={zone} word lettering/></motion.span>
        </motion.span>}</AnimatePresence>
        {flash && <DecisionStamp key={flash.key} kind={flash.kind} lettering reduced={reduced} done={() => setFlash(f => f?.key === flash.key ? null : f)}/>}
      </div>
    </section>
    <DecisionBar count={1} disabled={locked} favoriteOn={false} armed={zone}
      onDiscard={() => act({ kind: 'discard', via: 'button' })} onFavorite={() => act({ kind: 'favorite', via: 'button' })} onKeep={() => act({ kind: 'keep', via: 'button' })}/>
    <footer className="archive-tools">
      <button className="tut-undo" onClick={() => act({ kind: 'undo', via: 'button' })} disabled={locked || tut.step === 0} aria-label={t('Deshacer la última decisión')}><span className="tool-icon"><ArrowUUpLeftIcon size={24} className="flip-rtl"/></span><span className="tool-label">{t('Deshacer')}</span></button>
      <button className="later tut-later" aria-label={t('Dejar para más tarde')} disabled={locked} onClick={() => act({ kind: 'later', via: 'button' })}><span className="tool-icon"><DecisionIcon kind="later" size={24}/></span><span className="tool-label">{t('Más tarde')}</span></button>
      {onAndroid() ? <span aria-hidden="true"/> : <button className="tut-album" disabled aria-hidden="true" tabIndex={-1}><span className="tool-icon"><FolderSimplePlusIcon size={24}/></span><span className="tool-label">{t('Álbum')}</span></button>}
    </footer>
    <div className="coach-layer" aria-hidden="true">
      <Dim on={asking} holes={holes} follow={followSpec}/>
      {asking && spots.button && <Ring hole={spots.button} strong={target !== 'card' || nudge}/>}
      {handAt && <Hand at={handAt} x={hx} y={hy} opacity={ho} scale={hs} press={hp} still={reduced} arrow={reduced && target === 'card' ? DIRECTION[id as SwipeKind].arrow : undefined}/>}
    </div>
    <p className="sr-only" role="status" aria-live="polite">{line}</p>
  </div>;
}
