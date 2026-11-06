import { useId } from 'react';
import { motion } from 'motion/react';
import { DAYS } from './domain';
import { t } from './i18n';

/** The four decision marks. Each one differs by colour, shape, icon and word,
 * so no decision depends on colour alone, and the same icon (DecisionIcon) is
 * used on its button, its stamp and the tutorial:
 *  - keep: round turquoise seal with a check (or the seal level once kept);
 *  - discard: dashed graphite ticket with a trash can, «Eliminar». It only
 *    queues the item: deletion happens in the final review with Photos' own
 *    confirmation, and everything stays recoverable until then;
 *  - favorite: pink heart;
 *  - later: coffee postmark with a clock, «Más tarde» (a letter to open later). */
export type StampKind = 'keep' | 'discard' | 'favorite' | 'later';
export const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
/** What a kept seal level means for the person: when the photo comes back. */
export function sealRest(level: number) {
  const days = DAYS[Math.min(DAYS.length, Math.max(1, level)) - 1];
  return Number.isFinite(days) ? t('vuelve en {days} días', { days }) : t('se queda guardada hasta que la pidas');
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
/** Mini icons shared by buttons, stamps and the tutorial (24 × 24, stroke 2). */
const ICON: Record<StampKind, string> = {
  keep: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-2.6 6.2 1.9 1.9 3.4-3.7',
  discard: 'M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7M10 10.5v5.5M14 10.5v5.5',
  favorite: 'M12 20.2C6.6 16.4 3.6 13.5 3.6 9.6 3.6 7 5.6 5 8.1 5c1.6 0 3 .9 3.9 2.2C12.9 5.9 14.3 5 15.9 5c2.5 0 4.5 2 4.5 4.6 0 3.9-3 6.8-8.4 10.6Z',
  later: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4.5V12l3.4 2.2',
};
export function DecisionIcon({ kind, size = 22, className = '' }: { kind: StampKind; size?: number; className?: string }) {
  return <svg className={`decision-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d={ICON[kind]} fill={kind === 'favorite' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
/** 0.9.6: the decision stamps are the illustrated ones (public/assets/stamps,
 * cut from mano/brand/stamps/*-source.webp by cut-stamps.py, transparent
 * background). `word`: the stamp with its word to the right (on the cards, over
 * a cream plate so it reads on any photo); without it, the icon alone (tour).
 * A kept item's seal level (I–VIII) stays the drawn seal. */
const WORDS: Record<StampKind, () => string> = { keep: () => t('Conservar'), discard: () => t('Eliminar'), favorite: () => t('Favorita'), later: () => t('Más tarde') };
export function Stamp({ kind, level, word = false, className = '' }: { kind: StampKind; level?: number; word?: boolean; className?: string }) {
  if (level) return <span className={`stamp stamp-${kind} ${className}`} aria-hidden="true"><KeepSeal level={level}/></span>;
  // The illustrated word is lettered in Spanish: other languages set the same
  // seal next to their own word, between the same wavy lines.
  // 9.8.4: with its word, the stamp is large and the word sits underneath,
  // between two wavy lines, set in the app's language (same for all four).
  if (word) return <span className={`stamp stamp-${kind} is-art has-word is-composed ${className}`} aria-hidden="true">
    <img src={`/assets/stamps/${kind}.webp`} alt="" draggable={false}/><span className="stamp-lettering">{WORDS[kind]()}</span>
  </span>;
  return <span className={`stamp stamp-${kind} is-art ${className}`} aria-hidden="true">
    <img src={`/assets/stamps/${kind}.webp`} alt="" draggable={false}/>
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
    <Stamp kind={kind} word/>
  </motion.div>;
}
