import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, type MotionValue } from 'motion/react';
import { HandPointingIcon } from '@phosphor-icons/react';
import { Character, type ArtSlot, type Pose } from './Characters';

/** Coach marks, the video-game kind (user, 2026-11-19, second pass): the whole screen,
 * edge to edge, dims to ~70 %; only what is being taught stays lit, cut to its own
 * shape (the card's corners, the decision bar's curved pieces, «Terminar» and its
 * counter) with an even margin, a soft edge and a quiet glow. Between steps the lit
 * area travels and reshapes instead of jumping. Coqui talks from one clean bubble
 * above the dim, never over the photo. Shared by the first-launch practice
 * (Tutorial.tsx) and the tips on the pile (ContextTips.tsx). Decorative layers take
 * no touches. */

/** A rounded rectangle, in the coordinates of the coach layer (unscaled CSS px). */
export type Hole = { x: number; y: number; w: number; h: number; r: number };
/** A lit area: a rounded rectangle, or a decision-bar piece's own outline (its path,
 * placed by `dx/dy`, grown by `grow` px all round). `box` bounds it either way. */
export type Shape = { kind: 'rect'; box: Hole } | { kind: 'path'; box: Hole; d: string; dx: number; dy: number; grow: number };

/** Where `el` sits inside `root`, from layout offsets: independent of transforms (the
 * card's drag, a screen's entrance) and of the preview frame's scale. */
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

/** The element's own corner radius (a pill reads as half its height). */
export function radiusOf(el: Element | null, fallback = 16) {
  if (!el) return fallback;
  const value = getComputedStyle(el).borderTopLeftRadius;
  const px = parseFloat(value);
  if (!Number.isFinite(px)) return fallback;
  return Math.min(value.endsWith('%') ? (el as HTMLElement).offsetHeight * px / 100 : px, (el as HTMLElement).offsetHeight / 2);
}

/** Ink band around a decision-bar piece's path (DecisionBar: cream + ink) and its base. */
const PIECE_BAND = 6, PIECE_BASE = 3;
/** The lit shape of a target, in `layer` coordinates, `pad` px clear of it all round.
 * A decision-bar piece keeps its own outline; anything else its own rounded box. */
export function shapeOf(el: Element | null, layer: HTMLElement | null, pad = 6): Shape | null {
  const box = screenRect(el, layer);
  if (!el || !box) return null;
  const ink = el.querySelector('path.piece-ink'), svg = el.querySelector('svg');
  const d = ink?.getAttribute('d'), view = svg?.getAttribute('viewBox')?.split(/\s+/).map(Number);
  const grown = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2, r: 0 };
  if (d && view && view.length === 4 && view.every(Number.isFinite)) {
    const k = box.w / Math.max(1, view[2]);
    const grow = PIECE_BAND + pad;
    return { kind: 'path', d, dx: box.x - view[0] * k, dy: box.y - view[1] * k + PIECE_BASE / 2, grow, box: { x: grown.x - PIECE_BAND, y: grown.y - PIECE_BAND, w: grown.w + PIECE_BAND * 2, h: grown.h + PIECE_BAND * 2 + PIECE_BASE, r: (grown.h + PIECE_BAND * 2) / 2 } };
  }
  return { kind: 'rect', box: { ...grown, r: radiusOf(el) + pad } };
}
/** Several targets lit as one (a button and its badge). */
export const shapesOf = (els: (Element | null)[], layer: HTMLElement | null, pad = 6) => els.map(el => shapeOf(el, layer, pad)).filter((s): s is Shape => !!s);
/** Keeps a box inside the layer with a small margin, so no lit edge or glow is ever cut. */
export function clampBox(box: Hole, width: number, height: number, margin = 4): Hole {
  if (!width || !height) return box;
  const x = Math.max(margin, box.x), y = Math.max(margin, box.y);
  return { ...box, x, y, w: Math.max(0, Math.min(box.x + box.w, width - margin) - x), h: Math.max(0, Math.min(box.y + box.h, height - margin) - y) };
}
export const boundsOf = (shapes: Shape[]): Hole | null => {
  if (!shapes.length) return null;
  const x = Math.min(...shapes.map(s => s.box.x)), y = Math.min(...shapes.map(s => s.box.y));
  const w = Math.max(...shapes.map(s => s.box.x + s.box.w)) - x, h = Math.max(...shapes.map(s => s.box.y + s.box.h)) - y;
  return { x, y, w, h, r: Math.min(shapes[0].box.r, h / 2) };
};

