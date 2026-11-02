import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CaretRightIcon, LockSimpleIcon, PushPinIcon, SlidersHorizontalIcon, HandTapIcon, ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import type { PhotoPermission } from './library';
import { CocoLoader } from './Loader';
import { haptic } from './haptics';
import { Stamp } from './Stamp';
import { Character } from './Characters';
import { Wordmark } from './Chrome';
import { ONBOARDING_KEY } from './meta';

/* CocoWash's own generated postcards: no stock photos, no people, and no
   character presented as final (character scenes come later). */
const PHOTO = '/assets/demo/postcard-1.svg';
const NEXT = '/assets/demo/postcard-6.svg';
const FAN = ['/assets/demo/postcard-2.svg', PHOTO, '/assets/demo/postcard-5.svg'];

/** The empty main screen behind the tour: header and an empty pile, inert. */
function Ghost() {
  return <div className="ob-ghost" aria-hidden="true" inert>
    <div className="archive-header">
      <span className="header-action header-filters"><SlidersHorizontalIcon size={18}/>Filtros</span>
      <span className="header-brand"><span className="brand-wordmark"><Wordmark/></span></span>
      <span className="header-action finish">Terminar</span>
    </div>
    <div className="ob-ghost-pile"/>
    <div className="ob-ghost-buttons"><span/><span/></div>
  </div>;
}

/** Card 1 — who: Coqui washing Memo, beside the keepsakes they look after. */
function MeetDemo({ still }: { still: boolean }) {
  return <div className="ob-demo ob-meet" aria-hidden="true">
    {FAN.map((src, i) => <motion.span key={src} className={`ob-polaroid paper is-${i}`} initial={still ? false : { y: 24, opacity: 0, rotate: 0 }}
      animate={{ y: 0, opacity: 1, rotate: (i - 1) * 10 }} transition={{ type: 'spring', stiffness: 260, damping: 24, delay: still ? 0 : .08 * i }}><img src={src} alt="" draggable={false}/></motion.span>)}
    <Character pose="coqui-memo" height={190} className="ob-hero" delay={.2}/>
  </div>;
}

/* Gesture demo (card 2): the four real swipes of the pile, one at a time, in
   the order of the list — right Conservar, left Eliminar, up Favorita, down
   Más tarde. Each step: the finger takes the photo out to its side, the
   decision's stamp lands, the photo comes back faint (a return, never read as
   a gesture). One full round = 4 × STEP_MS; «Continuar» waits for it once. */
const STEP_MS = 1250;
export const GESTURE_ROUND_MS = STEP_MS * 4;
type Step = 'keep' | 'discard' | 'favorite' | 'later';
const STEPS: Step[] = ['keep', 'discard', 'favorite', 'later'];
const OUT: Record<Step, { x: number; y: number; rotate: number }> = {
  keep: { x: 84, y: 0, rotate: 8 }, discard: { x: -84, y: 0, rotate: -8 }, favorite: { x: 0, y: -34, rotate: 0 }, later: { x: 0, y: 34, rotate: 0 },
};
/** Where a demo photo starts each step (keyframed steps remount: `initial={false}`
 * would jump straight to the last keyframe and nothing would move). */
const REST = { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 };
const ARROW: Record<Step, string> = { keep: '→', discard: '←', favorite: '↑', later: '↓' };
type Phase = 'tap' | 'anchor' | 'zoom';
const PHASES: Phase[] = ['tap', 'anchor', 'zoom'];

/** Cards 2 and 3 share this one photo: it acts out the three decisions, then
 * stays on screen to show the tap in a group, Anclar and Ampliar. */
