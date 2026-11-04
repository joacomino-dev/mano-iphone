import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowCounterClockwiseIcon, CloudIcon, ImageBrokenIcon } from '@phosphor-icons/react';
import { Carousel } from './mobile';
import type { Asset } from './domain';
import { reviewThumbnail, inCloudError, type Thumb } from './library';
import { sharpPreview, subscribeSharp } from './media';
import { thumbPixels, previewPolicyKey, subscribePreviewPolicy } from './preview';
import { CocoLoader, Deferred } from './Loader';
import { ReviewLoader, reviewRows, reviewHeight } from './review';

function ReviewPhoto({ asset, loader, open }: { asset: Asset; loader: ReviewLoader<Thumb>; open: boolean }) {
  const policy = useSyncExternalStore(subscribePreviewPolicy, previewPolicyKey);
  const [thumb, setThumb] = useState<Thumb>();
  const [error, setError] = useState(false), [cloud, setCloud] = useState(false), [retry, setRetry] = useState(0);
  const sharp = useSyncExternalStore(subscribeSharp, () => sharpPreview(asset));
  const size = thumbPixels(), key = `${asset.id}:${asset.modified ?? 0}:${size}:${policy}`;
  const src = (retry === 0 ? sharp : undefined) || thumb?.src;
  useEffect(() => {
    if (!open || (sharp && retry === 0)) return;
    const controller = new AbortController(); setError(false); setCloud(false);
    void loader.request(key, signal => reviewThumbnail(asset, size, signal), controller.signal)
      .then(value => { if (!controller.signal.aborted) setThumb(value); })
      .catch(e => { if (!controller.signal.aborted) { if (inCloudError(e)) setCloud(true); else setError(true); } });
    return () => controller.abort();
  }, [open, key, sharp, retry, loader]);
  if (src && !error) return <img src={src} alt={asset.kind === 'video' ? 'Vista previa de vídeo' : 'Foto del carrete'} draggable={false} decoding="async" onError={() => {
    if (retry === 0) { loader.forget(key); setThumb(undefined); setRetry(1); } else setError(true);
  }}/>;
  if (cloud) return <div className="photo-loading is-cloud"><CloudIcon size={22}/></div>;
  return <div className={`photo-loading ${error ? 'has-error' : ''}`}>{error ? <><ImageBrokenIcon size={26}/><span>No se pudo cargar</span></> : <Deferred><CocoLoader size={28}/></Deferred>}</div>;
}

/** The same cards in measured rows; only the viewport, overscan and focused row
 * mount. The scroll owner remains the existing sheet, including its animations. */
export const ReviewGrid = memo(function ReviewGrid({ assets, open, recover }: { assets: Asset[]; open: boolean; recover: (id: string) => void }) {
  const grid = useRef<HTMLDivElement>(null), viewport = useRef<HTMLElement | null>(null);
  const [loader] = useState(() => new ReviewLoader<Thumb>());
  const [box, setBox] = useState({ offset: 0, viewport: 600, height: 180, gap: 8 });
  const [focusId, setFocusId] = useState<string>();
  const wantedFocus = useRef<string | undefined>(undefined);
  const focused = focusId ? assets.findIndex(a => a.id === focusId) : -1;
  const rows = reviewRows(assets.length, box.offset, box.viewport, box.height, box.gap, focused);

  useEffect(() => { if (!open) loader.cancelAll(); return () => loader.cancelAll(); }, [open, loader]);
  useLayoutEffect(() => {
    const node = grid.current; if (!node) return;
    const scroll = node.closest<HTMLElement>('.sheet-content') ?? node.closest<HTMLElement>('.mano-sheet-body');
    if (!scroll) return; viewport.current = scroll;
    let frame = 0;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const width = parseFloat(getComputedStyle(node).width) || node.clientWidth;
      const scale = rect.width / Math.max(1, width) || 1;
      const row = node.querySelector<HTMLElement>('[data-review-row]');
      const next = { offset: (scroll.getBoundingClientRect().top - rect.top) / scale + scroll.clientTop,
        viewport: scroll.clientHeight, height: row ? row.getBoundingClientRect().height / scale : box.height,
        gap: parseFloat(getComputedStyle(node).rowGap) || 0 };
      setBox(previous => Object.keys(next).every(k => Math.abs(previous[k as keyof typeof next] - next[k as keyof typeof next]) < .25) ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); }); };
    measure(); const observer = new ResizeObserver(schedule); observer.observe(node); observer.observe(scroll);
    const row = node.querySelector('[data-review-row]'); if (row) observer.observe(row);
    scroll.addEventListener('scroll', schedule, { passive: true });
    return () => { observer.disconnect(); scroll.removeEventListener('scroll', schedule); cancelAnimationFrame(frame); };
  }, [assets.length, rows[0]]);

  useLayoutEffect(() => {
    const id = wantedFocus.current; if (!id) return;
    const button = [...(grid.current?.querySelectorAll<HTMLButtonElement>('.recover-button') ?? [])].find(b => b.dataset.id === id);
    if (button) { wantedFocus.current = undefined; button.focus({ preventScroll: true }); }
  });
  const focus = (index: number) => {
    const asset = assets[index]; if (!asset) return;
    wantedFocus.current = asset.id; setFocusId(asset.id);
    const scroll = viewport.current, node = grid.current;
    if (scroll && node) {
      const target = Math.floor(index / 3) * (box.height + box.gap);
      if (target < box.offset || target + box.height > box.offset + box.viewport)
        scroll.scrollTop += target - box.offset;
    }
  };
  const recoverOne = useCallback((asset: Asset, index: number) => {
    const next = assets[index + 1] ?? assets[index - 1];
    wantedFocus.current = next?.id; setFocusId(next?.id); recover(asset.id);
  }, [assets, recover]);
  return <Carousel ariaLabel="Revisar lo marcado para eliminar" draggingEnabled={false} className="review-carousel">
    <div ref={grid} className="review-grid review-window" role="list" aria-label={`${assets.length} para eliminar`} style={{ height: reviewHeight(assets.length, box.height, box.gap) }}>
      {rows.map(row => <div key={row} data-review-row={row} className="review-row" role="presentation" style={{ top: row * (box.height + box.gap) }}>
        {assets.slice(row * 3, row * 3 + 3).map((asset, column) => { const index = row * 3 + column; return <article key={asset.id} className="review-card paper" role="listitem" aria-posinset={index + 1} aria-setsize={assets.length}>
          <div className="review-photo"><ReviewPhoto key={`${asset.id}:${asset.modified ?? 0}`} asset={asset} loader={loader} open={open}/></div>
          <button className="recover-button" data-id={asset.id} onFocus={() => setFocusId(asset.id)} onBlur={e => {
            if (!e.relatedTarget || !grid.current?.contains(e.relatedTarget as Node)) setFocusId(undefined);
          }} onPointerDown={e => e.stopPropagation()} onKeyDown={e => {
            if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
            const next = index + (e.shiftKey ? -1 : 1);
            if (next >= 0 && next < assets.length) { e.preventDefault(); focus(next); }
          }} onClick={() => recoverOne(asset, index)}><ArrowCounterClockwiseIcon size={16}/>Recuperar</button>
        </article>; })}
      </div>)}
    </div>
  </Carousel>;
});
