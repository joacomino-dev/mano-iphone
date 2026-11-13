import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CaretRightIcon, LockSimpleIcon, PushPinIcon, HandTapIcon, MagnifyingGlassPlusIcon, SquaresFourIcon } from '@phosphor-icons/react';
import type { PhotoPermission } from './library';
import { CocoLoader } from './Loader';
import { haptic } from './haptics';
import { Stamp } from './Stamp';
import { Character } from './Characters';
import { FilterSwitch, Wordmark } from './Chrome';
import { ONBOARDING_KEY } from './meta';
import { t } from './i18n';

/* CocoWash's own generated postcards: no stock photos, no people, and no
   character presented as final (character scenes come later). */
const PHOTO = '/assets/demo/postcard-1.svg';
const NEXT = '/assets/demo/postcard-6.svg';
const THIRD = '/assets/demo/postcard-3.svg';
/** Card 3's group of similar photos: each tap brings the next one to the front. */
const GROUP = [PHOTO, NEXT, THIRD];
const FAN = ['/assets/demo/postcard-2.svg', PHOTO, '/assets/demo/postcard-5.svg'];

/** The empty main screen behind the tour: header and an empty pile, inert. */
function Ghost() {
  return <div className="ob-ghost" aria-hidden="true" inert>
    {/* The real header (same classes, the real Filtros switch): nothing changes size or
        shape when the tour ends (user, 2026-11-13). */}
    <div className="archive-header is-session">
      <FilterSwitch on toggle={() => {}} edit={() => {}}/>
      <span className="header-brand"><span className="brand-wordmark"><Wordmark/></span></span>
      <span className="header-action finish">{t('Terminar')}</span>
    </div>
    <div className="ob-ghost-pile"/>
    <div className="ob-ghost-buttons"><span/><span/></div>
  </div>;
}

/** Card 1 — who: the main Coqui beside the keepsakes he looks after. */
function MeetDemo({ still }: { still: boolean }) {
  return <div className="ob-demo ob-meet" aria-hidden="true">
    {FAN.map((src, i) => <motion.span key={src} className={`ob-polaroid paper is-${i}`} initial={still ? false : { y: 24, opacity: 0, rotate: 0 }}
      animate={{ y: 0, opacity: 1, rotate: (i - 1) * 10 }} transition={{ type: 'spring', stiffness: 260, damping: 24, delay: still ? 0 : .08 * i }}><img src={src} alt="" draggable={false}/></motion.span>)}
    <Character pose="coqui-hero" height={190} className="ob-hero" delay={.2}/>
  </div>;
}

/* Gesture demo (card 2): the four real swipes of the pile, one at a time, in
   the order of the list — right Conservar, left Eliminar, up Favorita, down
   Más tarde. Each step: the finger takes the photo out to its side, the
   decision's stamp lands, the photo comes back faint (a return, never read as
   a gesture). One full round = 4 × STEP_MS; «Continuar» waits for it once. */
const STEP_MS = 1600;
export const GESTURE_ROUND_MS = STEP_MS * 4;
/** Cards 2–3: the photo is already in place when the card arrives, and the demo
 * starts only after this pause (the card's own transition has settled). */
const DEMO_DELAY_MS = 700;
/** Card 3, 9.8.1: «Toca» leads and stays longest (two taps through a group of
 * three), then «Zoom» shows its two ways: hold and drag to «Anclar», or pinch. */
const PHASE_MS: Record<Phase, number> = { tap: 5200, hold: 3800, pinch: 3600 };
/** One full round of card 3 (tap, hold, pinch); «Continuar» waits for it once. */
export const ZOOM_ROUND_MS = PHASE_MS.tap + PHASE_MS.hold + PHASE_MS.pinch;
/** Within the tap phase: when each tap lands (s). */
const TAPS = [1.1, 3.0];
type Step = 'keep' | 'discard' | 'favorite' | 'later';
const STEPS: Step[] = ['keep', 'discard', 'favorite', 'later'];
const OUT: Record<Step, { x: number; y: number; rotate: number }> = {
  keep: { x: 84, y: 0, rotate: 8 }, discard: { x: -84, y: 0, rotate: -8 }, favorite: { x: 0, y: -34, rotate: 0 }, later: { x: 0, y: 34, rotate: 0 },
};
/** Where a demo photo starts each step (keyframed steps remount: `initial={false}`
 * would jump straight to the last keyframe and nothing would move). */
