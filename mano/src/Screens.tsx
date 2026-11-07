import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GearSixIcon, ArrowClockwiseIcon, CaretRightIcon, ImagesIcon, EyeIcon, ClockCountdownIcon } from '@phosphor-icons/react';
import { AnimatedNumber, CocoLoader } from './Loader';
import type { PhotoPermission } from './library';
import { Character } from './Characters';
import { formatBytes } from './meta';
import { locale, parts, t, tn } from './i18n';

const rise = (reduced: boolean | null, delay = 0) => reduced ? { initial: false as const } : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, stiffness: 320, damping: 32, delay } };

/** Denied or never asked: explain, then one clear recovery. */
export function AccessScreen({ status, request, openSettings }: { status: PhotoPermission; request: () => void; openSettings: () => void }) {
  const reduced = useReducedMotion();
  const denied = status === 'denied';
  return <main className="status-screen">
    <Character pose={denied ? 'coqui-think' : 'coqui-point'} height={150} className="status-character" motion={denied ? 'sway' : 'idle'}/>
    <motion.h1 {...rise(reduced, .05)}>{t('CocoWash necesita tus fotos')}</motion.h1>
    <motion.p {...rise(reduced, .1)}>{denied ? t('Sin acceso a Fotos no podemos mostrarte tu carrete. Actívalo en Ajustes › CocoWash › Fotos y vuelve aquí.') : t('Para empezar, permite el acceso a Fotos. Todo se queda en tu iPhone.')}</motion.p>
    <motion.div {...rise(reduced, .15)} className="status-actions">
      {denied ? <button className="primary-empty" onClick={openSettings}><GearSixIcon size={20} weight="bold"/>{t('Abrir Ajustes')}</button>
        : <button className="primary-empty" onClick={request}><ImagesIcon size={20} weight="bold"/>{t('Permitir acceso a Fotos')}</button>}
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
    <CocoLoader size={44} progress={progress} label={t('Preparando tus fotos')}/>
    <p role="status" className="status-line">{t('Coqui está preparando tus fotos…')}</p>
    {slow && <motion.p className="status-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{t('Si están en iCloud puede tardar un poco más.')}</motion.p>}
    {slow && cancel && <button className="text-button" onClick={cancel}>{t('Cancelar')}</button>}
  </main>;
}

/** A real failure that needs the person: plain words and a way out. */
export function LoadErrorScreen({ message, retry }: { message: string; retry: () => void }) {
  return <main className="status-screen" role="alert">
    <Character pose="coqui-shrug" height={130} className="status-character" motion="still"/>
    <h1>{t('No pudimos abrir tu carrete')}</h1>
    <p>{t(message)}</p>
    <div className="status-actions"><button className="primary-empty" onClick={retry}><ArrowClockwiseIcon size={20} weight="bold"/>{t('Reintentar')}</button></div>
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
/** «263 MB» → ['263', 'MB']; «9 archivos» → ['9', 'archivos']. Bidi isolates
 * (Arabic) are dropped: the amount is laid out left to right on its own. */
export function splitAmount(text: string): [string, string] {
  const plain = text.replace(/[\u2066-\u2069]/g, '');
  const match = plain.match(/^(\S+)\s+(.+)$/);
  return match ? [match[1], match[2]] : [plain, ''];
}

/** End of a round («Terminar»): a stamped summary. Pending discards stay for the
 * next round; with any pending, «Una última mirada» leads, since deletion only
 * happens there (Fotos confirms). «Cerrar» in that review comes back here.
 * After «Eliminar N», the reward leads: how much space this round freed. */
export function SessionDone({ stats, pending, pendingBytes, pendingPartial, again, review, monetization }: { stats: RoundStats; pending: number; pendingBytes: number; pendingPartial: boolean; again: () => void; review: () => void; monetization?: ReactNode }) {
  const reduced = useReducedMotion();
  const total = stats.keep + stats.discard + stats.favorite + stats.later;
  const freed = stats.freedPhotos + stats.freedVideos > 0;
  const freedLabel = formatBytes(stats.freed, locale);
  const pendingLabel = formatBytes(pendingBytes, locale);
  const items = [stats.freedPhotos ? tn('photos', stats.freedPhotos) : '', stats.freedVideos ? tn('videos', stats.freedVideos) : ''].filter(Boolean);
  const compact = !!monetization;
  // 0.9.9.1 (40): the amount is the headline — the number large, its unit small.
  const amount = splitAmount(freedLabel ? freedLabel : tn('files', stats.freedPhotos + stats.freedVideos));
  // 9.8.6: after «Eliminar» the screen never scrolls and reads top to bottom —
  // Coqui and Memo celebrate, the stamp says it, the amount leads, then the one
  // step left (Fotos empties «Eliminado recientemente»), then the two ways on.
  return <main className={`status-screen session-done ${compact ? 'has-letter' : ''} ${freed ? 'is-freed' : ''}`}><div className="done-body">
    <div className="done-hero">
    {total || freed ? <div className="character-pair"><Character pose="coqui-cheer" height={compact ? 96 : 140} motion="hop"/><Character pose="memo-dance" height={compact ? 76 : 110} motion="hop" delay={.2}/></div>
      : <Character pose="memo-calm" height={compact ? 90 : 120} className="status-character" motion="sway"/>}
    <motion.div className="done-stamp" initial={reduced ? false : { scale: 1.6, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} transition={{ type: 'spring', stiffness: 380, damping: 18, delay: .05 }} aria-hidden="true">{freed ? t('Eliminado') : t('Guardado')}</motion.div>
    </div>
    {freed ? <motion.section {...rise(reduced, .12)} className="done-freed" aria-label={t('Espacio liberado')}>
      <motion.strong className={`freed-amount ${amount[1] ? '' : 'is-plain'}`} dir={freedLabel ? 'ltr' : undefined} initial={reduced ? false : { scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: .25 }}>
        <span className="amount-num">{amount[0]}</span>{amount[1] && <span className="amount-unit">{amount[1]}</span>}
      </motion.strong>
      {/* 0.9.9.1 (41): told as done — the 30-day note and the steps come below. */}
      <span className="freed-label">{!freedLabel ? tn('freedFiles', stats.freedPhotos + stats.freedVideos) : stats.freedPartial ? t('de espacio liberado, como mínimo') : t('de espacio liberado')}</span>
      <span className="freed-items">{items.length > 1 ? t('{photos} y {videos} en «Eliminado recientemente»', { photos: items[0], videos: items[1] }) : t('{items} en «Eliminado recientemente»', { items: items[0] ?? '' })}</span>
      {/* No API empties «Eliminado recientemente»: the person does it in Fotos (Face ID). */}
      <div className="freed-how">
        <strong>{t('Para vaciarlo ya')}</strong>
        <ol className="freed-steps">
          <li>{t('Abre Fotos.')}</li>
          <li>{t('Busca el álbum «Eliminado recientemente».')}</li>
          <li>{t('Toca Seleccionar › Eliminar todo.')}</li>
        </ol>
      </div>
      <small className="freed-note">{t('O espera 30 días: Fotos lo vacía solo.')}</small>
    </motion.section>
    : <motion.h1 {...rise(reduced, .12)}>{total ? t('Buena ronda.') : t('Revisión guardada.')}</motion.h1>}
    {/* With the letter below, the one step left matters more than the tally. */}
    {freed ? null : total > 0 ? <motion.dl {...rise(reduced, .18)} className="done-stats">
      <div className="is-keep"><dt>{t('Conservadas')}</dt><dd><AnimatedNumber value={stats.keep}/></dd></div>
      <div className="is-discard"><dt>{freed ? t('Eliminadas') : t('Para eliminar')}</dt><dd><AnimatedNumber value={stats.discard}/></dd></div>
      <div className="is-favorite"><dt>{t('Favoritas')}</dt><dd><AnimatedNumber value={stats.favorite}/></dd></div>
    </motion.dl> : <motion.p {...rise(reduced, .18)}>{t('Tu progreso está a salvo. Sigue cuando quieras.')}</motion.p>}
    {stats.later > 0 && !freed && <motion.p {...rise(reduced, .2)} className="done-later"><ClockCountdownIcon size={18} weight="bold"/>{tn('laterWaiting', stats.later)}</motion.p>}
    </div>
    {/* 0.9.9.1 (38): the buttons live outside the body, between it and the letter,
        so they are always whole and never under the ad; the body drops what does
        not fit (prototype.css, container «done»). */}
    <motion.div {...rise(reduced, .24)} className="status-actions">
      {pending > 0 && <button className="primary-empty" onClick={review}><EyeIcon size={20} weight="bold"/>{t('Una última mirada ({n})', { n: pending })}</button>}
      <button className={pending > 0 ? 'secondary-empty' : 'primary-empty'} onClick={again}>{t('Seguir revisando')}<CaretRightIcon size={18} weight="bold" className="flip-rtl"/></button>
      {pending > 0 && <p className="status-hint">{pendingLabel ? parts(tn(pendingPartial ? 'pendingFreeAtLeast' : 'pendingFree', pending), { amount: <strong key="amount">{pendingLabel}</strong> }) : t('Lo marcado para eliminar se guarda para la próxima ronda si no eliminas ahora.')}</p>}
    </motion.div>
    {monetization}
  </main>;
}
