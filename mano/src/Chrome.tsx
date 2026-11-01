import { useEffect, useState, type ReactNode } from 'react';

/** Main-screen chrome in the decision bar's language (see DecisionBar.tsx):
 * solid colour, cream band, ink contour, an ink base under what can be pressed.
 * Brand and chrome labels use Fredoka (rounded, straight stems); decision verbs
 * keep Patua One. */

const BRAND_FONT = 'Fredoka';
let canvas: HTMLCanvasElement | null = null;
function measure(text: string, px: number) {
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d'); if (!ctx) return text.length * px * .56;
  ctx.font = `600 ${px}px "${BRAND_FONT}", sans-serif`;
  return ctx.measureText(text).width;
}
/** True once the brand font is ready (measurements made before are re-run). */
function useBrandFont() {
  const spec = `600 16px "${BRAND_FONT}"`;
  const [ready, setReady] = useState(() => typeof document === 'undefined' || document.fonts?.check?.(spec) !== false);
  useEffect(() => { if (ready) return; let alive = true; document.fonts?.load(spec).then(() => { if (alive) setReady(true); }).catch(() => {}); return () => { alive = false; }; }, [ready]);
  return ready;
}

/* Line weights (CSS px): inner ink, cream band, outer ink, base. */
const INNER = 1.75, CREAM = 3, OUTER = 2.5, BASE = 3;
const PAD = INNER + CREAM + OUTER;

/** «CocoWash» as a sticker: white «Coco», pink «Wash», an ink line, a cream
 * margin, an outer ink contour and the ink base. SVG, so the thick contours
 * join round (HTML text strokes would spike on the W). */
export function Wordmark({ size = 24 }: { size?: number }) {
  const ready = useBrandFont();
  const [width, setWidth] = useState(0);
  useEffect(() => { setWidth(measure('CocoWash', size)); }, [ready, size]);
  // No room reserved for the base since 0.9 hides it: the name stays optically centred.
  const w = (width || size * 4.6) + PAD * 2, h = size * 1.04 + PAD * 2, base = PAD + size * .8;
  const text = (className: string, dy = 0) => <text className={className} x={PAD} y={base + dy} fontSize={size}>Coco<tspan className="wm-wash">Wash</tspan></text>;
  return <svg className="wordmark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
    {text('wm-base', BASE)}{text('wm-outer')}{text('wm-cream')}{text('wm-face')}
  </svg>;
}

/** Progress through the filtered pile: a turquoise track and the count on a
 * light capsule. Same accessible name as before («Revisados …»). */
export function PileProgress({ reviewed, total, count }: { reviewed: number; total: number; count: ReactNode }) {
  const share = total ? Math.min(1, reviewed / total) : 0;
  // The count capsule reserves room for the total's digits, so the track keeps
  // its length while the reviewed number grows (1/20 → 10/20).
  const digits = String(Math.max(0, total)).length;
  return <>
    <div className="pile-meter" role="progressbar" aria-valuemin={0} aria-valuemax={Math.max(1, total)} aria-valuenow={reviewed} aria-label={`Revisados ${reviewed} de ${total} con estos filtros`}>
      <span className="pile-meter-fill" style={{ width: `${share * 100}%` }}/>
    </div>
    <span className="pile-count" aria-hidden="true" style={{ minWidth: `calc(${digits * 2 + 1}ch + 22px)` }}>{count}</span>
  </>;
}
