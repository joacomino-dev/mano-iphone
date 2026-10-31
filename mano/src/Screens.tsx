import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GearSixIcon, ArrowClockwiseIcon, CaretRightIcon, ImagesIcon, EyeIcon } from '@phosphor-icons/react';
import { AnimatedNumber, CocoLoader } from './Loader';
import type { PhotoPermission } from './library';
import { Character } from './Characters';

const rise = (reduced: boolean | null, delay = 0) => reduced ? { initial: false as const } : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, stiffness: 320, damping: 32, delay } };

/** Denied or never asked: explain, then one clear recovery. */
export function AccessScreen({ status, request, openSettings }: { status: PhotoPermission; request: () => void; openSettings: () => void }) {
  const reduced = useReducedMotion();
  const denied = status === 'denied';
  return <main className="status-screen">
    <Character pose={denied ? 'coqui-think' : 'coqui-point'} height={150} className="status-character" motion={denied ? 'sway' : 'idle'}/>
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
    <div className="character-pair"><Character pose="coqui-photos" height={140}/><Character pose="memo-cards" height={112} delay={.15}/></div>
    <CocoLoader size={44} progress={progress} label="Preparando tus fotos"/>
    <p role="status" className="status-line">Coqui está preparando tus fotos…</p>
    {slow && <motion.p className="status-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Si están en iCloud puede tardar un poco más.</motion.p>}
    {slow && cancel && <button className="text-button" onClick={cancel}>Cancelar</button>}
  </main>;
}

/** A real failure that needs the person: plain words and a way out. */
export function LoadErrorScreen({ message, retry }: { message: string; retry: () => void }) {
  return <main className="status-screen" role="alert">
    <Character pose="coqui-shrug" height={130} className="status-character" motion="still"/>
    <h1>No pudimos abrir tu carrete</h1>
    <p>{message}</p>
    <div className="status-actions"><button className="primary-empty" onClick={retry}><ArrowClockwiseIcon size={20} weight="bold"/>Reintentar</button></div>
  </main>;
}

/** End of a round («Terminar»): a stamped summary. Pending discards stay for the
 * next round; with any pending, «Una última mirada» leads, since deletion only
 * happens there (Fotos confirms). «Cerrar» in that review comes back here. */
export function SessionDone({ stats, pending, again, review }: { stats: { keep: number; discard: number; favorite: number }; pending: number; again: () => void; review: () => void }) {
  const reduced = useReducedMotion();
  const total = stats.keep + stats.discard + stats.favorite;
  return <main className="status-screen session-done">
    {total ? <div className="character-pair"><Character pose="coqui-cheer" height={140} motion="hop"/><Character pose="memo-dance" height={110} motion="hop" delay={.2}/></div>
      : <Character pose="memo-calm" height={120} className="status-character" motion="sway"/>}
    <motion.div className="done-stamp" initial={reduced ? false : { scale: 1.6, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} transition={{ type: 'spring', stiffness: 380, damping: 18, delay: .05 }} aria-hidden="true">Guardado</motion.div>
    <motion.h1 {...rise(reduced, .12)}>{total ? 'Buena ronda.' : 'Revisión guardada.'}</motion.h1>
    {total > 0 ? <motion.dl {...rise(reduced, .18)} className="done-stats">
      <div className="is-keep"><dt>Conservadas</dt><dd><AnimatedNumber value={stats.keep}/></dd></div>
      <div className="is-discard"><dt>Descartes</dt><dd><AnimatedNumber value={stats.discard}/></dd></div>
      <div className="is-favorite"><dt>Favoritas</dt><dd><AnimatedNumber value={stats.favorite}/></dd></div>
    </motion.dl> : <motion.p {...rise(reduced, .18)}>Tu progreso está a salvo. Sigue cuando quieras.</motion.p>}
    <motion.div {...rise(reduced, .24)} className="status-actions">
      {pending > 0 && <button className="primary-empty" onClick={review}><EyeIcon size={20} weight="bold"/>Una última mirada ({pending})</button>}
      <button className={pending > 0 ? 'secondary-empty' : 'primary-empty'} onClick={again}>Seguir revisando<CaretRightIcon size={18} weight="bold"/></button>
      {pending > 0 && <p className="status-hint">{pending === 1 ? 'Tu descarte se guarda' : `Tus ${pending} descartes se guardan`} para la próxima ronda si no eliminas ahora.</p>}
    </motion.div>
  </main>;
}
