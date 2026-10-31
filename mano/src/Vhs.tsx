import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Asset } from './domain';
import type { Place } from './library';
import { vhsLayout, type VideoMeta } from './meta';
import { pixelPath } from './pixelfont';

export function PixelText({ text, pixel, className }: { text: string; pixel: number; className?: string }) {
  const { d, width } = useMemo(() => pixelPath(text), [text]);
  return <svg className={`pixel-text ${className ?? ''}`} width={width * pixel} height={7 * pixel} viewBox={`0 0 ${width} 7`} shapeRendering="crispEdges" aria-hidden="true" overflow="visible">
    <path d={d} className="px-shadow" transform="translate(.35 .35)"/>
    <path d={d} className="px-red" transform="translate(-.3 0)"/>
    <path d={d} className="px-blue" transform="translate(.3 0)"/>
    <path d={d} className="px-ink"/>
  </svg>;
}

let grain = '';
/** One 96² noise tile, generated once and moved in steps (cheap, GPU-friendly). */
function grainTile() {
  if (grain || typeof document === 'undefined') return grain;
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
    const context = canvas.getContext('2d'); if (!context) return '';
    const image = context.createImageData(96, 96);
    for (let i = 0; i < image.data.length; i += 4) { const v = Math.random() * 255; image.data[i] = image.data[i + 1] = image.data[i + 2] = v; image.data[i + 3] = 255; }
    context.putImageData(image, 0, 0); grain = canvas.toDataURL('image/png');
  } catch { grain = ''; }
  return grain;
}

/** Camcorder timestamp layer. A bottom band holds the time/date/place stack
 * (left) and an independent duration (right); missing data simply drops out,
 * so 1–4 values all read as composed rather than incomplete. */
export function VhsOverlay({ asset, place, settings, lifted = false, hideDuration = false, label = true }: { asset: Asset; place?: Place; settings: VideoMeta; lifted?: boolean; hideDuration?: boolean; label?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [pixel, setPixel] = useState(2);
  useLayoutEffect(() => {
    const element = host.current; if (!element) return;
    const resize = () => { const width = element.clientWidth; setPixel(Math.max(1.5, Math.min(3, Math.round(width / 140 * 2) / 2))); };
    resize(); const observer = new ResizeObserver(resize); observer.observe(element); return () => observer.disconnect();
  }, []);
  const layout = vhsLayout(asset, place, settings);
  const duration = hideDuration ? undefined : layout.duration;
  if (layout.empty) return null;
  const spoken = [...layout.lines, layout.duration ? `duración ${layout.duration}` : ''].filter(Boolean).join(', ');
  return <div ref={host} className={`vhs-osd ${lifted ? 'is-lifted' : ''}`} style={{ '--px': `${pixel}px`, '--grain': grainTile() ? `url(${grain})` : 'none' } as CSSProperties} role={label ? 'img' : undefined} aria-label={label ? spoken : undefined} aria-hidden={label ? undefined : true}>
    <div className="vhs-band">
      {layout.lines.length > 0 && <div className="vhs-lines">{layout.lines.map(line => <PixelText key={line} text={line} pixel={pixel} className="vhs-line"/>)}</div>}
      {duration && <PixelText key={`d-${duration}`} text={duration} pixel={pixel} className="vhs-duration"/>}
    </div>
  </div>;
}
