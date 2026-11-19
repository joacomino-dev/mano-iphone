import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion, type MotionValue } from 'motion/react';
import { HandPointingIcon } from '@phosphor-icons/react';
import { Character, type ArtSlot, type Pose } from './Characters';

/** Coach marks, the video-game kind (user, 2026-11-19): the rest of the screen dims,
 * what has to be touched stays lit with a soft ring, a hand loops the gesture until the
 * person does it, and Coqui says one short line from his own strip, never over the
 * photo or the gesture. Shared by the first-launch practice (Tutorial.tsx) and the
 * tips on the pile (ContextTips.tsx). Decorative layers take no touches. */

/** A lit area, in the coordinates of the layer that holds the coach (unscaled CSS px). */
export type Hole = { x: number; y: number; w: number; h: number; r: number };

/** Where `el` sits inside `root`, from layout offsets: independent of transforms (the
 * card's drag, the preview frame's scale, a screen's entrance) and of scrolling. */
export function layoutRect(el: HTMLElement | null, root: HTMLElement | null, pad = 0, r = 16): Hole | null {
  if (!el || !root) return null;
  let x = 0, y = 0, node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft; y += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    if (!parent || !root.contains(parent)) return null;
    node = parent;
  }
  if (node !== root) return null;
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return null;
  return { x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, r };
}

/** Where `el` is on screen, in `root`'s unscaled coordinates (for a layer that is not
 * an ancestor of the target; the preview frame may scale everything). */
export function screenRect(el: Element | null, root: HTMLElement | null, pad = 0, r = 16): Hole | null {
  if (!el || !root) return null;
  const box = el.getBoundingClientRect(), base = root.getBoundingClientRect();
  const k = base.width / Math.max(1, root.offsetWidth) || 1;
  if (!box.width || !box.height) return null;
  return { x: (box.left - base.left) / k - pad, y: (box.top - base.top) / k - pad, w: box.width / k + pad * 2, h: box.height / k + pad * 2, r };
}

const round = (v: number) => Math.round(v * 10) / 10;
/** One path: the whole layer, minus each hole (even-odd), with rounded corners. */
export function dimPath(width: number, height: number, holes: Hole[]): string {
  let d = `M0 0H${round(width)}V${round(height)}H0Z`;
  for (const h of holes) {
    const r = Math.max(0, Math.min(h.r, h.w / 2, h.h / 2));
    const x = round(h.x), y = round(h.y), w = round(h.w), hh = round(h.h);
    d += `M${round(x + r)} ${y}H${round(x + w - r)}A${r} ${r} 0 0 1 ${round(x + w)} ${round(y + r)}V${round(y + hh - r)}A${r} ${r} 0 0 1 ${round(x + w - r)} ${round(y + hh)}H${round(x + r)}A${r} ${r} 0 0 1 ${x} ${round(y + hh - r)}V${round(y + r)}A${r} ${r} 0 0 1 ${round(x + r)} ${y}Z`;
  }
  return d;
}

/** The dimmed screen with its lit holes. `follow` moves one hole with a dragged card
 * (written straight to the path: no render per frame); `ky` scales its vertical travel
 * (the pile damps vertical drags). */
export function Dim({ on, holes, follow, className = '' }: { on: boolean; holes: Hole[]; follow?: { index: number; x: MotionValue<number>; y: MotionValue<number>; ky?: number }; className?: string }) {
  const reduced = useReducedMotion();
  const svg = useRef<SVGSVGElement>(null), path = useRef<SVGPathElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = svg.current?.parentElement; if (!el) return;
    const read = () => setSize(s => s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight });
    read(); const observer = new ResizeObserver(read); observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const draw = () => {
      const moved = holes.map((h, i) => follow && i === follow.index ? { ...h, x: h.x + follow.x.get(), y: h.y + follow.y.get() * (follow.ky ?? 1) } : h);
      path.current?.setAttribute('d', dimPath(size.w, size.h, moved));
    };
    draw();
    if (!follow) return;
    const a = follow.x.on('change', draw), b = follow.y.on('change', draw);
    return () => { a(); b(); };
  }, [holes, follow, size]);
  return <motion.svg ref={svg} className={`coach-dim ${className}`} aria-hidden="true" width={size.w} height={size.h} viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
    initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: reduced ? .12 : on ? .32 : .22, ease: [.2, .8, .2, 1] }}>
    <path ref={path} fillRule="evenodd"/>
  </motion.svg>;
}

/** A soft ring around a lit target; `strong` pulses (it is the one to touch). */
export function Ring({ hole, strong = false }: { hole: Hole; strong?: boolean }) {
  return <span className={`coach-ring ${strong ? 'is-strong' : ''}`} aria-hidden="true"
    style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: hole.r } as CSSProperties}/>;
}

/** The hand that shows the gesture. Its fingertip is the point (x, y); `press` dips it
 * like a touch. Motion values come from the caller's loop. */
export function Hand({ at, x, y, opacity, scale, press, still, arrow }: { at: { x: number; y: number }; x: MotionValue<number>; y: MotionValue<number>; opacity: MotionValue<number>; scale: MotionValue<number>; press?: MotionValue<number>; still?: boolean; arrow?: 'right' | 'left' | 'up' | 'down' }) {
  return <motion.span className={`coach-hand ${still ? 'is-still' : ''}`} aria-hidden="true" style={{ left: at.x, top: at.y, x, y, opacity, scale }}>
    <motion.span className="coach-touch" style={press ? { scale: press } : undefined}/>
    <HandPointingIcon className="coach-hand-icon" weight="fill" size={46}/>
    {arrow && <span className={`coach-arrow is-${arrow}`}/>}
  </motion.span>;
}

export type Tone = 'ask' | 'done' | 'missed';
/** Coqui and one line, in the coach strip. A new line pops in; Coqui changes pose with
 * the moment (pointing, pleased, cheering, shrugging). */
export function Bubble({ pose, text, tone, hop = false, children }: { pose: Pose | ArtSlot; text: string; tone: Tone; hop?: boolean; children?: ReactNode }) {
  const reduced = useReducedMotion();
  // A new line or pose pops in over the old one (keyed remount, no exit to wait for:
  // steps can follow each other faster than an exit would finish).
  return <div className={`coach-bubble is-${tone}`}>
    <motion.span key={pose + (hop ? '-hop' : '')} className="coach-coqui" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: .8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 520, damping: 28 }}>
      <Character pose={pose} height={64} motion={hop ? 'hop' : 'still'}/>
    </motion.span>
    <motion.p key={text} className="coach-line" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: .92, x: -6 }} animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 560, damping: 32 }}>
      {text}{children}
    </motion.p>
  </div>;
}