const REST = { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 };
const ARROW: Record<Step, string> = { keep: '→', discard: '←', favorite: '↑', later: '↓' };
type Phase = 'tap' | 'hold' | 'pinch';
const PHASES: Phase[] = ['tap', 'hold', 'pinch'];

/** Cards 2 and 3 share this one photo: it acts out the four decisions, then
 * stays on screen for card 3 — the tap through a group, and the two ways to zoom. */
function PhotoDemo({ step, still, waiting, phase, gesture, turn }: { step: 1 | 2; still: boolean; waiting: boolean; phase: Phase; gesture: Step; turn: number }) {
  const gestures = step === 1 && !still && !waiting;
  const acting = step === 2 && !still && !waiting;
  const D = PHASE_MS[phase] / 1000 - .2;
  const out = OUT[gesture];
  const group = step === 2;
  // Tap phase: which photo of the group is in front (0 → 1 → 2), one per tap.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!acting || phase !== 'tap') return;
    const timers = TAPS.map((at, i) => setTimeout(() => setShown(i + 1), at * 1000 + 120));
    return () => timers.forEach(clearTimeout);
  }, [acting, phase]);
  const front = group && phase === 'tap' ? (still ? 1 : shown) : 0;
  // One step: out (finger on), hold with the stamp, back (faint, finger off).
  const card = gestures ? { x: [0, out.x, out.x, 0, 0], y: [0, out.y, out.y, 0, 0], rotate: [0, out.rotate, out.rotate, 0, 0], opacity: [1, 1, 1, .45, 1], scale: out.y ? [1, .92, .92, 1, 1] : 1 }
    : !acting ? { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }
    // Hold: lift, drag down onto «Anclar», let go: the photo comes back up open
    // and larger, and stays — that is anchoring.
    : phase === 'hold' ? { x: 0, y: [0, 0, 0, 58, 58, 0, 0], rotate: 0, opacity: 1, scale: [1, 1.05, 1.05, .9, .9, 1.14, 1.14] }
    // Pinch: the photo opens large, then the picture itself zooms in.
    : phase === 'pinch' ? { x: 0, y: 0, rotate: 0, opacity: 1, scale: [1, 1, 1.14, 1.14] }
    // Tap: a visible press at each tap.
    : { x: 0, y: 0, rotate: 0, opacity: 1, scale: [1, 1, .95, 1, 1, .95, 1, 1] };
  const tapTimes = [0, TAPS[0] / D - .03, TAPS[0] / D, TAPS[0] / D + .05, TAPS[1] / D - .03, TAPS[1] / D, TAPS[1] / D + .05, 1];
  const timing = gestures ? { duration: STEP_MS / 1000, times: [0, .36, .66, .86, 1], ease: 'easeInOut' as const }
    : acting ? { duration: D, times: phase === 'hold' ? [0, .14, .28, .5, .6, .74, 1] : phase === 'pinch' ? [0, .12, .4, 1] : [0, tapTimes[1], tapTimes[2], tapTimes[3], tapTimes[4], tapTimes[5], tapTimes[6], 1], ease: 'easeInOut' as const } : { duration: .2 };
  return <div className={`ob-demo ob-photo ${group ? 'is-group' : ''}`} aria-hidden="true">
    {group && <><span className="ob-behind paper is-a"><img src={GROUP[(front + 1) % 3]} alt="" draggable={false}/></span><span className="ob-behind paper is-b"><img src={GROUP[(front + 2) % 3]} alt="" draggable={false}/></span></>}
    {group && phase === 'tap' && <span className="ob-count">{t('{n} de {total}', { n: front + 1, total: 3 })}</span>}
    <motion.span key={step === 1 ? `1-${turn}` : `2-${phase}`} className={`ob-card paper ${step === 1 ? 'is-gesture' : ''}`} initial={still ? false : REST} animate={card} transition={timing}>
      <span className="ob-card-photo">
        <AnimatePresence initial={false}><motion.img key={GROUP[front]} src={GROUP[front]} alt="" draggable={false} initial={{ opacity: 0, scale: 1.04 }} animate={phase === 'pinch' && acting ? { opacity: 1, scale: [1, 1, 1, 1.7] } : { opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }} transition={phase === 'pinch' && acting ? { duration: D, times: [0, .4, .5, .9] } : { duration: .22 }}/></AnimatePresence>
      </span>
      {step === 1 && (still || gestures) && <motion.span key={`stamp-${turn}`} className={`ob-stamp is-${gesture}`} initial={{ opacity: 0 }}
        animate={{ opacity: still ? 1 : [0, 0, 1, 1, 0] }} transition={still ? { duration: .2 } : { duration: STEP_MS / 1000, times: [0, .3, .42, .8, 1] }}><Stamp kind={gesture}/></motion.span>}
    </motion.span>
    {gestures && <motion.span key={`finger-${turn}`} className="ob-finger" initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: [0, out.x, out.x, 0], y: [0, out.y, out.y, 0], opacity: [0, 1, .9, 0] }} transition={{ duration: STEP_MS / 1000, times: [0, .38, .7, .85] }}/>}
    {/* Reduce Motion: no travel — the stamp lands in place and an arrow says which way. */}
    {step === 1 && still && <span className={`ob-arrow is-${gesture}`}>{ARROW[gesture]}</span>}
    {acting && phase === 'tap' && <motion.span key="tap" className="ob-finger is-tap" initial={{ opacity: 0, scale: 1 }}
      animate={{ opacity: [0, 1, 1, 1, 1, 1, 1, 0], scale: [1, 1, .78, 1, 1, .78, 1, 1] }} transition={{ duration: D, times: tapTimes }}/>}
    {acting && phase === 'hold' && <motion.span key="hold" className="ob-finger is-hold" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 1, 1, 0, 0], y: [0, 0, 0, 58, 58, 58] }} transition={{ duration: D, times: [0, .12, .28, .5, .6, 1] }}/>}
    {acting && phase === 'pinch' && <><motion.span key="z1" className="ob-finger is-pinch" initial={{ opacity: 0, x: -10, y: 10 }} animate={{ opacity: [0, 1, 1, 0], x: [-10, -10, -46, -46], y: [10, 10, 34, 34] }} transition={{ duration: D, times: [0, .1, .4, .5] }}/><motion.span key="z2" className="ob-finger is-pinch" initial={{ opacity: 0, x: 10, y: -10 }} animate={{ opacity: [0, 1, 1, 0], x: [10, 10, 46, 46], y: [-10, -10, -34, -34] }} transition={{ duration: D, times: [0, .1, .4, .5] }}/></>}
    {group && phase !== 'tap' && <span className={`ob-dock ${phase === 'hold' ? 'is-on' : ''}`}><PushPinIcon size={16} weight={phase === 'hold' ? 'fill' : 'regular'}/>{t('Anclar')}</span>}
  </div>;
}

