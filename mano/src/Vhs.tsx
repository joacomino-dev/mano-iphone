import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Asset } from './domain';
import type { Place } from './library';
import { placeLabel, vhsLayout, type VideoMeta } from './meta';
import { fitOsd, pixelPath } from './pixelfont';

export function PixelText({ text, pixel, className }: { text: string; pixel: number; className?: string }) {
  const { d, width } = useMemo(() => pixelPath(text), [text]);
  return <svg className={`pixel-text ${className ?? ''}`} width={width * pixel} height={7 * pixel} viewBox={`0 0 ${width} 7`} shapeRendering="crispEdges" aria-hidden="true" overflow="visible">
    <path d={d} className="px-shadow" transform="translate(.35 .35)"/>
    <path d={d} className="px-red" transform="translate(-.3 0)"/>
    <path d={d} className="px-blue" transform="translate(.3 0)"/>
    <path d={d} className="px-ink"/>
  </svg>;
}

/** Camcorder timestamp: only the letters. The time/date/place stack (left) and
 * an independent duration (right) are sized to the visible frame and never
 * overflow: the pixel shrinks first, then the place line drops. Missing data
 * simply drops out, so 1–4 values all read as composed rather than incomplete. */
export function VhsOverlay({ asset, place, settings, label = true }: { asset: Asset; place?: Place; settings: VideoMeta; label?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 280, height: 210 });
  useLayoutEffect(() => {
    const element = host.current; if (!element) return;
    const resize = () => setBox(previous => previous.width === element.clientWidth && previous.height === element.clientHeight ? previous : { width: element.clientWidth, height: element.clientHeight });
    resize(); const observer = new ResizeObserver(resize); observer.observe(element); return () => observer.disconnect();
  }, []);
  const layout = vhsLayout(asset, place, settings);
  const placeLine = settings.location ? placeLabel(place, true, 22) : undefined;
  // Parents re-render on every drag frame; measure the type only when it changes.
  const linesKey = layout.lines.join('|');
  const fit = useMemo(() => fitOsd(layout.lines, layout.duration, box, placeLine), [linesKey, layout.duration, box, placeLine]);
  if (layout.empty) return null;
  const spoken = [...layout.lines, layout.duration ? `duración ${layout.duration}` : ''].filter(Boolean).join(', ');
  return <div ref={host} className="vhs-osd" style={{ '--px': `${fit.pixel}px`, '--vhs-pad': `${fit.pad}px` } as CSSProperties} role={label ? 'img' : undefined} aria-label={label ? spoken : undefined} aria-hidden={label ? undefined : true}>
    <div className="vhs-band">
      {fit.lines.length > 0 && <div className="vhs-lines">{fit.lines.map(line => <PixelText key={line} text={line} pixel={fit.pixel} className="vhs-line"/>)}</div>}
      {layout.duration && <PixelText key={`d-${layout.duration}`} text={layout.duration} pixel={fit.pixel} className="vhs-duration"/>}
    </div>
  </div>;
}
