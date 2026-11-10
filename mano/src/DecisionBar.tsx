import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { t } from './i18n';

/** CocoWash decision bar: Eliminar · Favorita · Conservar.
 *
 * Three independent buttons drawn as one set, in the cartoon language of Coqui
 * (Memo, retired 2026-11-10, shared it): solid colour, a cream band, a thick ink contour and an ink base
 * under each piece (the press sinks the face onto it). Everything is vector,
 * computed for the real width: the side buttons are hollowed by the exact
 * outward offset of the heart's silhouette (not a circle), so their concave
 * ends follow the heart at a constant distance and never touch it.
 *
 * Presentation only: the buttons call the handlers they are given. */

/** Line weights in CSS px (same for the three pieces). */
const CREAM = 3.5, INK = 2.5, BAND = CREAM + INK;
/** Air between the heart's ink edge and each neighbour's ink edge. */
const GAP = 5;
/** Ink base under each piece; a press sinks the face by PRESS. */
const BASE = 3;

/* ---------- Heart, in unit coordinates (fill height 1, centred on x = 0) ---------- */
// Two round lobes (circles), plump sides with a vertical tangent at the widest
// point, and a softly rounded tip: the classic cartoon heart.
const R = .31, D = .265, CY = R, HALF = D + R;
const CLEFT = CY - Math.sqrt(R * R - D * D);
type P = [number, number];
const cubic = (a: P, b: P, c: P, d: P, t: number): P => {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
};
const quad = (a: P, b: P, c: P, t: number): P => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]; };
const SIDE: [P, P, P, P] = [[-HALF, CY], [-HALF, CY + .26], [-.24, .79], [-.05, .968]];
const TIP: [P, P, P] = [[-.05, .968], [0, 1.012], [.05, .968]];
/** Left half of the contour (cleft → lobe → side → tip), sampled for offsets. */
const HEART_LEFT: P[] = (() => {
  const points: P[] = [];
  const from = Math.atan2(CLEFT - CY, D);
  for (let i = 0; i <= 48; i++) { const a = from + (-Math.PI - from) * i / 48; points.push([-D + R * Math.cos(a), CY + R * Math.sin(a)]); }
  for (let i = 1; i <= 48; i++) points.push(cubic(...SIDE, i / 48));
  for (let i = 1; i <= 8; i++) points.push(quad(...TIP, i / 16));
  return points;
})();
const f = (n: number) => Math.round(n * 100) / 100;
/** The heart as an SVG path, scaled by `s` around (cx, top). */
function heartPath(cx: number, top: number, s: number) {
  const X = (x: number) => f(cx + x * s), Y = (y: number) => f(top + y * s), r = f(R * s);
  const [, b, c, d] = SIDE, [, q, e] = TIP;
  return `M${X(0)} ${Y(CLEFT)}A${r} ${r} 0 0 0 ${X(-HALF)} ${Y(CY)}C${X(b[0])} ${Y(b[1])} ${X(c[0])} ${Y(c[1])} ${X(d[0])} ${Y(d[1])}`
    + `Q${X(q[0])} ${Y(q[1])} ${X(e[0])} ${Y(e[1])}C${X(-c[0])} ${Y(c[1])} ${X(-b[0])} ${Y(b[1])} ${X(HALF)} ${Y(CY)}A${r} ${r} 0 0 0 ${X(0)} ${Y(CLEFT)}Z`;
}
/** Illustrated gloss: a short cream stroke following the left lobe. */
function glossPath(cx: number, top: number, s: number) {
  const r = R * .62 * s, ox = cx - D * s, oy = top + CY * s;
  const at = (deg: number) => [f(ox + r * Math.cos(deg * Math.PI / 180)), f(oy + r * Math.sin(deg * Math.PI / 180))];
  const [x0, y0] = at(-170), [x1, y1] = at(-118);
  return `M${x0} ${y0}A${f(r)} ${f(r)} 0 0 1 ${x1} ${y1}`;
}