/** Card 4 — privacy before the system prompt: Coqui guarding a safe; everything stays here. */
function PrivacyDemo({ still }: { still: boolean }) {
  return <div className="ob-demo ob-privacy" aria-hidden="true">
    <Character pose="coqui-safe" height={150} motion="sway"/>
    <motion.span className="ob-lock" initial={still ? false : { scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 22, delay: .35 }}><LockSimpleIcon size={18} weight="fill"/></motion.span>
  </div>;
}

function Row({ art, title, children, on }: { art: ReactNode; title: ReactNode; children: ReactNode; on?: boolean }) {
  return <li className={`ob-row ${on ? 'is-on' : ''}`}><span className="ob-row-art" aria-hidden="true">{art}</span><span><strong>{title}</strong><span>{children}</span></span></li>;
}

const cards = () => [
  { key: 'meet', title: t('Lo que importa, se queda.'), text: t('Coqui te ayuda a ordenar tu carrete con decisiones rápidas. Tú eliges qué se queda.') },
  { key: 'how', title: t('Desliza para decidir.'), text: t('Cada dirección es una decisión. Al soltar, el sello la confirma.') },
  { key: 'group', title: t('Toca para cambiar. Separa los dedos para ampliar.'), text: '' },
  { key: 'privacy', title: t('Tus fotos no salen de tu iPhone.'), text: t('CocoWash necesita acceso a Fotos para mostrarte tu carrete. No sube ni comparte nada, y solo se borra lo que confirmes en Fotos.') },
];

/** First-launch tour over the empty main screen. Paced by the person
 * (Atrás/Continuar, arrow keys), no skip. «Continuar» on the gestures card
 * waits for one round of the four swipes (~5 s) the first time only — also
 * with Reduce Motion, whose round is the same steps without travel — and not
 * when the tour is opened again. It stays focusable (aria-disabled), so
 * VoiceOver reads the four rows meanwhile and hears when it is ready.
 * Photos is requested on the last card. */
/** `granted`: Photos access is already given (tour seen again): the last card
 * starts instead of asking. */