function PhotoDemo({ step, still, phase, gesture, turn }: { step: 1 | 2; still: boolean; phase: Phase; gesture: Step; turn: number }) {
  const gestures = step === 1 && !still;
  const out = OUT[gesture];
  const group = step === 2;
  // One step: out (finger on), hold with the stamp, back (faint, finger off).
  const card = gestures ? { x: [0, out.x, out.x, 0, 0], y: [0, out.y, out.y, 0, 0], rotate: [0, out.rotate, out.rotate, 0, 0], opacity: [1, 1, 1, .45, 1], scale: out.y ? [1, .92, .92, 1, 1] : 1 }
    : !group || still ? { x: 0, y: 0, rotate: 0, opacity: 1, scale: phase === 'zoom' && !still ? 1.22 : 1 }
    : phase === 'anchor' ? { x: 0, y: [0, 0, 0, 58, 58, 0], rotate: 0, opacity: [1, 1, 1, 1, 1, .4], scale: [1, 1.04, 1.04, .9, .9, 1] }
    : phase === 'zoom' ? { x: 0, y: 0, rotate: 0, opacity: [1, 1, 1, .4], scale: [1, 1.28, 1.28, 1] }
    : { x: 0, y: 0, rotate: 0, opacity: 1, scale: [1, .97, 1] };
  const timing = gestures ? { duration: STEP_MS / 1000, times: [0, .36, .66, .86, 1], ease: 'easeInOut' as const } : group && !still ? { duration: 2.2, times: phase === 'anchor' ? [0, .18, .3, .62, .8, 1] : phase === 'zoom' ? [0, .45, .8, 1] : [0, .3, 1], ease: 'easeInOut' as const } : { duration: .2 };
  return <div className={`ob-demo ob-photo ${group ? 'is-group' : ''}`} aria-hidden="true">
    {group && <><span className="ob-behind paper is-a"><img src={NEXT} alt="" draggable={false}/></span><span className="ob-behind paper is-b"><img src="/assets/demo/postcard-3.svg" alt="" draggable={false}/></span></>}
    <motion.span key={step === 1 ? `1-${turn}` : `2-${phase}`} className={`ob-card paper ${step === 1 ? 'is-gesture' : ''}`} initial={still ? false : REST} animate={card} transition={timing}>
      <span className="ob-card-photo"><img src={PHOTO} alt="" draggable={false}/>
        {group && phase === 'tap' && <motion.img className="is-next" src={NEXT} alt="" draggable={false} initial={{ opacity: 0 }} animate={{ opacity: still ? 1 : [0, 0, 1] }} transition={still ? { duration: 0 } : { duration: 2.2, times: [0, .3, .36] }}/>}
      </span>
      {step === 1 && <motion.span key={`stamp-${turn}`} className={`ob-stamp is-${gesture}`} initial={{ opacity: 0 }}
        animate={{ opacity: still ? 1 : [0, 0, 1, 1, 0] }} transition={still ? { duration: .2 } : { duration: STEP_MS / 1000, times: [0, .3, .42, .8, 1] }}><Stamp kind={gesture}/></motion.span>}
    </motion.span>
    {gestures && <motion.span key={`finger-${turn}`} className="ob-finger" initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: [0, out.x, out.x, 0], y: [0, out.y, out.y, 0], opacity: [0, 1, .9, 0] }} transition={{ duration: STEP_MS / 1000, times: [0, .38, .7, .85] }}/>}
    {/* Reduce Motion: no travel — the stamp lands in place and an arrow says which way. */}
    {step === 1 && still && <span className={`ob-arrow is-${gesture}`}>{ARROW[gesture]}</span>}
    {group && !still && phase === 'tap' && <motion.span key="tap" className="ob-finger is-tap" initial={{ opacity: 0, scale: 1 }} animate={{ opacity: [0, 1, 1, 0], scale: [1, .82, 1, 1] }} transition={{ duration: 2.2, times: [0, .18, .32, .5] }}/>}
    {group && !still && phase === 'anchor' && <motion.span key="hold" className="ob-finger" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 1, 1, 0, 0], y: [0, 0, 0, 58, 58, 0] }} transition={{ duration: 2.2, times: [0, .18, .3, .62, .72, 1] }}/>}
    {group && !still && phase === 'zoom' && <><motion.span key="z1" className="ob-finger is-pinch" initial={{ opacity: 0, x: -10, y: 10 }} animate={{ opacity: [0, 1, 1, 0], x: [-10, -10, -46, -46], y: [10, 10, 34, 34] }} transition={{ duration: 2.2, times: [0, .12, .45, .6] }}/><motion.span key="z2" className="ob-finger is-pinch" initial={{ opacity: 0, x: 10, y: -10 }} animate={{ opacity: [0, 1, 1, 0], x: [10, 10, 46, 46], y: [-10, -10, -34, -34] }} transition={{ duration: 2.2, times: [0, .12, .45, .6] }}/></>}
    {group && <span className={`ob-dock ${phase === 'anchor' ? 'is-on' : ''}`}><PushPinIcon size={16} weight={phase === 'anchor' ? 'fill' : 'regular'}/>{phase === 'anchor' ? 'Anclada' : 'Anclar'}</span>}
  </div>;
}