/* ---------- Layout ---------- */
export type BarVariant = 'compact' | 'icon';
type Box = { x: number; y: number; w: number; h: number };
type Piece = { box: Box; d: string };
type Geometry = { width: number; height: number; heart: Piece & { gloss: string; inner: string }; discard: Piece & { content: Box }; keep: Piece & { content: Box } };

/** `width` is the bar's width; `button` the side buttons' full height (bands
 * included); `heart` the heart's fill height. */
export function barGeometry(width: number, button: number, heart: number): Geometry {
  const cx = width / 2, top = BAND, s = heart;
  const fill = button - 2 * BAND;
  // The buttons sit at the heart's mid-height, so it rises above them and its
  // tip drops below by about the same: it leads the row.
  const mid = top + s * .5, bTop = mid - fill / 2, bBottom = mid + fill / 2;
  const offset = 2 * BAND + GAP; // fill edge → neighbour's fill edge
  const contour = HEART_LEFT.map(([x, y]): P => [cx + x * s, top + y * s]);
  /** The concave edge: Minkowski offset of the heart's left half at height y. */
  const edge = (y: number) => {
    let x = cx - 1;
    for (const [px, py] of contour) { const dy = y - py; if (Math.abs(dy) <= offset) x = Math.min(x, px - Math.sqrt(offset * offset - dy * dy)); }
    return x;
  };
  const steps = Math.max(12, Math.round(fill / 2));
  const ys = Array.from({ length: steps + 1 }, (_, i) => bTop + fill * i / steps);
  const xs = ys.map(edge);
  const deep = Math.min(...xs);
  // The tips are rounded off, never pointed toward the heart.
  const round = Math.min(12, fill * .27), corner = fill * .42, outer = BAND;
  const tip = (i: number) => [f(xs[i]), f(ys[i])];
  const into = Math.max(1, Math.round(steps * round / fill));
  const sidePath = (m: (x: number) => number, sweep: 0 | 1) => {
    const pts = ys.map((y, i) => [f(m(xs[i])), f(y)]);
    const [tx0] = tip(0), [txn] = tip(steps);
    let d = `M${f(m(outer + corner))} ${f(bTop)}L${f(m(tx0 - round))} ${f(bTop)}Q${f(m(tx0))} ${f(bTop)} ${pts[into][0]} ${pts[into][1]}`;
    for (let i = into + 1; i <= steps - into; i++) d += `L${pts[i][0]} ${pts[i][1]}`;
    d += `Q${f(m(txn))} ${f(bBottom)} ${f(m(txn - round))} ${f(bBottom)}L${f(m(outer + corner))} ${f(bBottom)}`;
    d += `A${f(corner)} ${f(corner)} 0 0 ${sweep} ${f(m(outer))} ${f(bBottom - corner)}L${f(m(outer))} ${f(bTop + corner)}A${f(corner)} ${f(corner)} 0 0 ${sweep} ${f(m(outer + corner))} ${f(bTop)}Z`;
    return d;
  };
  const reach = Math.max(xs[0], xs[steps]) + BAND;
  const sideBox: Box = { x: 0, y: bTop - BAND, w: reach, h: fill + 2 * BAND + BASE };
  // Content sits between the rounded outer end and the deepest point of the cut.
  const content = (mirror: boolean): Box => {
    const from = outer + 4, to = deep - 3;
    return { x: mirror ? width - to : from, y: bTop, w: to - from, h: fill };
  };
  const hw = HALF * s + BAND;
  return {
    width, height: s + 2 * BAND + BASE,
    heart: { box: { x: cx - hw, y: 0, w: hw * 2, h: s + 2 * BAND + BASE }, d: heartPath(cx, top, s), gloss: glossPath(cx, top, s),
      inner: heartPath(cx, top + s * .17, s * .68) },
    discard: { box: sideBox, d: sidePath(x => x, 1), content: content(false) },
    keep: { box: { ...sideBox, x: width - reach }, d: sidePath(x => width - x, 0), content: content(true) },
  };
}

