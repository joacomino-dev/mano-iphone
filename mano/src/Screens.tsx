import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GearSixIcon, ArrowClockwiseIcon, CaretRightIcon, ImagesIcon, EyeIcon, ClockCountdownIcon } from '@phosphor-icons/react';
import { AnimatedNumber, CocoLoader } from './Loader';
import type { PhotoPermission } from './library';
import { Character } from './Characters';
import { formatBytes } from './meta';

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

/** One round's tally. `freed*` count what «Eliminar N» actually removed (after
 * the Photos confirmation); `freedPartial` = some weights were still unmeasured. */
export type RoundStats = { keep: number; discard: number; favorite: number; later: number; freed: number; freedPhotos: number; freedVideos: number; freedPartial: boolean };
export const EMPTY_STATS: RoundStats = { keep: 0, discard: 0, favorite: 0, later: 0, freed: 0, freedPhotos: 0, freedVideos: 0, freedPartial: false };
const count = (n: unknown) => Number.isFinite(n) && Number(n) >= 0 ? Number(n) : 0;
export function readStats(): RoundStats {
  try {
    const v = JSON.parse(localStorage.getItem('cocowash-round-v1') || 'null');
    if (v && [v.keep, v.discard, v.favorite].every(n => Number.isInteger(n) && n >= 0))
      return { keep: v.keep, discard: v.discard, favorite: v.favorite, later: count(v.later), freed: count(v.freed), freedPhotos: count(v.freedPhotos), freedVideos: count(v.freedVideos), freedPartial: v.freedPartial === true };
  } catch { /* fresh round */ }
  return EMPTY_STATS;
}
/** Everything CocoWash has freed on this iPhone, kept apart from the record. */
export type Lifetime = { bytes: number; items: number };
export function readLifetime(key: string): Lifetime {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return { bytes: count(v?.bytes), items: count(v?.items) }; }
  catch { return { bytes: 0, items: 0 }; }
}
export function saveLifetime(key: string, value: Lifetime) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional */ } }
const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es')} ${n === 1 ? one : many}`;

/** End of a round («Terminar»): a stamped summary. Pending discards stay for the
 * next round; with any pending, «Una última mirada» leads, since deletion only
 * happens there (Fotos confirms). «Cerrar» in that review comes back here.
 * After «Eliminar N», the reward leads: how much space this round freed. */
export function SessionDone({ stats, pending, pendingBytes, lifetime, again, review }: { stats: RoundStats; pending: number; pendingBytes: number; lifetime: number; again: () => void; review: () => void }) {
  const reduced = useReducedMotion();
  const total = stats.keep + stats.discard + stats.favorite + stats.later;
  const freed = stats.freedPhotos + stats.freedVideos > 0;
  const freedLabel = formatBytes(stats.freed);
  const pendingLabel = formatBytes(pendingBytes);
  const items = [stats.freedPhotos ? plural(stats.freedPhotos, 'foto', 'fotos') : '', stats.freedVideos ? plural(stats.freedVideos, 'vídeo', 'vídeos') : ''].filter(Boolean).join(' y ');
  return <main className="status-screen session-done">
    {total || freed ? <div className="character-pair"><Character pose="coqui-cheer" height={freed ? 120 : 140} motion="hop"/><Character pose="memo-dance" height={freed ? 96 : 110} motion="hop" delay={.2}/></div>
      : <Character pose="memo-calm" height={120} className="status-character" motion="sway"/>}
    <motion.div className="done-stamp" initial={reduced ? false : { scale: 1.6, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} transition={{ type: 'spring', stiffness: 380, damping: 18, delay: .05 }} aria-hidden="true">{freed ? 'Liberado' : 'Guardado'}</motion.div>
    <motion.h1 {...rise(reduced, .12)}>{freed ? 'Espacio recuperado.' : total ? 'Buena ronda.' : 'Revisión guardada.'}</motion.h1>
    {freed && <motion.section {...rise(reduced, .16)} className="done-freed" aria-label="Espacio liberado">
      <span className="freed-label">Liberaste</span>
      <motion.strong className="freed-amount" initial={reduced ? false : { scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: .3 }}>{freedLabel ? `${stats.freedPartial ? '~' : ''}${freedLabel}` : plural(stats.freedPhotos + stats.freedVideos, 'archivo', 'archivos')}</motion.strong>
      <span className="freed-items">{items} a «Eliminado recientemente»</span>
      {lifetime > stats.freed && formatBytes(lifetime) && <span className="freed-total">Con CocoWash ya llevas {formatBytes(lifetime)}</span>}
      <small>El espacio vuelve del todo cuando Fotos vacía «Eliminado recientemente» (30 días) o cuando lo vacías tú.</small>
    </motion.section>}
    {total > 0 ? <motion.dl {...rise(reduced, .18)} className="done-stats">
      <div className="is-keep"><dt>Conservadas</dt><dd><AnimatedNumber value={stats.keep}/></dd></div>
      <div className="is-discard"><dt>Descartes</dt><dd><AnimatedNumber value={stats.discard}/></dd></div>
      <div className="is-favorite"><dt>Favoritas</dt><dd><AnimatedNumber value={stats.favorite}/></dd></div>
    </motion.dl> : !freed && <motion.p {...rise(reduced, .18)}>Tu progreso está a salvo. Sigue cuando quieras.</motion.p>}
    {stats.later > 0 && <motion.p {...rise(reduced, .2)} className="done-later"><ClockCountdownIcon size={18} weight="bold"/>{stats.later.toLocaleString('es')} para más tarde: {stats.later === 1 ? 'te espera' : 'te esperan'} al final de la pila.</motion.p>}
    <motion.div {...rise(reduced, .24)} className="status-actions">
      {pending > 0 && <button className="primary-empty" onClick={review}><EyeIcon size={20} weight="bold"/>Una última mirada ({pending})</button>}
      <button className={pending > 0 ? 'secondary-empty' : 'primary-empty'} onClick={again}>Seguir revisando<CaretRightIcon size={18} weight="bold"/></button>
      {pending > 0 && <p className="status-hint">{pendingLabel ? <>Si eliminas {pending === 1 ? 'tu descarte' : `tus ${pending} descartes`} liberas <strong>{pendingLabel}</strong>. Si no, se guardan para la próxima ronda.</> : <>{pending === 1 ? 'Tu descarte se guarda' : `Tus ${pending} descartes se guardan`} para la próxima ronda si no eliminas ahora.</>}</p>}
    </motion.div>
  </main>;
}
