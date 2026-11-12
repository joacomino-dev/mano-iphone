import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, XIcon, ArrowUUpLeftIcon, CloudIcon, ImageBrokenIcon, SquaresFourIcon, GridNineIcon } from '@phosphor-icons/react';
import type { Action, Asset, Filter, RecordState } from './domain';
import { gridMatch } from './domain';
import { ReviewLoader } from './review';
import { reviewThumbnail, inCloudError, type Thumb } from './library';
import { thumbPixels } from './preview';
import { DecisionBar } from './DecisionBar';
import { DecisionIcon, Stamp } from './Stamp';
import { CocoLoader, Deferred } from './Loader';
import { useAndroidBack } from './androidBack';
import { formatNumber, t } from './i18n';
import { haptic } from './haptics';

/** «Fototeca» (user, 2026-11-12; docs/ai-handoff/GRID_VIEW_PLAN.md): the whole
 * library in its real order, opened on the card in hand, with each decision's
 * small stamp. Tap opens one item to decide it; «Seleccionar» decides many at
 * once (tap or drag across). Only visible rows mount; thumbnails load a few at a
 * time and are cancelled as soon as their row scrolls away. */
const GAP = 2, OVERSCAN = 4, COLUMNS_KEY = 'cocowash-grid-columns-v1';
const loader = new ReviewLoader<Thumb>(4, 240);
const readColumns = (): 3 | 5 => { try { return localStorage.getItem(COLUMNS_KEY) === '5' ? 5 : 3; } catch { return 3; } };
const clock = (seconds: number) => { const s = Math.max(0, Math.round(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

type Props = {
  assets: Asset[]; state: RecordState; filter: Filter; narrowed: boolean; current?: string; busy: boolean;
  close: () => void; decide: (action: Action, ids: string[]) => Promise<boolean>; undo: () => void; notice: (text: string) => void;
};
type Marks = { pending: Set<string>; favorites: Set<string>; later: Set<string> };

const GridThumb = memo(function GridThumb({ asset, size }: { asset: Asset; size: number }) {
  const [thumb, setThumb] = useState<Thumb>(), [state, setState] = useState<'loading' | 'cloud' | 'error'>('loading');
  const key = `${asset.id}:${asset.modified ?? 0}:${size}`;
  useEffect(() => {
    const controller = new AbortController(); setState('loading');
    void loader.request(key, signal => reviewThumbnail(asset, size, signal), controller.signal)
      .then(value => { if (!controller.signal.aborted) setThumb(value); })
      .catch(e => { if (!controller.signal.aborted) setState(inCloudError(e) ? 'cloud' : 'error'); });
    return () => controller.abort();
  }, [key]);
  if (thumb) return <img src={thumb.src} alt="" draggable={false} decoding="async"/>;
  return <span className={`grid-thumb-wait is-${state}`}>{state === 'cloud' ? <CloudIcon size={18}/> : state === 'error' ? <ImageBrokenIcon size={18}/> : null}</span>;
});

const Tile = memo(function Tile({ asset, index, x, y, side, size, selecting, selected, current, level, pending, favorite, later }: {
  asset: Asset; index: number; x: number; y: number; side: number; size: number; selecting: boolean; selected: boolean; current: boolean;
  level: number; pending: boolean; favorite: boolean; later: boolean;
}) {
  const decision = pending ? t('para eliminar') : favorite ? t('favorita') : level ? t('conservada') : '';
  const label = [asset.kind === 'video' ? t('Vídeo') : t('Foto'), new Date(asset.date).toLocaleDateString(), decision, later ? t('más tarde') : ''].filter(Boolean).join(', ');
  return <button type="button" className={`grid-tile ${selected ? 'is-selected' : ''} ${current ? 'is-current' : ''} ${pending ? 'is-pending' : ''}`}
    data-i={index} style={{ width: side, height: side, transform: `translate(${x}px,${y}px)` }}
    aria-label={label} aria-pressed={selecting ? selected : undefined} aria-current={current || undefined}>
    <GridThumb asset={asset} size={size}/>
    {asset.kind === 'video' && <span className="grid-duration">{clock(asset.duration)}</span>}
    {(pending || favorite || level > 0) && <span className="grid-stamp">{pending ? <Stamp kind="discard"/> : favorite ? <Stamp kind="favorite"/> : <Stamp kind="keep" level={level}/>}</span>}
    {later && <span className="grid-later"><DecisionIcon kind="later" size={14}/></span>}
    {selecting && <span className="grid-check">{selected && <CheckIcon size={14} weight="bold"/>}</span>}
  </button>;
});

/** One item, large, with the same decisions as the pile. */
function GridPreview({ asset, close }: { asset: Asset; close: () => void }) {
  const [thumb, setThumb] = useState<Thumb>(), [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void reviewThumbnail(asset, thumbPixels(Math.max(window.innerWidth, window.innerHeight) * .8), controller.signal)
      .then(setThumb).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [asset]);
  return <div className="grid-preview" onClick={close}>
    {thumb ? <img src={thumb.src} alt="" draggable={false}/> : failed ? <ImageBrokenIcon size={34}/> : <Deferred><CocoLoader size={44}/></Deferred>}
  </div>;
}

export default function LibraryGrid({ assets, state, filter, narrowed, current, busy, close, decide, undo, notice }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0), [height, setHeight] = useState(0), [offset, setOffset] = useState(0);
  const [columns, setColumns] = useState<3 | 5>(readColumns);
  const [filtered, setFiltered] = useState(narrowed);
  const [selecting, setSelecting] = useState(false), [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [preview, setPreview] = useState<Asset | null>(null);
  useAndroidBack(true, () => { if (preview) setPreview(null); else if (selecting) { setSelecting(false); setSelected(new Set()); } else close(); });

  // Real library order (oldest first, like Photos); removed items never return here.
  const items = useMemo(() => {
    const removed = new Set(state.removed), test = filtered ? gridMatch(state, filter) : () => true;
    return assets.filter(a => !removed.has(a.id) && test(a)).sort((a, b) => a.date - b.date);
  }, [assets, state, filter, filtered]);
  const marks: Marks = useMemo(() => ({ pending: new Set(state.pending), favorites: new Set(state.favorites), later: new Set(state.later ?? []) }), [state]);

  const side = width ? (width - GAP * (columns - 1)) / columns : 0, pitch = side + GAP;
  const rows = Math.ceil(items.length / columns), total = Math.max(0, rows * pitch - GAP);
  const size = thumbPixels(side || 120);
  const first = pitch ? Math.max(0, Math.floor(offset / pitch) - OVERSCAN) : 0;
  const last = pitch ? Math.min(rows - 1, Math.ceil((offset + height) / pitch) + OVERSCAN) : -1;

  useLayoutEffect(() => {
    const el = scroller.current; if (!el) return;
    const read = () => { setWidth(el.clientWidth); setHeight(el.clientHeight); };
    read(); const observer = new ResizeObserver(read); observer.observe(el); return () => observer.disconnect();
  }, []);
  // Open on the card in hand, centred; after a density change, keep the same item on top.
  const anchor = useRef<{ id?: string; top: boolean }>({ id: current, top: false });
  useLayoutEffect(() => {
    const el = scroller.current, want = anchor.current; if (!el || !side || !want.id) return;
    const index = items.findIndex(a => a.id === want.id); anchor.current = { top: false };
    if (index < 0) return;
    const row = Math.floor(index / columns) * pitch;
    el.scrollTop = want.top ? row : Math.max(0, row - (el.clientHeight - pitch) / 2); setOffset(el.scrollTop);
  }, [pitch, columns, items]);
  const frame = useRef(0);
  const onScroll = () => { if (frame.current) return; frame.current = requestAnimationFrame(() => { frame.current = 0; setOffset(scroller.current?.scrollTop ?? 0); }); };
  useEffect(() => () => { cancelAnimationFrame(frame.current); loader.cancelAll(); }, []);
  const switchColumns = () => {
    const topIndex = pitch ? Math.min(items.length - 1, Math.floor(offset / pitch) * columns) : 0;
    anchor.current = { id: items[topIndex]?.id, top: true };
    const next = columns === 3 ? 5 : 3; setColumns(next); haptic('selection');
    try { localStorage.setItem(COLUMNS_KEY, String(next)); } catch { /* per-device convenience only */ }
  };

  // Selection: tap toggles; a horizontal drag selects (or clears) the whole range,
  // as in Photos; a vertical drag scrolls. Outside «Seleccionar», a tap opens the
  // item and a long press starts selecting from it.
  const gesture = useRef<{ start: number; x: number; y: number; mode: 'wait' | 'select' | 'scroll'; adding: boolean; base: ReadonlySet<string>; timer: number; id: number } | null>(null);
  const indexAt = (x: number, y: number) => { const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-i]'); return el ? Number(el.dataset.i) : -1; };
  const selectRange = (to: number) => {
    const g = gesture.current; if (!g || to < 0) return;
    const next = new Set(g.base);
    for (let i = Math.min(g.start, to); i <= Math.max(g.start, to); i++) { const id = items[i]?.id; if (!id) continue; if (g.adding) next.add(id); else next.delete(id); }
    setSelected(next);
  };
  const edge = useRef(0);
  const autoScroll = (y: number) => {
    const el = scroller.current; if (!el) return; const box = el.getBoundingClientRect();
    const speed = y < box.top + 56 ? -14 : y > box.bottom - 56 ? 14 : 0;
    cancelAnimationFrame(edge.current); if (!speed) return;
    const step = () => { el.scrollTop += speed; const g = gesture.current; if (g?.mode === 'select') { selectRange(indexAt(lastPoint.current.x, lastPoint.current.y)); edge.current = requestAnimationFrame(step); } };
    edge.current = requestAnimationFrame(step);
  };
  const lastPoint = useRef({ x: 0, y: 0 });
  const onPointerDown = (e: React.PointerEvent) => {
    const index = indexAt(e.clientX, e.clientY); if (index < 0 || !e.isPrimary) return;
    const id = items[index].id;
    const g = { start: index, x: e.clientX, y: e.clientY, mode: 'wait' as const, adding: !selected.has(id), base: selected, timer: 0, id: e.pointerId };
    if (!selecting) g.timer = window.setTimeout(() => { // long press: start selecting from this item
      if (gesture.current !== g || g.mode !== 'wait') return;
      haptic('medium'); setSelecting(true); setSelected(new Set([id])); gesture.current = { ...g, mode: 'select', adding: true, base: new Set() };
      scroller.current?.setPointerCapture?.(e.pointerId);
    }, 450);
    gesture.current = g;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current; if (!g || e.pointerId !== g.id) return;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (g.mode === 'wait' && Math.hypot(dx, dy) > 9) {
      clearTimeout(g.timer);
      if (selecting && Math.abs(dx) > Math.abs(dy)) { g.mode = 'select'; scroller.current?.setPointerCapture?.(e.pointerId); }
      else g.mode = 'scroll';
    }
    if (g.mode === 'select') { selectRange(indexAt(e.clientX, e.clientY)); autoScroll(e.clientY); }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current; if (!g || e.pointerId !== g.id) return;
    clearTimeout(g.timer); cancelAnimationFrame(edge.current); gesture.current = null;
    if (g.mode !== 'wait') return;
    const asset = items[g.start]; if (!asset) return;
    if (selecting) { const next = new Set(selected); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); setSelected(next); haptic('selection'); }
    else setPreview(asset);
  };
  const onPointerCancel = () => { const g = gesture.current; if (g) clearTimeout(g.timer); cancelAnimationFrame(edge.current); gesture.current = null; };
  // Keyboard and assistive technology: a real click without a pointer gesture.
  const onClick = (e: React.MouseEvent) => {
    if (e.detail !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-i]'); const asset = el ? items[Number(el.dataset.i)] : undefined; if (!asset) return;
    if (selecting) { const next = new Set(selected); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); setSelected(next); }
    else setPreview(asset);
  };

  const targets = preview ? [preview.id] : [...selected];
  const run = useCallback(async (action: Action) => {
    let ids = targets;
    if (action === 'discard') { ids = ids.filter(id => !marks.favorites.has(id)); if (ids.length < targets.length) notice(t('Las favoritas\nno se eliminan')); }
    if (!ids.length) return;
    if (await decide(action, ids)) { setSelected(new Set()); setSelecting(false); setPreview(null); }
  }, [targets, marks, decide, notice]);

  const tiles = [];
  for (let row = first; row <= last; row++) for (let col = 0; col < columns; col++) {
    const index = row * columns + col, asset = items[index]; if (!asset) break;
    tiles.push(<Tile key={asset.id} asset={asset} index={index} x={col * pitch} y={row * pitch} side={side} size={size}
      selecting={selecting} selected={selected.has(asset.id)} current={asset.id === current} level={state.marks[asset.id]?.level ?? 0}
      pending={marks.pending.has(asset.id)} favorite={marks.favorites.has(asset.id)} later={marks.later.has(asset.id)}/>);
  }

  return <section className="library-grid" role="dialog" aria-modal="true" aria-label={t('Fototeca')}>
    <header className="grid-header">
      <button type="button" className="grid-close" onClick={() => { if (preview) setPreview(null); else close(); }} aria-label={preview ? t('Cerrar') : t('Volver a las cartas')}><XIcon size={20} weight="bold"/></button>
      <button type="button" className={`grid-filter ${filtered ? 'is-on' : ''}`} role="switch" aria-checked={filtered} onClick={() => { setFiltered(v => !v); haptic('selection'); }}>
        <span className="grid-filter-dot" aria-hidden="true"/>{t('Filtros')}
      </button>
      <span className="grid-title"><strong>{t('Fototeca')}</strong><small>{formatNumber(items.length)}</small></span>
      <button type="button" className="grid-density" onClick={switchColumns} aria-label={columns === 3 ? t('Ver más pequeñas') : t('Ver más grandes')}>{columns === 3 ? <GridNineIcon size={20}/> : <SquaresFourIcon size={20}/>}</button>
      <button type="button" className="grid-select" onClick={() => { setSelecting(v => !v); setSelected(new Set()); haptic('selection'); }}>{selecting ? t('Cancelar') : t('Seleccionar')}</button>
    </header>
    <div className="grid-body">
    <div ref={scroller} className={`grid-scroller ${selecting ? 'is-selecting' : ''}`} onScroll={onScroll}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={onClick} onContextMenu={e => e.preventDefault()}>
      {items.length ? <div className="grid-canvas" style={{ height: total }}>{tiles}</div>
        : <p className="grid-empty">{t('Nada con estos filtros.')}</p>}
    </div>
    {preview && <GridPreview asset={preview} close={() => setPreview(null)}/>}
    </div>
    <div className="grid-actions">
      <p className="grid-count" aria-live="polite">{preview ? t('Decide esta foto') : selecting ? (selected.size ? t('{n} seleccionadas', { n: formatNumber(selected.size) }) : t('Toca o arrastra para seleccionar')) : t('Toca una foto para verla o mantén pulsado para seleccionar')}</p>
      <DecisionBar count={targets.length} disabled={busy || !targets.length} favoriteOn={false} armed=""
        onDiscard={() => void run('discard')} onFavorite={() => void run('favorite')} onKeep={() => void run('keep')}/>
      <footer className="archive-tools grid-tools">
        <button onClick={undo} disabled={busy || !state.history.length} aria-label={state.history.length ? t('Deshacer la última decisión') : t('Nada que deshacer')}><span className="tool-icon"><ArrowUUpLeftIcon size={24} className="flip-rtl"/></span><span className="tool-label">{t('Deshacer')}</span></button>
        <button className="later" disabled={busy || !targets.length} onClick={() => void run('later')} aria-label={targets.length > 1 ? t('Dejar {n} para más tarde', { n: targets.length }) : t('Dejar para más tarde')}><span className="tool-icon"><DecisionIcon kind="later" size={24}/></span><span className="tool-label">{t('Más tarde')}</span></button>
        <span aria-hidden="true"/>
      </footer>
    </div>
  </section>;
}
