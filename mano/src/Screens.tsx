import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GearSixIcon, ArrowClockwiseIcon, CaretRightIcon, ImagesIcon } from '@phosphor-icons/react';
import { AnimatedNumber, CocoLoader } from './Loader';
import type { PhotoPermission } from './library';

const rise = (reduced: boolean | null, delay = 0) => reduced ? { initial: false as const } : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, stiffness: 320, damping: 32, delay } };

/** Denied or never asked: explain, then one clear recovery. */
export function AccessScreen({ status, request, openSettings }: { status: PhotoPermission; request: () => void; openSettings: () => void }) {
  const reduced = useReducedMotion();
  const denied = status === 'denied';
  return <main className="status-screen">
    <motion.img {...rise(reduced)} className="status-mascot" src="/assets/cocowash.svg" alt="" draggable={false}/>
    <motion.h1 {...rise(reduced, .05)}>CocoWash necesita tus fotos</motion.h1>
    <motion.p {...rise(reduced, .1)}>{denied ? 'Sin acceso a Fotos no podemos mostrarte tu carrete. Actívalo en Ajustes › CocoWash › Fotos y vuelve aquí.' : 'Para empezar, permite el acceso a Fotos. Todo se queda en tu iPhone.'}</motion.p>
    <motion.div {...rise(reduced, .15)} className="status-actions">
      {denied ? <button className="primary-empty" onClick={openSettings}><GearSixIcon size={20} weight="bold"/>Abrir Ajustes</button>
        : <button className="primary-empty" onClick={request}><ImagesIcon size={20} weight="bold"/>Permitir acceso a Fotos</button>}
    </motion.div>
  </main>;
}

/** Waiting for the first card only; the rest keeps loading behind the session.
 * After a while the copy explains the likely reason, never a fake percentage. */
export function PreparingScreen({ progress, cancel }: { progress?: number; cancel?: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 7000); return () => clearTimeout(t); }, []);
  return <main className="status-screen is-quiet" aria-busy="true">
    <CocoLoader size={64} progress={progress} label="Preparando tus fotos"/>
    <p role="status" className="status-line">Preparando tus fotos…</p>
    {slow && <motion.p className="status-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Si están en iCloud puede tardar un poco más.</motion.p>}
    {slow && cancel && <button className="text-button" onClick={cancel}>Cancelar</button>}
  </main>;
}

/** A real failure that needs the person: plain words and a way out. */
export function LoadErrorScreen({ message, retry }: { message: string; retry: () => void }) {
  return <main className="status-screen" role="alert">
    <img className="status-mascot is-small" src="/assets/cocowash.svg" alt="" draggable={false}/>
    <h1>No pudimos abrir tu carrete</h1>
    <p>{message}</p>
    <div className="status-actions"><button className="primary-empty" onClick={retry}><ArrowClockwiseIcon size={20} weight="bold"/>Reintentar</button></div>
  </main>;
}

/** End of a round: a stamped summary of this session, then continue or review. */
export function SessionDone({ stats, pending, again, review }: { stats: { keep: number; discard: number; favorite: number }; pending: number; again: () => void; review: () => void }) {
  const reduced = useReducedMotion();
  const total = stats.keep + stats.discard + stats.favorite;
  return <main className="status-screen session-done">
    <motion.div className="done-stamp" initial={reduced ? false : { scale: 1.6, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} transition={{ type: 'spring', stiffness: 380, damping: 18, delay: .05 }} aria-hidden="true">Guardado</motion.div>
    <motion.h1 {...rise(reduced, .12)}>{total ? 'Buena ronda.' : 'Revisión guardada.'}</motion.h1>
    {total > 0 ? <motion.dl {...rise(reduced, .18)} className="done-stats">
      <div><dt>Conservadas</dt><dd><AnimatedNumber value={stats.keep}/></dd></div>
      <div><dt>Descartes</dt><dd><AnimatedNumber value={stats.discard}/></dd></div>
      <div><dt>Favoritas</dt><dd><AnimatedNumber value={stats.favorite}/></dd></div>
    </motion.dl> : <motion.p {...rise(reduced, .18)}>Tu progreso está a salvo. Sigue cuando quieras.</motion.p>}
    <motion.div {...rise(reduced, .24)} className="status-actions">
      <button className="primary-empty" onClick={again}>Seguir revisando<CaretRightIcon size={18} weight="bold"/></button>
      {pending > 0 && <button className="text-button" onClick={review}>Revisar {pending} descarte{pending === 1 ? '' : 's'}</button>}
    </motion.div>
  </main>;
}
