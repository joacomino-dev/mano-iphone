import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CaretRightIcon, LockSimpleIcon, XIcon } from '@phosphor-icons/react';
import type { PhotoPermission } from './library';
import { CocoLoader } from './Loader';
import { haptic } from './haptics';
import { Character } from './Characters';
import { FilterSwitch, Wordmark } from './Chrome';
import { Tutorial } from './Tutorial';
import { t } from './i18n';

/* CocoWash's own generated postcards: no stock photos, no people, and no
   character presented as final (character scenes come later). */
const PHOTO = '/assets/demo/postcard-1.svg';
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

/** Last card — privacy before the system prompt: Coqui guarding a safe; everything stays here. */
function PrivacyDemo({ still }: { still: boolean }) {
  return <div className="ob-demo ob-privacy" aria-hidden="true">
    <Character pose="coqui-safe" height={150} motion="sway"/>
    <motion.span className="ob-lock" initial={still ? false : { scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 22, delay: .35 }}><LockSimpleIcon size={18} weight="fill"/></motion.span>
  </div>;
}

const cards = () => [
  { key: 'meet', title: t('Lo que importa, se queda.'), text: t('Coqui te ayuda a ordenar tu carrete con decisiones rápidas. Tú eliges qué se queda.') },
  { key: 'practice', title: '', text: '' },
  { key: 'privacy', title: t('Tus fotos no salen de tu iPhone.'), text: t('CocoWash necesita acceso a Fotos para mostrarte tu carrete. No sube ni comparte nada, y solo se borra lo que confirmes en Fotos.') },
];
/** The practice is the middle step: the sheet steps aside and the main screen itself teaches. */
const PRACTICE = 1;
const SKIP_NOTE_MS = 5200;

/** First launch: welcome → practice (Tutorial.tsx: six steps learned by doing, «Saltar»
 * always there) → privacy, where Photos is requested (user, 2026-11-19: three screens;
 * welcome and privacy unchanged). Seen again from Ajustes, it is the same tour; with
 * Photos already given, the last card starts instead of asking. */
export function Onboarding({ requestAccess, finish, granted = false }: { requestAccess: () => Promise<PhotoPermission>; finish: (status: PhotoPermission) => void; granted?: boolean }) {
  const reduced = useReducedMotion();
  const still = !!reduced;
  const [index, setIndex] = useState(0);
  const [deck] = useState(cards);
  const [direction, setDirection] = useState(1);
  const [asking, setAsking] = useState(false);
  // Skipped the practice: Coqui says where to see it again (a tap or a few seconds closes it).
  const [skipNote, setSkipNote] = useState(false);
  useEffect(() => { if (!skipNote) return; const timer = setTimeout(() => setSkipNote(false), SKIP_NOTE_MS); return () => clearTimeout(timer); }, [skipNote]);
  const heading = useRef<HTMLHeadingElement>(null);
  const card = deck[index];
  const last = index === deck.length - 1;
  const practice = index === PRACTICE;
  const go = (next: number) => { if (next < 0 || next >= deck.length || asking) return; setDirection(next > index ? 1 : -1); setIndex(next); if (next !== deck.length - 1) setSkipNote(false); haptic('selection'); };
  useEffect(() => { if (!practice) heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    if (practice) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' && !last) go(index + 1); if (e.key === 'ArrowLeft') go(index - 1); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const allow = async () => {
    setAsking(true); haptic('light');
    try { finish(await requestAccess()); } finally { setAsking(false); }
  };
  const sheetMotion = reduced ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: .16 } }
    : { initial: { y: '104%' }, animate: { y: 0 }, exit: { y: '104%' }, transition: { type: 'spring' as const, stiffness: 260, damping: 32 } };
  return <main className={`onboarding ${practice ? 'is-practice' : ''}`} aria-roledescription={t('Introducción')}>
    <AnimatePresence initial={false}>
      {practice ? <motion.div key="practice" className="ob-practice" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: .985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? .12 : .28, ease: [.2, .8, .2, 1] }}>
        <Tutorial done={() => go(PRACTICE + 1)} skip={() => { go(PRACTICE + 1); setSkipNote(true); }}/>
      </motion.div> : <motion.div key="ghost" className="ob-ghost-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><Ghost/></motion.div>}
    </AnimatePresence>
    <AnimatePresence initial={false}>
      {!practice && <motion.div key={`sheet-${index}`} className="ob-sheet paper" {...sheetMotion}>
        <div className="ob-progress" style={{ gridTemplateColumns: `repeat(${deck.length},1fr)` }} role="progressbar" aria-label={t('Progreso de la introducción')} aria-valuemin={1} aria-valuemax={deck.length} aria-valuenow={index + 1} aria-valuetext={t('Paso {n} de {total}', { n: index + 1, total: deck.length })}>
          {deck.map((c, i) => <span key={c.key}><motion.i initial={false} animate={{ scaleX: i <= index ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}/></span>)}
        </div>
        <div className="ob-body">
          <div className="ob-demo-area" key={card.key}>{index === 0 ? <MeetDemo still={still}/> : <PrivacyDemo still={still}/>}</div>
          <div className="ob-stage">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.section key={card.key} className={`is-${card.key}`} custom={direction}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 * direction }} animate={{ opacity: 1, x: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 * direction }}
                transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 380, damping: 36 }}>
                <h1 ref={heading} tabIndex={-1}>{card.title}</h1>
                {card.text && <p>{card.text}</p>}
              </motion.section>
            </AnimatePresence>
          </div>
        </div>
        <footer className="ob-actions">
          <button className="ob-back" onClick={() => go(index - 1)} disabled={index === 0 || asking} aria-hidden={index === 0} tabIndex={index === 0 ? -1 : 0}>{t('Atrás')}</button>
          {last ? <button className="ob-next" onClick={allow} disabled={asking} aria-busy={asking}>{asking ? <><CocoLoader size={24}/>{t('Esperando permiso…')}</> : <>{granted ? t('Empezar') : t('Permitir acceso a Fotos')}</>}</button>
            : <button className="ob-next" onClick={() => go(index + 1)}><span className="ob-next-label">{t('Continuar')}<CaretRightIcon size={18} weight="bold" className="flip-rtl"/></span></button>}
        </footer>
      </motion.div>}
    </AnimatePresence>
    <AnimatePresence>{skipNote && !practice && <motion.div key="skip-note" className="ob-skip-note" role="status"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, transition: { duration: .14 } }}
      transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 460, damping: 30, delay: .25 }}>
      <Character pose="coqui-point" height={44} motion="still"/>
      <p>{t('Si algo no te quedó claro, puedes repetir la introducción desde Ajustes.')}</p>
      <button type="button" onClick={() => setSkipNote(false)} aria-label={t('Cerrar aviso')}><XIcon size={16} weight="bold"/></button>
    </motion.div>}</AnimatePresence>
  </main>;
}
