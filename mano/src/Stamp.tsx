import { useId } from 'react';
import { motion } from 'motion/react';
import { DAYS } from './domain';

/** The three decision marks. Each one differs by colour, shape, icon and word,
 * so no decision depends on colour alone:
 *  - keep: round turquoise seal with a check (or the seal level once kept);
 *  - discard: dashed graphite ticket with a tray, «a revisión», never deletion;
 *  - favorite: pink heart;
 *  - later: coffee postmark with a clock, «Más tarde» (a letter to open later).
 * Deletion has no stamp at all: it only exists as «Eliminar N» in the review. */
export type StampKind = 'keep' | 'discard' | 'favorite' | 'later';
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
/** What a kept seal level means for the person: when the photo comes back. */
export function sealRest(level: number) {
  const days = DAYS[Math.min(DAYS.length, Math.max(1, level)) - 1];
  return Number.isFinite(days) ? `vuelve en ${days} días` : 'se queda';
}

function KeepSeal({ level }: { level?: number }) {
  const arc = useId();
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="46" fill="var(--stamp-fill, none)" stroke="currentColor" strokeWidth="4"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <path id={arc} d="M19 52a31 31 0 0 1 62 0" fill="none"/>
    <text className="stamp-word"><textPath href={`#${arc}`} startOffset="50%" textAnchor="middle">{level ? 'CONSERVADA' : 'CONSERVAR'}</textPath></text>
    {level ? <text className="stamp-numeral" x="50" y="70" textAnchor="middle">{ROMAN[level - 1]}</text>
      : <path d="M35 60l10 10 20-22" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>}
  </svg>;
}
function DiscardTicket() {
  return <svg viewBox="0 0 148 60" aria-hidden="true" focusable="false">
    <rect x="2.5" y="2.5" width="143" height="55" rx="9" fill="var(--stamp-fill, none)" stroke="currentColor" strokeWidth="3" strokeDasharray="8 5"/>
    <path d="M17 34v10h26V34M30 16v20m-7-7 7 7 7-7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <text className="stamp-word" x="54" y="36">A DESCARTES</text>
  </svg>;
}
function FavoriteHeart() {
  return <svg viewBox="0 0 100 92" aria-hidden="true" focusable="false">
    <path d="M50 86C20 64 5 48 5 30 5 16 16 5 30 5c9 0 16 5 20 12 4-7 11-12 20-12 14 0 25 11 25 25 0 18-15 34-45 56z" fill="currentColor"/>
    <path d="M50 76C26 58 14 45 14 31c0-9 7-17 16-17 8 0 14 5 20 14 6-9 12-14 20-14 9 0 16 8 16 17 0 14-12 27-36 45z" fill="none" stroke="var(--stamp-line, #FAF6EE)" strokeWidth="2"/>
    <text className="stamp-word on-fill" x="50" y="46" textAnchor="middle">FAVORITA</text>
  </svg>;
}

function LaterPostmark() {
  return <svg viewBox="0 0 160 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="27" fill="var(--stamp-fill, none)" stroke="currentColor" strokeWidth="3.5"/>
    <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M32 19v13l9 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M64 14c8-5 16 5 24 0s16 5 24 0 16 5 24 0 16 5 20 2M64 50c8-5 16 5 24 0s16 5 24 0 16 5 24 0 16 5 20 2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <text className="stamp-word" x="67" y="37">MÁS TARDE</text>
  </svg>;
}

export function Stamp({ kind, level, className = '' }: { kind: StampKind; level?: number; className?: string }) {
  return <span className={`stamp stamp-${kind} ${className}`} aria-hidden="true">
    {kind === 'keep' ? <KeepSeal level={level}/> : kind === 'discard' ? <DiscardTicket/> : kind === 'later' ? <LaterPostmark/> : <FavoriteHeart/>}
  </span>;
}

/** A decision lands: the stamp hits the table, then follows the card out. It is
 * pure decoration over the stack (no pointer events, no state), so it never
 * delays the next gesture. Reduce Motion: the same stamp, no travel or scale. */
export function DecisionStamp({ kind, reduced, done }: { kind: StampKind; reduced: boolean; done: () => void }) {
  const travel = kind === 'keep' ? { x: [0, 0, 0, 96], y: [0, 0, 0, 0] } : kind === 'discard' ? { x: [0, 0, 0, -96], y: [0, 0, 0, 0] } : kind === 'later' ? { x: [0, 0, 0, 0], y: [0, 0, 0, 96] } : { x: [0, 0, 0, 0], y: [0, 0, 0, -96] };
  const tilt = kind === 'keep' ? -10 : kind === 'discard' ? 8 : kind === 'later' ? -4 : 0;
  return <motion.div className={`decision-stamp is-${kind}`} aria-hidden="true"
    initial={false}
    animate={reduced ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [1.35, 1, 1, .9], rotate: tilt, ...travel }}
    transition={reduced ? { duration: .6, times: [0, .1, .75, 1] } : { duration: .5, times: [0, .24, .62, 1], ease: 'easeOut' }}
    onAnimationComplete={done}>
    <Stamp kind={kind}/>
  </motion.div>;
}
