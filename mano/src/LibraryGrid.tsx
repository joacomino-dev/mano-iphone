import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckIcon, ArrowUUpLeftIcon, CloudIcon, ImageBrokenIcon, SquaresFourIcon, GridNineIcon, FunnelSimpleIcon, FunnelSimpleXIcon, CardsThreeIcon } from '@phosphor-icons/react';
import type { Action, Asset, Filter, RecordState } from './domain';
import { gridMatch } from './domain';
import { ReviewLoader } from './review';
import { Library, reviewThumbnail, inCloudError, type Thumb } from './library';
import { thumbPixels } from './preview';
import { DecisionBar } from './DecisionBar';
import { DecisionIcon, Stamp } from './Stamp';
import { useAndroidBack } from './androidBack';
import { formatNumber, t } from './i18n';
import { haptic } from './haptics';

/** «Fototeca» (user, 2026-11-12; docs/ai-handoff/GRID_VIEW_PLAN.md): the whole
 * library in its real order, opened on the card in hand, with each decision's
 * small stamp. Tap opens the anchored view (zoom); «Seleccionar» decides many at
 * once (tap or drag across). Only visible rows mount; thumbnails load a few at a
 * time and are cancelled as soon as their row scrolls away. With a loaded ad, a
 * letter strip sits after every AD_EVERY rows; only the one on screen hosts it. */
