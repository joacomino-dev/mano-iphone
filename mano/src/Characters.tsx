import { motion, useReducedMotion } from 'motion/react';

/** Coqui (the coconut, sunglasses) and Memo (the brain) are the app's two
 * characters. Every pose is cut, unchanged, from the user's model sheets in
 * `brand/characters/` (transparent WebP in `public/assets/characters/`), so
 * their drawing is never re-interpreted in code; only placement and motion are.
 * Images are decorative: the text next to them carries the meaning.
 * Where: tour (hero, privacy), access/preparing/error/end-of-round screens,
 * empty pile, and Coqui's face in every loader. The app icon is the hero. */
export const POSES = {
  'coqui-memo': [795, 1017],   // Coqui washing Memo (hero, app icon)
  'coqui-wave': [418, 461], 'coqui-photos': [321, 459], 'coqui-point': [453, 452],
  'coqui-cheer': [445, 470], 'coqui-think': [307, 466], 'coqui-shrug': [474, 450],
  'memo-cards': [332, 402], 'memo-dance': [438, 396], 'memo-calm': [331, 339], 'memo-wonder': [400, 395],
} as const;
export type Pose = keyof typeof POSES;
export const poseSrc = (pose: Pose) => `/assets/characters/${pose}.webp`;

/** How a character moves while on screen: a few cycles, then rest (calmer, and
 * the screen settles). All stop at once with Reduce Motion. */
type Motion = 'idle' | 'hop' | 'sway' | 'still';
const loops: Record<Exclude<Motion, 'still'>, object> = {
  idle: { y: [0, -4, 0] },                       // breathing bob
  hop: { y: [0, -10, 0, 0], scaleY: [1, 1.03, .97, 1] }, // small celebratory hops
  sway: { rotate: [-2, 2, -2] },                 // thinking / calm sway
};

const CYCLES = 3;
export function Character({ pose, height, className = '', motion: kind = 'idle', delay = 0 }: { pose: Pose; height: number; className?: string; motion?: Motion; delay?: number }) {
  const reduced = useReducedMotion();
  const [w, h] = POSES[pose];
  const still = reduced || kind === 'still';
  return <motion.img className={`character ${className}`} src={poseSrc(pose)} alt="" aria-hidden="true" draggable={false}
    width={Math.round(height * w / h)} height={height} decoding="async"
    initial={reduced ? false : { opacity: 0, scale: .94 }}
    animate={still ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, scale: 1, ...loops[kind as Exclude<Motion, 'still'>] }}
    transition={still ? { duration: reduced ? 0 : .3, delay } : {
      opacity: { duration: .3, delay }, scale: { type: 'spring', stiffness: 320, damping: 24, delay },
      y: { duration: kind === 'hop' ? 1.4 : 3.2, repeat: CYCLES, ease: 'easeInOut', delay: delay + .3 },
      scaleY: { duration: 1.4, repeat: CYCLES, ease: 'easeInOut', delay: delay + .3 },
      rotate: { duration: 4, repeat: CYCLES, ease: 'easeInOut', delay: delay + .3 },
    }}
    style={{ transformOrigin: '50% 100%' }}/>;
}
