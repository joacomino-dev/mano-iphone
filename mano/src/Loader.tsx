import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/** Branded throbber: a coconut whose rim fills with real progress when it is
 * known, or rinses round when it is not. One component for every wait. */
export function CocoLoader({ progress, size = 40, label }: { progress?: number; size?: number; label?: string }) {
  const known = typeof progress === 'number' && progress > 0;
  const r = 17, c = 2 * Math.PI * r;
  return <span className={`coco-loader ${known ? 'is-known' : ''}`} style={{ width: size, height: size }} role={label ? 'progressbar' : undefined}
    aria-label={label} aria-valuemin={known ? 0 : undefined} aria-valuemax={known ? 100 : undefined} aria-valuenow={known ? Math.round(progress! * 100) : undefined}>
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle className="coco-track" cx="20" cy="20" r={r}/>
      <circle className="coco-rinse" cx="20" cy="20" r={r} strokeDasharray={known ? `${c * Math.min(1, progress!)} ${c}` : `${c * .28} ${c}`}/>
      <circle className="coco-shell" cx="20" cy="20" r="11"/>
      <circle className="coco-eye" cx="16.4" cy="17.6" r="1.6"/><circle className="coco-eye" cx="23.6" cy="17.6" r="1.6"/><circle className="coco-eye" cx="20" cy="23.6" r="1.6"/>
    </svg>
  </span>;
}

/** Shows children only after `delay` ms, so near-instant work never flashes a loader. */
export function Deferred({ delay = 280, children }: { delay?: number; children: ReactNode }) {
  const [show, setShow] = useState(delay <= 0);
  useEffect(() => { if (delay <= 0) return; const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show ? <>{children}</> : null;
}

/** Digits roll toward the new value; Reduce Motion swaps instantly. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const previous = useRef(value);
  const direction = value >= previous.current ? 1 : -1;
  useEffect(() => { previous.current = value; }, [value]);
  return <span className={`animated-number ${className ?? ''}`}>
    <AnimatePresence initial={false} mode="popLayout" custom={direction}>
      <motion.span key={value} custom={direction}
        initial={reduced ? false : { y: `${direction * 70}%`, opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: `${direction * -70}%`, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 38 }}>{value}</motion.span>
    </AnimatePresence>
  </span>;
}