const SCRIM = 'rgba(5,22,24,.7)';
const GLOW = '#9EE0D7';
const TRAVEL = { type: 'spring', stiffness: 360, damping: 36 } as const;

function ShapeMark({ shape, glow = 0, fill = 'black' }: { shape: Shape; glow?: number; fill?: string }) {
  if (shape.kind === 'rect') {
    const b = shape.box;
    return <rect x={b.x - glow} y={b.y - glow} width={b.w + glow * 2} height={b.h + glow * 2} rx={Math.min(b.r + glow, (b.h + glow * 2) / 2)} fill={glow ? 'none' : fill} stroke={glow ? fill : undefined} strokeWidth={glow ? glow * 2 : undefined}/>;
  }
  return <path d={shape.d} transform={`translate(${shape.dx} ${shape.dy})`} fill={fill} stroke={fill} strokeWidth={(shape.grow + glow) * 2} strokeLinejoin="round"/>;
}

/** The dimmed screen and its lit shapes, drawn once per step: nothing in it changes while
 * a card is dragged (a full-screen SVG mask repainted every frame was what made the
 * practice stutter on the iPhone). A card that must stay lit while it moves sits above
 * the dim instead (Tutorial.tsx). `target` travels to its next place and shape when
 * `travelKey` changes (~350 ms, the only time the mask is redrawn); `strong` pulses the
 * glow, an opacity animation on its own layer. */
export function Spotlight({ on, target, travelKey, strong = false }: { on: boolean; target: Shape[]; travelKey: string; strong?: boolean }) {
  const reduced = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current; if (!el) return;
    const read = () => setSize(s => s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight });
    read(); const observer = new ResizeObserver(read); observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // From one target to the next: a rounded box slides and reshapes, then the exact outline
  // shows. A new key arrives a render before its target is measured, so the travel waits
  // for the new target's box, then runs to it (and follows it if it is measured again).
  const lastKey = useRef(travelKey), lastBox = useRef<Hole | null>(boundsOf(target));
  const from = useRef<Hole | null>(null);
  const [moving, setMoving] = useState<{ from: Hole; to: Hole } | null>(null);
  const traveler = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue(0);
  const run = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => {
    const next = boundsOf(target);
    if (travelKey !== lastKey.current) { lastKey.current = travelKey; from.current = lastBox.current; }
    const start = from.current;
    if (start && next && (Math.abs(start.x - next.x) > 1 || Math.abs(start.y - next.y) > 1 || Math.abs(start.w - next.w) > 1)) {
      from.current = null;
      run.current?.stop();
      if (reduced || !on) setMoving(null);
      else {
        setMoving({ from: start, to: next });
        progress.set(0);
        const travel = animate(progress, 1, TRAVEL);
        run.current = travel;
        travel.then(() => { if (run.current === travel) { run.current = null; setMoving(null); } });
      }
    } else if (next) setMoving(m => m && (m.to.x !== next.x || m.to.y !== next.y || m.to.w !== next.w || m.to.h !== next.h) ? { ...m, to: next } : m);
    if (next) lastBox.current = next;
  }, [travelKey, target]);
  useEffect(() => () => run.current?.stop(), []);
  useEffect(() => {
    if (!moving) return;
    const draw = () => {
      const el = traveler.current; if (!el) return;
      const t = progress.get(), m = (a: number, b: number) => a + (b - a) * t;
      const h = m(moving.from.h, moving.to.h);
      el.setAttribute('x', String(m(moving.from.x, moving.to.x))); el.setAttribute('y', String(m(moving.from.y, moving.to.y)));
      el.setAttribute('width', String(Math.max(0, m(moving.from.w, moving.to.w)))); el.setAttribute('height', String(Math.max(0, h)));
      el.setAttribute('rx', String(Math.min(m(moving.from.r, moving.to.r), h / 2)));
    };
    draw();
    return progress.on('change', draw);
  }, [moving]);
  const shown = moving ? [] : target.map(s => s.kind === 'rect' ? { ...s, box: clampBox(s.box, size.w, size.h) } : s);
  return <motion.div ref={box} className="coach-spot" aria-hidden="true" initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: reduced ? .12 : on ? .3 : .2, ease: [.2, .8, .2, 1] }}>
    <svg className="coach-dim" width={size.w} height={size.h} viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}>
      <defs>
        <mask id={`${id}mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={size.w} height={size.h}>
          <rect width={size.w} height={size.h} fill="white"/>
          {shown.map((shape, i) => <ShapeMark key={i} shape={shape}/>)}
          {moving && <rect ref={traveler} fill="black"/>}
        </mask>
        <filter id={`${id}glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <rect width={size.w} height={size.h} fill={SCRIM} mask={`url(#${id}mask)`}/>
    </svg>
    {/* The glow sits just outside each lit edge (masked), never over the lit element; it is
        static and on its own layer, so pulsing it costs no repaint. Hidden while travelling. */}
    {!moving && shown.length > 0 && <svg className={`coach-glow ${strong ? 'is-strong' : ''}`} width={size.w} height={size.h} viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}>
      <g mask={`url(#${id}mask)`} filter={`url(#${id}glow)`}>{shown.map((shape, i) => <ShapeMark key={i} shape={shape} glow={3} fill={GLOW}/>)}</g>
    </svg>}
  </motion.div>;
}

