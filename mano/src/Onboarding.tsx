import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, CaretRightIcon, LockSimpleIcon, PushPinIcon, StackIcon, ArrowCounterClockwiseIcon, TrashIcon, ImagesIcon } from '@phosphor-icons/react';
import type { PhotoPermission } from './library';
import { CocoLoader } from './Loader';
import { haptic } from './haptics';

const loop = (duration: number, times: number[], delay = 0) => ({ duration, times, repeat: Infinity, repeatDelay: .6, ease: 'easeInOut' as const, delay });

/** Card 1 — what it is: the mascot in front of a fan of keepsakes. */
function MeetDemo({ still }: { still: boolean }) {
  return <div className="ob-demo ob-meet" aria-hidden="true">
    {[-12, 0, 12].map((rotate, i) => <motion.span key={i} className="ob-polaroid paper" style={{ rotate }} initial={still ? false : { y: 24, opacity: 0, rotate: 0 }}
      animate={{ y: 0, opacity: 1, rotate }} transition={{ type: 'spring', stiffness: 260, damping: 24, delay: still ? 0 : .08 * i }}><span/></motion.span>)}
    <motion.img className="ob-mascot" src="/assets/cocowash.svg" alt="" draggable={false}
      animate={still ? undefined : { y: [0, -5, 0] }} transition={still ? undefined : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}/>
  </div>;
}

/** Card 2 — the three gestures, acted out by one photo on a loop. */
function GestureDemo({ still }: { still: boolean }) {
  const times = [0, .1, .22, .3, .4, .52, .6, .7, .82, .9, 1];
  return <div className="ob-demo ob-gestures" aria-hidden="true">
    <motion.span className="ob-card paper" animate={still ? undefined : { x: [0, 0, 92, 0, 0, -92, 0, 0, 0, 0, 0], y: [0, 0, 0, 0, 0, 0, 0, 0, -84, 0, 0], rotate: [0, 0, 9, 0, 0, -9, 0, 0, 0, 0, 0] }}
      transition={still ? undefined : loop(6, times)}>
      <span className="ob-card-photo"/>
      {!still && <>
        <motion.b className="ob-stamp keep" animate={{ opacity: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0] }} transition={loop(6, times)}>Conservar</motion.b>
        <motion.b className="ob-stamp discard" animate={{ opacity: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0] }} transition={loop(6, times)}>Descartar</motion.b>
        <motion.b className="ob-stamp favorite" animate={{ opacity: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0] }} transition={loop(6, times)}>Favorita</motion.b>
      </>}
    </motion.span>
    {!still && <motion.span className="ob-finger" animate={{ x: [0, 0, 92, 0, 0, -92, 0, 0, 0, 0, 0], y: [0, 0, 0, 0, 0, 0, 0, 0, -84, 0, 0], scale: [1, .86, .86, 1, .86, .86, 1, .86, .86, 1, 1] }} transition={loop(6, times)}/>}
  </div>;
}

