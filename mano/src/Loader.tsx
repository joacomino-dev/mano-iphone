import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/** CocoWash's one loader: a rinse ring. A turquoise arc that stretches and
 * gathers as it turns, with a short pink swirl turning the other way inside —
 * water going round, no face. When real progress is known the arc shows it
 * (and stops turning); otherwise it is indeterminate. CSS-only motion on a tiny
 * SVG; Reduce Motion keeps a still arc. One component for every wait. */
export function CocoLoader({ progress, size = 40, label }: { progress?: number; size?: number; label?: string }) {
  const known = typeof progress === 'number' && progress > 0;
  return <span className={`coco-loader ${known ? 'is-known' : ''}`} style={{ width: size, height: size }} role={label ? 'progressbar' : undefined}
    aria-label={label} aria-valuemin={known ? 0 : undefined} aria-valuemax={known ? 100 : undefined} aria-valuenow={known ? Math.round(progress! * 100) : undefined}>
    {/* 9.8.2: the whole ring turns as one HTML layer (a compositor transform),
        so it stays smooth while the page is busy — sharing, preparing a video.
        Turning SVG groups or animating the dash ran on the main thread and
        stuttered. Only mounted while something is actually loading. */}
    <span className="coco-rotor"><svg viewBox="0 0 40 40" aria-hidden="true">
      <circle className="coco-track" cx="20" cy="20" r="16"/>
      <circle className="coco-arc" cx="20" cy="20" r="16" pathLength={100} strokeDasharray={known ? `${Math.max(2, Math.min(100, progress! * 100))} 100` : '30 100'}/>
      {!known && <circle className="coco-swirl" cx="20" cy="20" r="9" pathLength={100}/>}
    </svg></span>
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