export function Onboarding({ requestAccess, finish, granted = false }: { requestAccess: () => Promise<PhotoPermission>; finish: (status: PhotoPermission) => void; granted?: boolean }) {
  const reduced = useReducedMotion();
  const still = !!reduced;
  const [index, setIndex] = useState(0);
  const [deck] = useState(cards);
  const [direction, setDirection] = useState(1);
  const [asking, setAsking] = useState(false);
  // Seen before (tour opened again from Ajustes): the demo plays, nothing waits.
  const [replay] = useState(() => { try { return localStorage.getItem(ONBOARDING_KEY) === 'done'; } catch { return false; } });
  const [seen, setSeen] = useState(replay);
  const [seenZoom, setSeenZoom] = useState(replay);
  const [phase, setPhase] = useState<Phase>('tap');
  // Gesture demo: which swipe is playing (turn counts steps, so each restarts).
  const [turn, setTurn] = useState(0);
  const gesture = STEPS[turn % STEPS.length];
  const heading = useRef<HTMLHeadingElement>(null);
  const card = deck[index];
  const last = index === deck.length - 1;
  // Cards 2 and 3 each play their demo once before «Continuar» unlocks (first time only).
  const locked = (index === 1 && !seen) || (index === 2 && !seenZoom);
  const lockMs = index === 2 ? ZOOM_ROUND_MS : GESTURE_ROUND_MS;
  // Cards 2–3 arrive with the photo at rest; the demo starts after a pause.
  const [waiting, setWaiting] = useState(true);
  useEffect(() => { if (index !== 1 && index !== 2) return; setWaiting(true); const t = setTimeout(() => setWaiting(false), DEMO_DELAY_MS); return () => clearTimeout(t); }, [index]);
  useEffect(() => { if (index !== 1 || waiting) return; setTurn(0); const t = setInterval(() => setTurn(n => n + 1), STEP_MS); return () => clearInterval(t); }, [index, waiting]);
  // «Continuar» waits for one full round of the four swipes, the first time only
  // (the same round with Reduce Motion: stamps in place and arrows).
  useEffect(() => { if (index !== 1 || seen) return; const t = setTimeout(() => setSeen(true), DEMO_DELAY_MS + GESTURE_ROUND_MS); return () => clearTimeout(t); }, [index, seen]);
  useEffect(() => { if (index !== 2 || seenZoom) return; const t = setTimeout(() => setSeenZoom(true), DEMO_DELAY_MS + ZOOM_ROUND_MS); return () => clearTimeout(t); }, [index, seenZoom]);
  // Card 3 cycles tap → hold → pinch, each phase for its own time.
  useEffect(() => { if (index !== 2 || waiting) return; setPhase('tap'); }, [index, waiting]);
  useEffect(() => { if (index !== 2 || waiting) return; const timer = setTimeout(() => setPhase(p => PHASES[(PHASES.indexOf(p) + 1) % PHASES.length]), PHASE_MS[phase]); return () => clearTimeout(timer); }, [index, waiting, phase]);
  const go = (next: number) => { if (next < 0 || next >= deck.length || asking || (next > index && locked)) return; setDirection(next > index ? 1 : -1); setIndex(next); haptic('selection'); };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' && !last) go(index + 1); if (e.key === 'ArrowLeft') go(index - 1); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const allow = async () => {
    setAsking(true); haptic('light');
    try { finish(await requestAccess()); } finally { setAsking(false); }
  };
  const demo = index === 0 ? <MeetDemo still={still}/> : index === 3 ? <PrivacyDemo still={still}/> : <PhotoDemo step={index as 1 | 2} still={still} waiting={waiting} phase={phase} gesture={gesture} turn={turn}/>;
  return <main className="onboarding" aria-roledescription={t('Introducción')}>
    <Ghost/>
    <div className="ob-sheet paper">
      <div className="ob-progress" role="progressbar" aria-label={t('Progreso de la introducción')} aria-valuemin={1} aria-valuemax={deck.length} aria-valuenow={index + 1} aria-valuetext={t('Paso {n} de {total}', { n: index + 1, total: deck.length })}>
        {deck.map((c, i) => <span key={c.key}><motion.i initial={false} animate={{ scaleX: i <= index ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}/></span>)}
      </div>
      {/* One composition for every card: illustration zone and copy as one block,
          centred between the progress and the buttons; the illustration is
          centred in its zone, which gives way to longer copy (scrolls last). */}
      <div className="ob-body">
      {/* The photo demo keeps one element across cards 2–3: the same image continues. */}
      <div className="ob-demo-area" key={index === 1 || index === 2 ? 'photo' : card.key}>{demo}</div>
      <div className="ob-stage">
        {/* popLayout: the leaving copy steps out of the layout at once, so the photo
            above is already where it will stay (no drift into place). */}
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.section key={card.key} custom={direction}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 * direction }} animate={{ opacity: 1, x: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 * direction }}
            transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 380, damping: 36 }}>
            <h1 ref={heading} tabIndex={-1}>{card.title}</h1>
            {card.text && <p>{card.text}</p>}
            {card.key === 'how' && <ul className="ob-rows">
              <Row on={gesture === 'keep'} art={<Stamp kind="keep"/>} title={<>{t('Conservar')} <small>{t('a la derecha')} <bdi>→</bdi></small></>}>{t('Se queda en tu carrete.')}</Row>
              <Row on={gesture === 'discard'} art={<Stamp kind="discard"/>} title={<>{t('Eliminar')} <small>{t('a la izquierda')} <bdi>←</bdi></small></>}>{t('Se aparta. Solo se borra si lo confirmas al terminar.')}</Row>
              <Row on={gesture === 'favorite'} art={<Stamp kind="favorite"/>} title={<>{t('Favorita')} <small>{t('hacia arriba')} ↑</small></>}>{t('Se queda y se marca como favorita en Fotos.')}</Row>
              <Row on={gesture === 'later'} art={<Stamp kind="later"/>} title={<>{t('Más tarde')} <small>{t('hacia abajo')} ↓</small></>}>{t('¿Dudas? Vuelve al final de la pila.')}</Row>
            </ul>}
            {card.key === 'group' && <ul className="ob-rows">
              <Row on={phase === 'tap'} art={<HandTapIcon size={26} weight="bold"/>} title={t('Toca la foto')}>{t('En un grupo de parecidas, cada toque trae la siguiente.')}</Row>
              <Row on={phase !== 'tap'} art={<MagnifyingGlassPlusIcon size={26} weight="bold"/>} title={t('Ampliar')}>
                <span className="ob-ways"><span className={phase === 'hold' ? 'is-on' : ''}><PushPinIcon size={14} weight="bold"/>{t('Mantén y arrastra hasta Anclar')}</span><span className={phase === 'pinch' ? 'is-on' : ''}><MagnifyingGlassPlusIcon size={14} weight="bold"/>{t('O separa dos dedos')}</span></span>
                {t('Se abre en grande. Junta los dedos para cerrarla.')}</Row>
              {/* Subtle: the way into the grid, the opposite gesture. */}
              <Row art={<SquaresFourIcon size={24} weight="bold"/>} title={t('Ver todas')}>{t('Junta dos dedos sobre la foto y verás todas en cuadrícula.')}</Row>
            </ul>}
          </motion.section>
        </AnimatePresence>
      </div>
      </div>
      <footer className="ob-actions">
        <button className="ob-back" onClick={() => go(index - 1)} disabled={index === 0 || asking} aria-hidden={index === 0} tabIndex={index === 0 ? -1 : 0}>{t('Atrás')}</button>
        {last ? <button className="ob-next" onClick={allow} disabled={asking} aria-busy={asking}>{asking ? <><CocoLoader size={24}/>{t('Esperando permiso…')}</> : <>{granted ? t('Empezar') : t('Permitir acceso a Fotos')}</>}</button>
          : <button className={`ob-next ${locked ? 'is-waiting' : ''}`} onClick={() => go(index + 1)} aria-disabled={locked || undefined} aria-describedby={locked ? 'ob-wait' : undefined}>
            {/* While the first round plays, the button fills with it: waiting, not broken. Same size and label throughout. */}
            {locked && <motion.span key={`fill-${index}`} className="ob-next-fill" aria-hidden="true" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: DEMO_DELAY_MS / 1000, duration: lockMs / 1000, ease: 'linear' }}/>}
            <span className="ob-next-label">{t('Continuar')}<CaretRightIcon size={18} weight="bold" className="flip-rtl"/></span></button>}
      </footer>
      <p id="ob-wait" className={`ob-wait ${locked ? 'is-on' : ''}`} aria-live="polite">{index === 1 || index === 2 ? (locked ? (index === 1 ? t('Mira las cuatro direcciones una vez.') : t('Mira el toque y las dos formas de zoom una vez.')) : replay ? '' : t('Ya puedes continuar.')) : ''}</p>
    </div>
  </main>;
}