function ToolRow({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return <li className="ob-tool"><span className="ob-tool-art" aria-hidden="true">{children}<span className="ob-tool-icon">{icon}</span></span><span><strong>{title}</strong><span>{text}</span></span></li>;
}

/** Card 3 — essentials, each with a tiny looping hint. */
function ToolsDemo({ still }: { still: boolean }) {
  const t = (values: number[]) => still ? undefined : values;
  return <ul className="ob-tools">
    <ToolRow icon={<PushPinIcon size={14} weight="fill"/>} title="Mira de cerca" text="Mantén pulsada una foto y arrástrala abajo para anclarla.">
      <motion.span className="mini-card paper" animate={{ y: t([0, 0, 14, 14, 0]), scale: t([1, 1.06, 1.06, 1, 1]) }} transition={still ? undefined : loop(2.8, [0, .2, .55, .8, 1])}/>
    </ToolRow>
    <ToolRow icon={<StackIcon size={14} weight="bold"/>} title="Parecidas, juntas" text="Las fotos casi iguales llegan agrupadas para decidir de una vez.">
      {[0, 1, 2].map(i => <motion.span key={i} className="mini-card paper" style={{ zIndex: 3 - i }} animate={{ x: t([0, (i - 1) * 9, (i - 1) * 9, 0]), rotate: t([0, (i - 1) * 8, (i - 1) * 8, 0]) }} transition={still ? undefined : loop(2.8, [0, .3, .7, 1], .1)}/>)}
    </ToolRow>
    <ToolRow icon={<ArrowCounterClockwiseIcon size={14} weight="bold"/>} title="Una última mirada" text="Antes de borrar, revisas los descartes y recuperas lo que quieras.">
      <motion.span className="mini-trash" animate={{ rotate: t([0, -8, 8, 0]) }} transition={still ? undefined : loop(2.4, [0, .3, .6, 1], .2)}><TrashIcon size={22}/></motion.span>
    </ToolRow>
  </ul>;
}

/** Card 4 — privacy before the system prompt. */
function PrivacyDemo({ still }: { still: boolean }) {
  return <div className="ob-demo ob-privacy" aria-hidden="true">
    <span className="ob-phone"><ImagesIcon size={34}/><motion.span className="ob-lock" initial={still ? false : { scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 22, delay: .15 }}><LockSimpleIcon size={18} weight="fill"/></motion.span></span>
  </div>;
}

const cards = [
  { key: 'meet', title: 'Lo que importa, se queda.', text: 'CocoWash te ayuda a ordenar tu carrete con decisiones rápidas. Tú eliges qué se queda.' },
  { key: 'how', title: 'Desliza para decidir.', text: 'Nada se borra mientras revisas: todo lo que descartas se puede recuperar.' },
  { key: 'tools', title: 'Lo esencial, a mano.', text: '' },
  { key: 'privacy', title: 'Tus fotos no salen de tu iPhone.', text: 'CocoWash necesita acceso a Fotos para mostrarte tu carrete. No sube ni comparte nada, y solo se borra lo que confirmes en Fotos.' },
];

/** First-launch tour. Paced by the person (Atrás/Continuar, arrow keys), no
 * skip: every card is seen once before the Photos request on the last one. */
export function Onboarding({ requestAccess, finish }: { requestAccess: () => Promise<PhotoPermission>; finish: (status: PhotoPermission) => void }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [asking, setAsking] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const card = cards[index];
  const last = index === cards.length - 1;
  const go = (next: number) => { if (next < 0 || next >= cards.length || asking) return; setDirection(next > index ? 1 : -1); setIndex(next); haptic('selection'); };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' && !last) go(index + 1); if (e.key === 'ArrowLeft') go(index - 1); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const allow = async () => {
    setAsking(true); haptic('light');
    try { finish(await requestAccess()); } finally { setAsking(false); }
  };
  const still = !!reduced;
  return <main className="onboarding" aria-roledescription="Introducción">
    <div className="ob-progress" role="progressbar" aria-label="Progreso de la introducción" aria-valuemin={1} aria-valuemax={cards.length} aria-valuenow={index + 1} aria-valuetext={`Paso ${index + 1} de ${cards.length}`}>
      {cards.map((c, i) => <span key={c.key} className={i <= index ? 'is-done' : ''}><motion.i initial={false} animate={{ scaleX: i <= index ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}/></span>)}
    </div>
    <div className="ob-stage">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.section key={card.key} className={`ob-card-${card.key}`} custom={direction}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: 36 * direction }} animate={{ opacity: 1, x: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, x: -36 * direction }}
          transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 380, damping: 36 }}>
          {card.key === 'meet' && <MeetDemo still={still}/>}
          {card.key === 'how' && <GestureDemo still={still}/>}
          {card.key === 'privacy' && <PrivacyDemo still={still}/>}
          <h1 ref={heading} tabIndex={-1}>{card.title}</h1>
          {card.text && <p>{card.text}</p>}
          {card.key === 'how' && <ul className="ob-legend"><li><ArrowRightIcon size={16} weight="bold"/>Conservar</li><li><ArrowLeftIcon size={16} weight="bold"/>Descartar</li><li><ArrowUpIcon size={16} weight="bold"/>Favorita</li></ul>}
          {card.key === 'tools' && <ToolsDemo still={still}/>}
          {card.key === 'privacy' && <p className="ob-fine">Puedes dar acceso solo a algunas fotos. Para mostrar la ciudad de una foto, iOS consulta a Apple el nombre del lugar.</p>}
        </motion.section>
      </AnimatePresence>
    </div>
    <footer className="ob-actions">
      <button className="ob-back" onClick={() => go(index - 1)} disabled={index === 0 || asking} aria-hidden={index === 0} tabIndex={index === 0 ? -1 : 0}>Atrás</button>
      {last ? <button className="ob-next" onClick={allow} disabled={asking} aria-busy={asking}>{asking ? <><CocoLoader size={24}/>Esperando permiso…</> : <>Permitir acceso a Fotos</>}</button>
        : <button className="ob-next" onClick={() => go(index + 1)}>Continuar<CaretRightIcon size={18} weight="bold"/></button>}
    </footer>
  </main>;
}