/** The hand that shows the gesture: an opaque, outlined pointing hand whose fingertip is
 * the point (x, y), with a pressure ring. `turn` points it (0 up, 90 right, -90 left). */
export function Hand({ at, x, y, opacity, scale, press, turn = 0 }: { at: { x: number; y: number }; x: MotionValue<number>; y: MotionValue<number>; opacity: MotionValue<number>; scale: MotionValue<number>; press?: MotionValue<number>; turn?: number }) {
  return <motion.span className="coach-hand" aria-hidden="true" style={{ left: at.x, top: at.y, x, y, opacity, scale }}>
    <motion.span className="coach-touch" style={press ? { scale: press } : undefined}/>
    <span className="coach-hand-turn" style={{ transform: `rotate(${turn}deg)` }}><HandPointingIcon className="coach-hand-icon" weight="fill" size={50}/></span>
  </motion.span>;
}

/** The path a swipe takes: a soft track from where the finger lands to where it lets
 * go, with a clear arrowhead. Drawn above the dim, so it never reads as part of the photo. */
export function Track({ from, dx, dy, opacity }: { from: { x: number; y: number }; dx: number; dy: number; opacity: MotionValue<number> }) {
  const length = Math.hypot(dx, dy), angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return <motion.span className="coach-track" aria-hidden="true" style={{ left: from.x, top: from.y, width: length, rotate: angle, opacity }}>
    <span className="coach-track-line"/><span className="coach-track-head"/>
  </motion.span>;
}

/** Coqui's size is constant from pose to pose: each drawing is scaled so his head
 * reads the same (the poses are cut from different sheets). */
const POSE_SCALE: Partial<Record<Pose | ArtSlot, number>> = { 'coqui-calm': 1.22, 'coqui-photos': .96, 'coqui-think': .94, 'coqui-cheer': 1.02 };
export type Tone = 'ask' | 'done' | 'missed';
/** Coqui beside one clean bubble: the action in bold, the reason lighter. A new step
 * pops the bubble in together with Coqui's new pose; a confirmation makes him hop,
 * a miss makes him shake. */
export function Bubble({ pose, title, body, tone, children }: { pose: Pose | ArtSlot; title: string; body?: string; tone: Tone; children?: ReactNode }) {
  const reduced = useReducedMotion();
  const react = reduced ? {} : tone === 'done' ? { y: [8, -9, 0], rotate: [0, -4, 0] } : tone === 'missed' ? { x: [0, -5, 5, -3, 3, 0] } : {};
  return <div className={`coach-talk is-${tone}`}>
    <motion.span key={pose + tone} className="coach-coqui" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: .82, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0, ...react }}
      transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 480, damping: 26, y: { duration: .42 }, rotate: { duration: .42 }, x: { duration: .4 } }}>
      <span className="coach-coqui-art" style={{ scale: POSE_SCALE[pose] ?? 1 } as CSSProperties}><Character pose={pose} height={64} motion="still"/></span>
    </motion.span>
    <motion.div key={title + (body ?? '')} className="coach-bubble" initial={reduced ? { opacity: 0 } : { opacity: 0, scale: .9, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={reduced ? { duration: .12 } : { type: 'spring', stiffness: 520, damping: 30, delay: .04 }}>
      <strong>{title}</strong>{body && <span>{body}</span>}{children}
    </motion.div>
  </div>;
}