const GAP = 2, OVERSCAN = 4, COLUMNS_KEY = 'cocowash-grid-columns-v1', AD_EVERY = 10, AD_H = 184;
const loader = new ReviewLoader<Thumb>(4, 240);
const readColumns = (): 3 | 5 => { try { return localStorage.getItem(COLUMNS_KEY) === '5' ? 5 : 3; } catch { return 3; } };
const clock = (seconds: number) => { const s = Math.max(0, Math.round(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

type Props = {
  assets: Asset[]; state: RecordState; filter: Filter; narrowed: boolean; current?: string; busy: boolean;
  close: () => void; decide: (action: Action, ids: string[]) => Promise<boolean>; undo: () => void; notice: (text: string) => void;
  /** Opens the anchored view of one item, growing from its tile. */
  open: (asset: Asset, from: DOMRect) => void;
  /** The ad letter for the strip on screen; absent when no ad was loaded at opening. */
  ad?: (within: { current: HTMLElement | null }) => ReactNode;
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

export default function LibraryGrid({ assets, state, filter, narrowed, current, busy, close, decide, undo, notice, open, ad }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0), [height, setHeight] = useState(0), [offset, setOffset] = useState(0);
  const [columns, setColumns] = useState<3 | 5>(readColumns);
  const [filtered, setFiltered] = useState(narrowed);
  const [selecting, setSelecting] = useState(false), [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  useAndroidBack(true, () => { if (selecting) { setSelecting(false); setSelected(new Set()); } else close(); });

  // Real library order (oldest first, like Photos); removed items never return here.
  const items = useMemo(() => {
    const removed = new Set(state.removed), test = filtered ? gridMatch(state, filter) : () => true;
    return assets.filter(a => !removed.has(a.id) && test(a)).sort((a, b) => a.date - b.date);
  }, [assets, state, filter, filtered]);
  const marks: Marks = useMemo(() => ({ pending: new Set(state.pending), favorites: new Set(state.favorites), later: new Set(state.later ?? []) }), [state]);

  const side = width ? (width - GAP * (columns - 1)) / columns : 0, pitch = side + GAP;
  const rows = Math.ceil(items.length / columns), strips = ad ? Math.max(0, Math.floor((rows - 1) / AD_EVERY)) : 0;
  const total = Math.max(0, rows * pitch - GAP + strips * AD_H);
  const rowY = (row: number) => row * pitch + (ad ? Math.floor(row / AD_EVERY) * AD_H : 0);
  const rowAt = (y: number) => {
    if (!pitch) return 0; if (!ad) return Math.floor(y / pitch);
    const block = AD_EVERY * pitch + AD_H, b = Math.floor(Math.max(0, y) / block);
    return b * AD_EVERY + Math.min(AD_EVERY - 1, Math.floor((y - b * block) / pitch));
  };
  const size = thumbPixels(side || 120);
  const first = pitch ? Math.max(0, rowAt(offset) - OVERSCAN) : 0;
  const last = pitch ? Math.min(rows - 1, rowAt(offset + height) + OVERSCAN) : -1;

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
    const row = rowY(Math.floor(index / columns));
    el.scrollTop = want.top ? row : Math.max(0, row - (el.clientHeight - pitch) / 2); setOffset(el.scrollTop);
  }, [pitch, columns, items]);
  // Ask Photos to prepare the next screens in the direction of travel (iOS). Debounced:
  // a fling sends one window when it slows, not one per frame. Stopped on close.
  const travel = useRef({ offset: 0, down: true });
  useEffect(() => {
    if (!pitch || !items.length) return;
    const down = offset >= travel.current.offset; travel.current = { offset, down };
    const timer = window.setTimeout(() => {
      const screen = Math.max(1, last - first - OVERSCAN * 2);
      const from = down ? first : Math.max(0, first - screen * 2), to = down ? Math.min(rows - 1, last + screen * 2) : last;
      const ids = items.slice(from * columns, (to + 1) * columns).filter(a => !a.demo).map(a => a.id).slice(0, 240);
      if (ids.length) void Library.cacheThumbnails({ ids, size }).catch(() => {});
    }, 160);
    return () => window.clearTimeout(timer);
  }, [first, last, columns, items, size]);
  useEffect(() => () => { void Library.cacheThumbnails({ ids: [], size: 0 }).catch(() => {}); }, []);
  const frame = useRef(0);
  const onScroll = () => { if (frame.current) return; frame.current = requestAnimationFrame(() => { frame.current = 0; setOffset(scroller.current?.scrollTop ?? 0); }); };
  useEffect(() => () => { cancelAnimationFrame(frame.current); loader.cancelAll(); }, []);
  const switchColumns = () => {
    const topIndex = pitch ? Math.min(items.length - 1, rowAt(offset) * columns) : 0;
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
  // Pinch, as in Photos: fingers together → 5 columns, apart → 3.
  const fingers = useRef(new Map<number, { x: number; y: number }>()), pinch = useRef<number | null>(null);
  const spread = () => { const [a, b] = [...fingers.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const onPointerDown = (e: React.PointerEvent) => {
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.current.size === 2) { const g = gesture.current; if (g) clearTimeout(g.timer); gesture.current = null; pinch.current = spread(); return; }
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
    if (fingers.current.has(e.pointerId)) fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current !== null && fingers.current.size === 2) {
      const ratio = spread() / Math.max(1, pinch.current);
      if ((ratio < .8 && columns === 3) || (ratio > 1.25 && columns === 5)) { pinch.current = null; switchColumns(); }
      return;
    }
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
    fingers.current.delete(e.pointerId); if (fingers.current.size < 2) pinch.current = null;
    const g = gesture.current; if (!g || e.pointerId !== g.id) return;
    clearTimeout(g.timer); cancelAnimationFrame(edge.current); gesture.current = null;
    if (g.mode !== 'wait') return;
    const asset = items[g.start]; if (!asset) return;
    if (selecting) { const next = new Set(selected); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); setSelected(next); haptic('selection'); }
    else { const tile = scroller.current?.querySelector<HTMLElement>(`[data-i="${g.start}"]`); if (tile) open(asset, tile.getBoundingClientRect()); }
  };
  const onPointerCancel = (e: React.PointerEvent) => { fingers.current.delete(e.pointerId); pinch.current = null; const g = gesture.current; if (g) clearTimeout(g.timer); cancelAnimationFrame(edge.current); gesture.current = null; };
  // Keyboard and assistive technology: a real click without a pointer gesture.
  const onClick = (e: React.MouseEvent) => {
    if (e.detail !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-i]'); const asset = el ? items[Number(el.dataset.i)] : undefined; if (!asset) return;
    if (selecting) { const next = new Set(selected); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); setSelected(next); }
    else if (el) open(asset, el.getBoundingClientRect());
  };

  const targets = [...selected];
  const run = useCallback(async (action: Action) => {
    let ids = targets;
    if (action === 'discard') { ids = ids.filter(id => !marks.favorites.has(id)); if (ids.length < targets.length) notice(t('Las favoritas\nno se eliminan')); }
    if (!ids.length) return;
    if (await decide(action, ids)) { setSelected(new Set()); setSelecting(false); }
  }, [targets, marks, decide, notice]);

  const tiles = [];
  for (let row = first; row <= last; row++) for (let col = 0; col < columns; col++) {
    const index = row * columns + col, asset = items[index]; if (!asset) break;
    tiles.push(<Tile key={asset.id} asset={asset} index={index} x={col * pitch} y={rowY(row)} side={side} size={size}
      selecting={selecting} selected={selected.has(asset.id)} current={asset.id === current} level={state.marks[asset.id]?.level ?? 0}
      pending={marks.pending.has(asset.id)} favorite={marks.favorites.has(asset.id)} later={marks.later.has(asset.id)}/>);
  }

  let strip: ReactNode = null;
  if (ad && pitch) {
    let best = -1, distance = Infinity; const middle = offset + height / 2;
    for (let k = Math.max(1, Math.ceil(first / AD_EVERY)); k * AD_EVERY <= last && k * AD_EVERY < rows; k++) {
      const y = rowY(k * AD_EVERY) - AD_H, d = Math.abs(y + AD_H / 2 - middle); if (d < distance) { distance = d; best = y; }
    }
    if (best >= 0) strip = <div className="grid-ad" style={{ transform: `translateY(${best}px)`, height: AD_H }}>{ad(scroller)}</div>;
  }
  return <section className="library-grid" role="dialog" aria-modal="true" aria-label={t('Fototeca')}>
    <header className="grid-header">
      <button type="button" className={`header-action grid-filter ${filtered ? 'is-on' : ''}`} role="switch" aria-checked={filtered} aria-label={t('Filtros')} onClick={() => { setFiltered(v => !v); haptic('selection'); }}>
        {filtered ? <FunnelSimpleIcon size={18} weight="bold"/> : <FunnelSimpleXIcon size={18} weight="bold"/>}<span>{t('Filtros')}</span>
      </button>
      <h2 className="grid-title"><span>{t('Fototeca')}</span><small>{formatNumber(items.length)}</small></h2>
      <button type="button" className={`header-action grid-select ${selecting ? 'is-on' : ''}`} onClick={() => { setSelecting(v => !v); setSelected(new Set()); haptic('selection'); }}>{selecting ? t('Cancelar') : t('Seleccionar')}</button>
    </header>
    <div className="grid-body">
    <div ref={scroller} className={`grid-scroller ${selecting ? 'is-selecting' : ''}`} onScroll={onScroll}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={onClick} onContextMenu={e => e.preventDefault()}>
      {items.length ? <div className="grid-canvas" style={{ height: total }}>{tiles}{strip}</div>
        : <p className="grid-empty">{t('Nada con estos filtros.')}</p>}
    </div>
    </div>
    {selecting ? <div className="grid-actions">
      <p className="grid-count" aria-live="polite">{selected.size ? t('{n} seleccionadas', { n: formatNumber(selected.size) }) : t('Toca o arrastra para seleccionar')}</p>
      <DecisionBar count={targets.length} disabled={busy || !targets.length} favoriteOn={false} armed=""
        onDiscard={() => void run('discard')} onFavorite={() => void run('favorite')} onKeep={() => void run('keep')}/>
      <footer className="archive-tools grid-tools">
        <button onClick={undo} disabled={busy || !state.history.length} aria-label={state.history.length ? t('Deshacer la última decisión') : t('Nada que deshacer')}><span className="tool-icon"><ArrowUUpLeftIcon size={24} className="flip-rtl"/></span><span className="tool-label">{t('Deshacer')}</span></button>
        <button className="later" disabled={busy || !targets.length} onClick={() => void run('later')} aria-label={targets.length > 1 ? t('Dejar {n} para más tarde', { n: targets.length }) : t('Dejar para más tarde')}><span className="tool-icon"><DecisionIcon kind="later" size={24}/></span><span className="tool-label">{t('Más tarde')}</span></button>
        <span aria-hidden="true"/>
      </footer>
    </div> : <div className="grid-dock">
      <p className="grid-hint">{t('Mantén pulsada una foto para elegir varias.')}</p>
      <div className="grid-dock-row">
        <button type="button" className="grid-density" onClick={switchColumns} aria-label={columns === 3 ? t('Ver más pequeñas') : t('Ver más grandes')}>{columns === 3 ? <GridNineIcon size={22} weight="bold"/> : <SquaresFourIcon size={22} weight="bold"/>}</button>
        <button type="button" className="grid-back" onClick={close}><CardsThreeIcon size={22} weight="bold"/>{t('Volver a las cartas')}</button>
        {state.history.length ? <button type="button" className="grid-density" onClick={undo} disabled={busy} aria-label={t('Deshacer la última decisión')}><ArrowUUpLeftIcon size={22} weight="bold" className="flip-rtl"/></button> : <span className="grid-dock-spacer" aria-hidden="true"/>}
      </div>
    </div>}
  </section>;
}