/** Card 4 — privacy before the system prompt: Memo, calm; everything stays here. */
function PrivacyDemo({ still }: { still: boolean }) {
  return <div className="ob-demo ob-privacy" aria-hidden="true">
    <Character pose="memo-calm" height={150} motion="sway"/>
    <motion.span className="ob-lock" initial={still ? false : { scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 22, delay: .35 }}><LockSimpleIcon size={18} weight="fill"/></motion.span>
  </div>;
}

function Row({ art, title, children, on }: { art: ReactNode; title: ReactNode; children: ReactNode; on?: boolean }) {
  return <li className={`ob-row ${on ? 'is-on' : ''}`}><span className="ob-row-art" aria-hidden="true">{art}</span><span><strong>{title}</strong><span>{children}</span></span></li>;
}

const cards = [
  { key: 'meet', title: 'Lo que importa, se queda.', text: 'Coqui y Memo te ayudan a ordenar tu carrete con decisiones rápidas. Tú eliges qué se queda.' },
  { key: 'how', title: 'Desliza y sella.', text: 'Al soltar, el sello confirma tu decisión.' },
  { key: 'group', title: 'Toca, ancla y amplía.', text: '' },
  { key: 'privacy', title: 'Tus fotos no salen de tu iPhone.', text: 'CocoWash necesita acceso a Fotos para mostrarte tu carrete. No sube ni comparte nada, y solo se borra lo que confirmes en Fotos.' },
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
  const [direction, setDirection] = useState(1);
  const [asking, setAsking] = useState(false);
  // Seen before (tour opened again from Ajustes): the demo plays, nothing waits.
  const [replay] = useState(() => { try { return localStorage.getItem(ONBOARDING_KEY) === 'done'; } catch { return false; } });
  const [seen, setSeen] = useState(replay);
  const [phase, setPhase] = useState<Phase>('tap');
  // Gesture demo: which swipe is playing (turn counts steps, so each restarts).
  const [turn, setTurn] = useState(0);
  const gesture = STEPS[turn % STEPS.length];
  const heading = useRef<HTMLHeadingElement>(null);
  const card = cards[index];
  const last = index === cards.length - 1;
  const locked = index === 1 && !seen;
  useEffect(() => { if (index !== 1) return; setTurn(0); const t = setInterval(() => setTurn(n => n + 1), STEP_MS); return () => clearInterval(t); }, [index]);
  // «Continuar» waits for one full round of the four swipes, the first time only
  // (the same round with Reduce Motion: stamps in place and arrows).
  useEffect(() => { if (index !== 1 || seen) return; const t = setTimeout(() => setSeen(true), GESTURE_ROUND_MS); return () => clearTimeout(t); }, [index, seen]);
  useEffect(() => { if (index !== 2) return; setPhase('tap'); const t = setInterval(() => setPhase(p => PHASES[(PHASES.indexOf(p) + 1) % PHASES.length]), still ? 2600 : 2400); return () => clearInterval(t); }, [index, still]);
  const go = (next: number) => { if (next < 0 || next >= cards.length || asking || (next > index && locked)) return; setDirection(next > index ? 1 : -1); setIndex(next); haptic('selection'); };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' && !last) go(index + 1); if (e.key === 'ArrowLeft') go(index - 1); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const allow = async () => {
    setAsking(true); haptic('light');
    try { finish(await requestAccess()); } finally { setAsking(false); }
  };
  const demo = index === 0 ? <MeetDemo still={still}/> : index === 3 ? <PrivacyDemo still={still}/> : <PhotoDemo step={index as 1 | 2} still={still} phase={phase} gesture={gesture} turn={turn}/>;
  return <main className="onboarding" aria-roledescription="Introducción">
    <Ghost/>
    <div className="ob-sheet paper">
      <div className="ob-progress" role="progressbar" aria-label="Progreso de la introducción" aria-valuemin={1} aria-valuemax={cards.length} aria-valuenow={index + 1} aria-valuetext={`Paso ${index + 1} de ${cards.length}`}>
        {cards.map((c, i) => <span key={c.key}><motion.i initial={false} animate={{ scaleX: i <= index ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}/></span>)}
      </div>
      {/* One composition for every card: illustration zone and copy as one block,
          centred between the progress and the buttons; the illustration is
          centred in its zone, which gives way to longer copy (scrolls last). */}
      <div className="ob-body">
      {/* The photo demo keeps one element across cards 2–3: the same image continues. */}
      <div className="ob-demo-area" key={index === 1 || index === 2 ? 'photo' : card.key}>{demo}</div>
      <div className="ob-stage">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section key={card.key} custom={direction}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 * direction }} animate={{ opacity: 1, x: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 * direction }}
            transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 380, damping: 36 }}>
            <h1 ref={heading} tabIndex={-1}>{card.title}</h1>
            {card.text && <p>{card.text}</p>}
            {card.key === 'how' && <ul className="ob-rows">
              <Row on={gesture === 'keep'} art={<Stamp kind="keep"/>} title={<>Conservar <small>→ derecha</small></>}>Se queda; vuelve luego con más sello.</Row>
              <Row on={gesture === 'discard'} art={<Stamp kind="discard"/>} title={<>Eliminar <small>← izquierda</small></>}>Se borra al final, solo si confirmas.</Row>
              <Row on={gesture === 'favorite'} art={<Stamp kind="favorite"/>} title={<>Favorita <small>↑ arriba</small></>}>Se queda y es favorita en Fotos.</Row>
              <Row on={gesture === 'later'} art={<Stamp kind="later"/>} title={<>Más tarde <small>↓ abajo</small></>}>¿Dudas? Vuelve al final de la pila.</Row>
            </ul>}
            {card.key === 'group' && <ul className="ob-rows">
              <Row on={phase === 'tap'} art={<HandTapIcon size={22} weight="bold"/>} title="Toca la foto">En un grupo de parecidas, pasa a la siguiente al instante.</Row>
              <Row on={phase === 'anchor'} art={<PushPinIcon size={22} weight="bold"/>} title="Mantén y arrastra abajo">Queda Anclada para mirarla con calma.</Row>
              <Row on={phase === 'zoom'} art={<ArrowsOutSimpleIcon size={22} weight="bold"/>} title="Pellizca">Ampliar para ver los detalles.</Row>
            </ul>}
            {card.key === 'privacy' && <p className="ob-fine">Puedes dar acceso solo a algunas fotos. Para mostrar la ciudad de una foto, iOS consulta a Apple el nombre del lugar.</p>}
          </motion.section>
        </AnimatePresence>
      </div>
      </div>
      <footer className="ob-actions">
        <button className="ob-back" onClick={() => go(index - 1)} disabled={index === 0 || asking} aria-hidden={index === 0} tabIndex={index === 0 ? -1 : 0}>Atrás</button>
        {last ? <button className="ob-next" onClick={allow} disabled={asking} aria-busy={asking}>{asking ? <><CocoLoader size={24}/>Esperando permiso…</> : <>{granted ? 'Empezar' : 'Permitir acceso a Fotos'}</>}</button>
          : <button className={`ob-next ${locked ? 'is-waiting' : ''}`} onClick={() => go(index + 1)} aria-disabled={locked || undefined} aria-describedby={locked ? 'ob-wait' : undefined}>
            {/* While the first round plays, the button fills with it: waiting, not broken. Same size and label throughout. */}
            {locked && <motion.span key="fill" className="ob-next-fill" aria-hidden="true" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: GESTURE_ROUND_MS / 1000, ease: 'linear' }}/>}
            <span className="ob-next-label">Continuar<CaretRightIcon size={18} weight="bold"/></span></button>}
      </footer>
      <p id="ob-wait" className={`ob-wait ${locked ? 'is-on' : ''}`} aria-live="polite">{index === 1 ? (locked ? 'Mira las cuatro direcciones una vez.' : replay ? '' : 'Ya puedes continuar.') : ''}</p>
    </div>
  </main>;
}