/* ---------- Icons (24 × 24, cream with an ink contour) ---------- */
const ICONS = {
  trash: <>
    <rect x="9" y="2.4" width="6" height="4" rx="1.3"/>
    <path d="M5.4 9.6h13.2l-1.15 10.5c-.1 1-.9 1.6-1.85 1.6H8.4c-.95 0-1.75-.6-1.85-1.6Z"/>
    <rect x="3.6" y="5.4" width="16.8" height="3.6" rx="1.6"/>
    <path className="ink" d="M9.8 12.4v6.4M14.2 12.4v6.4"/>
  </>,
  bookmark: <><path d="M6.6 2.8h10.8c.9 0 1.6.7 1.6 1.6v16.4c0 .55-.6.85-1.05.55L12 17.6l-5.95 3.75c-.45.3-1.05 0-1.05-.55V4.4c0-.9.7-1.6 1.6-1.6Z"/></>,
};
function BarIcon({ name, className }: { name: keyof typeof ICONS; className: string }) {
  return <svg className={`bar-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONS[name]}</svg>;
}

/* ---------- Sizing ---------- */
const LABELS = { discard: () => t('Eliminar'), keep: () => t('Conservar') } as const;
let canvas: HTMLCanvasElement | null = null;
/** The bar's own type (--cw-font-display): Patua One, or the system font in
 * Arabic and Japanese, so each language is measured as it will be drawn. */
const barFont = () => (typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue('--cw-font-display').trim()) || '"Patua One", Georgia, serif';
function textWidth(text: string, px: number) {
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d'); if (!ctx) return text.length * px * .62;
  ctx.font = `400 ${px}px ${barFont()}`;
  return ctx.measureText(text.toUpperCase()).width + text.length * px * .02;
}
/** The richest variant whose longer label fits, at the size Dynamic Type asks
 * for (rem); both sides always use the same variant, for symmetry. */
function pickVariant(room: number, rem: number): { variant: BarVariant; font: number; icon: number } {
  // Both sides share one variant: measure the longer word (it changes by language).
  const word = (px: number) => Math.max(textWidth(LABELS.keep(), px), textWidth(LABELS.discard(), px));
  // No arrows (9.8.2): short words got them and long ones did not, so the bar
  // now looks the same in every language.
  const icon = Math.round(rem * 1.25), gap = rem * .3125;
  for (const scale of [1, .94, .88, .82]) {
    const px = rem * 1.0625 * scale;
    if (word(px) + icon + gap <= room) return { variant: 'compact', font: px, icon };
  }
  return { variant: 'icon', font: rem, icon: Math.round(rem * 1.75) };
}

type Props = {
  /** Number of items a press decides (selected cards), for labels. */
  count: number;
  disabled: boolean;
  /** «Favoritas» set: the heart is on, it takes the item out of Favorites, and
   * Eliminar is unavailable (favourites are never deleted). */
  favoriteOn: boolean;
  /** The side the card is being dragged toward. */
  armed: '' | 'keep' | 'discard' | 'favorite' | 'later';
  onDiscard: () => void;
  onFavorite: () => void;
  onKeep: () => void;
};

export function DecisionBar({ count, disabled, favoriteOn, armed, onDiscard, onFavorite, onKeep }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, button: 56, heart: 70, rem: 16 });
  const [fontReady, setFontReady] = useState(() => typeof document === 'undefined' || document.fonts?.check?.(`16px ${barFont()}`) !== false);
  useLayoutEffect(() => {
    const el = host.current; if (!el) return;
    const read = () => {
      const style = getComputedStyle(el);
      const button = parseFloat(style.getPropertyValue('--bar-button')) || 56, heart = parseFloat(style.getPropertyValue('--bar-heart')) || 70;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const width = Math.round(el.clientWidth);
      setSize(s => s.width === width && s.button === button && s.heart === heart && s.rem === rem ? s : { width, button, heart, rem });
    };
    read();
    const observer = new ResizeObserver(read); observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (fontReady) return; let alive = true; document.fonts?.load(`16px ${barFont()}`).then(() => { if (alive) setFontReady(true); }).catch(() => {}); return () => { alive = false; }; }, [fontReady]);
  const geometry = useMemo(() => size.width ? barGeometry(size.width, size.button, size.heart) : null, [size.width, size.button, size.heart]);
  const fit = useMemo(() => geometry ? pickVariant(geometry.discard.content.w, size.rem) : null, [geometry, size.rem, fontReady]);
  const style = { '--bar-height': geometry ? `${geometry.height}px` : undefined } as CSSProperties;
  return <div ref={host} className={`decision-bar ${armed ? `armed-${armed}` : ''} ${favoriteOn ? 'is-favorites' : ''} ${fit ? `is-${fit.variant}` : ''}`} style={style}>
    {geometry && fit && <>
      <SideButton kind="discard" piece={geometry.discard} fit={fit} disabled={disabled || favoriteOn} onClick={onDiscard}
        label={favoriteOn ? t('Eliminar: no disponible para favoritas') : count > 1 ? t('Eliminar {n}', { n: count }) : t('Eliminar')}/>
      <button type="button" className="bar-piece bar-heart" aria-pressed={favoriteOn} disabled={disabled} onClick={onFavorite}
        aria-label={favoriteOn ? (count > 1 ? t('Quitar {n} de Favoritas', { n: count }) : t('Quitar de Favoritas')) : count > 1 ? t('Añadir {n} a Favoritas', { n: count }) : t('Añadir a Favoritas')} style={place(geometry.heart.box)}>
        <svg viewBox={view(geometry.heart.box)} aria-hidden="true" focusable="false">
          <path className="piece-base" d={geometry.heart.d} transform={`translate(0 ${BASE})`}/>
          <g className="piece-face">
            <path className="piece-focus" d={geometry.heart.d}/>
            <path className="piece-ink" d={geometry.heart.d}/>
            <path className="piece-cream" d={geometry.heart.d}/>
            <path className="piece-fill" d={geometry.heart.d}/>
            <path className="heart-gloss" d={geometry.heart.gloss}/>
            <path className="heart-inner" d={geometry.heart.inner}/>
          </g>
        </svg>
      </button>
      <SideButton kind="keep" piece={geometry.keep} fit={fit} disabled={disabled} onClick={onKeep} label={count > 1 ? t('Conservar {n}', { n: count }) : t('Conservar')}/>
    </>}
  </div>;
}

const place = (box: Box): CSSProperties => ({ left: box.x, top: box.y, width: box.w, height: box.h });
const view = (box: Box) => `${f(box.x)} ${f(box.y)} ${f(box.w)} ${f(box.h)}`;

function SideButton({ kind, piece, fit, disabled, label, onClick }: { kind: 'discard' | 'keep'; piece: Piece & { content: Box }; fit: { variant: BarVariant; font: number; icon: number }; disabled: boolean; label: string; onClick: () => void }) {
  const { box, content } = piece;
  const icon = <BarIcon name={kind === 'discard' ? 'trash' : 'bookmark'} className="bar-symbol"/>;
  const word = fit.variant !== 'icon' && <span className="bar-word" aria-hidden="true">{LABELS[kind]()}</span>;
  return <button type="button" className={`bar-piece bar-side bar-${kind}`} disabled={disabled} onClick={onClick} aria-label={label} style={place(box)}>
    <svg viewBox={view(box)} aria-hidden="true" focusable="false">
      <path className="piece-base" d={piece.d} transform={`translate(0 ${BASE})`}/>
      <g className="piece-face">
        <path className="piece-focus" d={piece.d}/>
        <path className="piece-ink" d={piece.d}/>
        <path className="piece-cream" d={piece.d}/>
        <path className="piece-fill" d={piece.d}/>
      </g>
    </svg>
    <span className="bar-content" style={{ left: content.x - box.x, top: content.y - box.y, width: content.w, height: content.h, fontSize: fit.font, '--bar-icon': `${fit.icon}px` } as CSSProperties}>
      {icon}{word}
    </span>
  </button>;
}

/** Exported for the visual check and tests. */
export const BAR_LINES = { CREAM, INK, BAND, GAP, BASE };
