import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { CheckIcon, ArrowUUpLeftIcon, CloudIcon, ImageBrokenIcon, FolderSimplePlusIcon, XIcon, PushPinIcon, ExportIcon, ListNumbersIcon } from '@phosphor-icons/react';
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
import type { MotionValue } from 'motion/react';

/** «Fototeca» (user, 2026-11-12; docs/ai-handoff/GRID_VIEW_PLAN.md): the whole
 * library in its real order, opened on the card in hand, with each decision's
 * small stamp. Tapping selects; holding opens one photo large; «Anclar» shows the
 * selection large to rotate through; the pile's decision bar, shrunk into the
 * bottom dock, decides the selection. Only visible rows mount; thumbnails load a few at a
 * time and are cancelled as soon as their row scrolls away. With a loaded ad, a
 * letter strip sits after every AD_EVERY rows (50: «cada 5 veces más», user
 * 2026-11-12); only the one on screen hosts it. */
const GAP = 2, OVERSCAN = 4, COLUMNS_KEY = 'cocowash-grid-columns-v1', AD_EVERY = 50, AD_H = 184;
const loader = new ReviewLoader<Thumb>(4, 240);
const readColumns = (): 3 | 5 => { try { return localStorage.getItem(COLUMNS_KEY) === '5' ? 5 : 3; } catch { return 3; } };
const clock = (seconds: number) => { const s = Math.max(0, Math.round(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** The front card's photo: where it is and what it shows. */
export type CardShot = { rect: DOMRect; src: string };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

type Props = {
  /** `filter`: the person's chosen filters; `filtersOn`: the shared Filtros switch. */
  assets: Asset[]; state: RecordState; filter: Filter; filtersOn: boolean; current?: string; busy: boolean;
  /** The grid is a mode of the main screen (user, 2026-11-13): the header, the name,
   * Filtros, Terminar and the progress row stay where they are; the grid fills the
   * room below them (`top`, the progress row's bottom edge). */
  top: number;
  /** The selection lives in the app, so it survives going back to the cards. */
  selected: ReadonlySet<string>; setSelected: Dispatch<SetStateAction<ReadonlySet<string>>>;
  /** Card ↔ grid (user, 2026-11-13): 0 is the card, 1 the grid. Fingers scrub it both
   * ways (a pinch on the card, or spreading two fingers here at 3 columns); letting go
   * springs to the nearer end (`release`). Everything here is painted from it. */
  progress: MotionValue<number>; scrub: (value: number) => void; release: () => void;
  /** The front card's photo now, for the flight back. */
  cardTarget: () => CardShot | undefined;
  /** Shares the selection (several originals in one sheet). */
  share: (ids: string[]) => void;
  /** «Revisar en orden desde esta foto»: back to the cards, filters off, from this photo. */
  reviewFrom: (asset: Asset) => void;
  /** The front card's photo when the pinch began: the working photo flies from it. */
  cardFrom?: CardShot;
  /** The animated way back to the cards (the red ✕, Android Back). */
  close: () => void; decide: (action: Action, ids: string[]) => Promise<boolean>; undo: () => void; notice: (text: string) => void;
  /** Opens the anchored view of one item, growing from its tile. */
  open: (asset: Asset, from: DOMRect) => void;
  /** Anchors several items to rotate through, growing from the first one's tile. */
  openSet: (assets: Asset[], from: DOMRect) => void;
  /** Where the pile's decision bar was, so the dock can grow out of it. */
  enterFrom?: DOMRect;
  /** The ad letter for the strip on screen; absent when no ad was loaded at opening. */
  ad?: (within: { current: HTMLElement | null }) => ReactNode;
  /** Sends the selection to the album sheet (absent on Android, which has no albums). */
  album?: (ids: string[]) => void;
  /** Bumped when an album save from the grid succeeded: the selection is done. */
  albumDone: number;
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

const Tile = memo(function Tile({ asset, index, x, y, side, size, selected, current, level, pending, favorite, later, flying }: {
  asset: Asset; index: number; x: number; y: number; side: number; size: number; selected: boolean; current: boolean; flying?: boolean;
  level: number; pending: boolean; favorite: boolean; later: boolean;
}) {
  const decision = pending ? t('para eliminar') : favorite ? t('favorita') : level ? t('conservada') : '';
  const label = [asset.kind === 'video' ? t('Vídeo') : t('Foto'), new Date(asset.date).toLocaleDateString(), decision, later ? t('más tarde') : ''].filter(Boolean).join(', ');
  return <button type="button" className={`grid-tile ${selected ? 'is-selected' : ''} ${current ? 'is-current' : ''} ${pending ? 'is-pending' : ''}`}
    data-i={index} data-id={asset.id} style={{ width: side, height: side, transform: `translate(${x}px,${y}px)`, visibility: flying ? 'hidden' : undefined }}
    aria-label={label} aria-pressed={selected} aria-current={current || undefined}>
    <GridThumb asset={asset} size={size}/>
    {asset.kind === 'video' && <span className="grid-duration">{clock(asset.duration)}</span>}
    {(pending || favorite || level > 0) && <span className="grid-stamp">{pending ? <Stamp kind="discard"/> : favorite ? <Stamp kind="favorite"/> : <Stamp kind="keep" level={level}/>}</span>}
    {later && <span className="grid-later"><DecisionIcon kind="later" size={14}/></span>}
    {selected && <span className="grid-check"><CheckIcon size={14} weight="bold"/></span>}
  </button>;
});

export default function LibraryGrid({ assets, state, filter, filtersOn, current, busy, close, decide, undo, notice, open, openSet, enterFrom, cardFrom, ad, album, albumDone, share, reviewFrom, top, selected, setSelected, progress, scrub, release, cardTarget }: Props) {
  const scroller = useRef<HTMLDivElement>(null), dock = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null), body = useRef<HTMLDivElement>(null), paper = useRef<HTMLDivElement>(null), shade = useRef<HTMLDivElement>(null), ghost = useRef<HTMLDivElement>(null), ghostImg = useRef<HTMLImageElement>(null);
  const [width, setWidth] = useState(0), [height, setHeight] = useState(0), [offset, setOffset] = useState(0);
  const [columns, setColumns] = useState<3 | 5>(readColumns);
  // Notices use the app's one centred notice (it shows above this mode).
  const say = notice;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  useAndroidBack(true, () => { if (selected.size) setSelected(new Set()); else close(); });

  // Real library order (oldest first, like Photos); removed items never return here.
  const items = useMemo(() => {
    const removed = new Set(state.removed), test = filtersOn ? gridMatch(state, filter) : () => true;
    return assets.filter(a => !removed.has(a.id) && test(a)).sort((a, b) => a.date - b.date);
  }, [assets, state, filter, filtersOn]);
  const marks: Marks = useMemo(() => ({ pending: new Set(state.pending), favorites: new Set(state.favorites), later: new Set(state.later ?? []) }), [state]);

  // The decision bar shrinks from the pile into the bottom dock (user, 2026-11-12):
  // the same bar, scaled, between Deshacer and Álbum. Photos run under the dock;
  // the canvas ends with the dock's height of plain paper, as in Photos.
  const [barSize, setBarSize] = useState({ width: Math.min(enterFrom?.width ?? 358, 380), height: 84 });
  // Two 52 px side cells and two 6 px gaps around the scaled bar, inside the grid's width.
  const scale = Math.max(.52, Math.min(.72, (Math.min(width || barSize.width, 420) - 2 * 52 - 2 * 6 - 4) / barSize.width));
  const dockHeight = barSize.height * scale + 18;
  useLayoutEffect(() => {
    const element = bar.current; if (!element) return;
    const read = () => setBarSize(previous => element.offsetHeight && (previous.height !== element.offsetHeight) ? { ...previous, height: element.offsetHeight } : previous);
    read(); const observer = new ResizeObserver(read); observer.observe(element); return () => observer.disconnect();
  }, []);
  // How far the dock's bar sits above the pile's bar, measured at rest: at 0 it is the
  // pile's bar exactly, at 1 the dock.
  const entry = useRef<number | null>(null);
  useLayoutEffect(() => {
    const element = bar.current; if (!element || !enterFrom) { entry.current = 0; return; }
    element.style.transform = 'translateX(-50%)';
    entry.current = enterFrom.bottom - element.getBoundingClientRect().bottom;
  }, []);

  const side = width ? (width - GAP * (columns - 1)) / columns : 0, pitch = side + GAP;
  const rows = Math.ceil(items.length / columns), strips = ad ? Math.max(0, Math.floor((rows - 1) / AD_EVERY)) : 0;
  // The dock's height plus the home indicator's room: the newest row clears the dock.
  const tail = dockHeight + 64;
  const total = Math.max(0, rows * pitch - GAP + strips * AD_H) + tail;
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
  // The photo being worked on (the card in hand) is the fixed point: opening, pinching
  // and switching or editing filters always centre it, or — when it is gone or
  // filtered out — the nearest photo in time, so nothing ever jumps around.
  const focus = useRef({ id: current, date: assets.find(a => a.id === current)?.date ?? Date.now() });
  const focusIndex = (list: Asset[]) => {
    if (!list.length) return -1;
    const exact = list.findIndex(a => a.id === focus.current.id); if (exact >= 0) return exact;
    let lo = 0, hi = list.length - 1; const date = focus.current.date;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].date < date) lo = mid + 1; else hi = mid; }
    return lo > 0 && Math.abs(list[lo - 1].date - date) <= Math.abs(list[lo].date - date) ? lo - 1 : lo;
  };
  const refocus = useRef(true);
  useLayoutEffect(() => {
    const el = scroller.current; if (!el || !side || !refocus.current) return;
    refocus.current = false;
    const index = focusIndex(items); if (index < 0) return;
    const visible = el.clientHeight - dockHeight;
    el.scrollTop = Math.max(0, rowY(Math.floor(index / columns)) - (visible - pitch) / 2); setOffset(el.scrollTop);
  }, [pitch, columns, items]);
  useLayoutEffect(() => {
    const before = flip.current, canvas = scroller.current?.querySelector('.grid-canvas'); flip.current = null;
    if (!before || !canvas) return;
    const box = canvas.getBoundingClientRect();
    scroller.current!.querySelectorAll<HTMLElement>('.grid-tile').forEach(el => {
      const was = before.get(el.dataset.id ?? ''), now = el.getBoundingClientRect();
      if (!was) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }); return; }
      const k = was.width / Math.max(1, now.width), dx = was.left - box.left - k * (now.left - box.left), dy = was.top - box.top - k * (now.top - box.top);
      el.animate([{ transformOrigin: '0 0', transform: `translate(${dx}px,${dy}px) scale(${k}) ${el.style.transform}` }, { transformOrigin: '0 0', transform: `translate(0px,0px) scale(1) ${el.style.transform}` }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }, [columns]);
  // The working photo between its card and its tile, painted from `progress`: the
  // grid's paper, tiles and dock come in around it while it shrinks onto its tile,
  // and the same frames run backwards on the way out. A ghost carries the photo, so
  // it changes shape (card → square) by its box, never by a stretch.
  const flight = useRef<{ from?: CardShot; index: number } | null>(null), reached = useRef(false);
  const [flyingId, setFlyingId] = useState<string>();
  const startFlight = (from: CardShot | undefined) => {
    const index = focusIndex(items); flight.current = { from, index };
    const img = ghostImg.current, id = items[index]?.id;
    if (img) img.src = from?.src || scroller.current?.querySelector<HTMLImageElement>(`.grid-tile[data-id="${CSS.escape(id ?? '')}"] img`)?.src || '';
    setFlyingId(from ? id : undefined);
  };
  const paint = (v: number) => {
    const sc = scroller.current, frame = body.current, root = section.current; if (!sc || !frame || !root || !side) return;
    if (v >= 1) { if (flight.current) { flight.current = null; setFlyingId(undefined); } reached.current = true; }
    else if (!flight.current) {
      if (reached.current) { const date = assets.find(a => a.id === current)?.date; if (current && date !== undefined) focus.current = { id: current, date }; startFlight(cardTarget()); }
      else startFlight(cardFrom);
    }
    const zoom = 1 + .06 * (1 - v), box = frame.getBoundingClientRect(), top0 = root.getBoundingClientRect().top;
    const f = flight.current, index = f?.index ?? -1;
    // The tile's centre on screen (kept inside the visible band), the origin of the grid's zoom.
    let cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    if (index >= 0) {
      cx = box.left + (index % columns) * pitch + side / 2;
      cy = Math.max(box.top + side / 2, Math.min(box.bottom - dockHeight - side / 2, box.top + rowY(Math.floor(index / columns)) - sc.scrollTop + side / 2));
    }
    if (paper.current) paper.current.style.opacity = String(clamp01(v / .5));
    if (shade.current) shade.current.style.opacity = String(clamp01(v / .5));
    sc.style.opacity = String(clamp01((v - .04) / .56));
    sc.style.transformOrigin = `${cx - box.left}px ${cy - box.top}px`;
    sc.style.transform = v >= 1 ? '' : `scale(${zoom})`;
    const chrome = clamp01((v - .35) / .5);
    root.querySelectorAll<HTMLElement>('.grid-dock-side,.grid-selection,.grid-review-from').forEach(el => { el.style.opacity = v >= 1 ? '' : String(chrome); el.style.translate = v >= 1 ? '' : `0 ${(1 - chrome) * 8}px`; });
    if (bar.current && entry.current !== null) bar.current.style.transform = `translateX(-50%) translateY(${(1 - v) * entry.current}px) scale(${mix(1, scale, v)})`;
    const g = ghost.current; if (!g) return;
    if (!f?.from || v >= 1) { g.style.display = 'none'; return; }
    const size = side * zoom, from = f.from.rect;
    const left = mix(from.left, cx - size / 2, v), top = mix(from.top, cy - size / 2, v);
    g.style.display = 'block';
    g.style.width = `${mix(from.width, size, v)}px`; g.style.height = `${mix(from.height, size, v)}px`;
    g.style.transform = `translate(${left}px,${top - top0}px)`;
    g.style.borderRadius = `${mix(2, 0, v)}px`;
  };
  const painter = useRef(paint); painter.current = paint;
  useEffect(() => progress.on('change', v => painter.current(v)), [progress]);
  // Filters edited from here apply to the grid at once (the same filters as the pile).
  const filterKey = JSON.stringify(filter) + filtersOn;
  const lastFilter = useRef(filterKey);
  if (lastFilter.current !== filterKey) { lastFilter.current = filterKey; refocus.current = true; }
  // Ask Photos to prepare the next screens in the direction of travel (iOS). Debounced.
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
  // Density: every visible photo glides and scales from where it was to where it goes.
  const flip = useRef<Map<string, DOMRect> | null>(null);
  const snapshot = () => { const map = new Map<string, DOMRect>(); scroller.current?.querySelectorAll<HTMLElement>('.grid-tile').forEach(el => { if (el.dataset.id) map.set(el.dataset.id, el.getBoundingClientRect()); }); return map; };
  const switchColumns = () => {
    if (!reduced) flip.current = snapshot();
    refocus.current = true;
    const next = columns === 3 ? 5 : 3; setColumns(next); haptic('selection');
    try { localStorage.setItem(COLUMNS_KEY, String(next)); } catch { /* per-device convenience only */ }
  };
  const lastDecision = state.history.at(-1);
  useEffect(() => { if (!lastDecision) return; setSelected(previous => lastDecision.ids.some(id => previous.has(id)) ? new Set([...previous].filter(id => !lastDecision.ids.includes(id))) : previous); }, [lastDecision]);
  const lastAlbum = useRef(albumDone);
  useEffect(() => { if (albumDone !== lastAlbum.current) { lastAlbum.current = albumDone; setSelected(new Set()); } }, [albumDone]);

  // Gestures: a tap selects or deselects; holding a photo opens it large (as on the
  // pile); a sideways drag selects the whole range (as in Photos); up/down scrolls;
  // two fingers pinch between 3 and 5 columns.
  const gesture = useRef<{ start: number; x: number; y: number; mode: 'wait' | 'select' | 'scroll' | 'held'; adding: boolean; base: ReadonlySet<string>; timer: number; id: number } | null>(null);
  const indexAt = (x: number, y: number) => { const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-i]'); return el ? Number(el.dataset.i) : -1; };
  const selectRange = (to: number) => {
    const g = gesture.current; if (!g || to < 0) return;
    const next = new Set(g.base);
    for (let i = Math.min(g.start, to); i <= Math.max(g.start, to); i++) { const id = items[i]?.id; if (!id) continue; if (g.adding) next.add(id); else next.delete(id); }
    setSelected(next);
  };
  const edge = useRef(0), lastPoint = useRef({ x: 0, y: 0 });
  const autoScroll = (y: number) => {
    const el = scroller.current; if (!el) return; const box = el.getBoundingClientRect();
    const speed = y < box.top + 56 ? -14 : y > box.bottom - dockHeight - 40 ? 14 : 0;
    cancelAnimationFrame(edge.current); if (!speed) return;
    const step = () => { el.scrollTop += speed; const g = gesture.current; if (g?.mode === 'select') { selectRange(indexAt(lastPoint.current.x, lastPoint.current.y)); edge.current = requestAnimationFrame(step); } };
    edge.current = requestAnimationFrame(step);
  };
  const tileRect = (index: number) => scroller.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.getBoundingClientRect();
  const fingers = useRef(new Map<number, { x: number; y: number }>()), pinch = useRef<{ spread: number; ratio: number; ox: number; oy: number } | null>(null);
  const canvasOf = () => scroller.current?.querySelector<HTMLElement>('.grid-canvas') ?? null;
  // Density follows the fingers too: the canvas scales around them, then settles.
  const settleCanvas = () => { const c = canvasOf(); if (!c || !c.style.transform) return; const from = c.style.transform, origin = c.style.transformOrigin; c.style.transform = ''; if (!reduced) c.animate([{ transform: from, transformOrigin: origin }, { transform: 'none', transformOrigin: origin }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }); };
  const endPinch = () => {
    const p = pinch.current; pinch.current = null; if (!p) return;
    if (progress.get() < 1) { settleCanvas(); release(); return; }
    if ((columns === 3 && p.ratio < .86) || (columns === 5 && p.ratio > 1.16)) { switchColumns(); const c = canvasOf(); if (c) c.style.transform = ''; }
    else settleCanvas();
  };
  const spread = () => { const [a, b] = [...fingers.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.isPrimary) { fingers.current.clear(); pinch.current = null; }
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.current.size === 2) {
      const g = gesture.current; if (g) clearTimeout(g.timer); gesture.current = null;
      const [a, b] = [...fingers.current.values()], c = canvasOf()?.getBoundingClientRect();
      pinch.current = { spread: spread(), ratio: 1, ox: (a.x + b.x) / 2 - (c?.left ?? 0), oy: (a.y + b.y) / 2 - (c?.top ?? 0) }; return;
    }
    const index = indexAt(e.clientX, e.clientY); if (index < 0 || !e.isPrimary || progress.get() < 1) return;
    const g = { start: index, x: e.clientX, y: e.clientY, mode: 'wait' as 'wait' | 'select' | 'scroll' | 'held', adding: !selected.has(items[index].id), base: selected, timer: 0, id: e.pointerId };
    g.timer = window.setTimeout(() => { // hold: see it large
      if (gesture.current !== g || g.mode !== 'wait') return;
      g.mode = 'held'; haptic('rigid'); const rect = tileRect(index); if (rect) open(items[index], rect);
    }, 420);
    gesture.current = g;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (fingers.current.has(e.pointerId)) fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = pinch.current;
    if (p && fingers.current.size === 2) {
      const ratio = spread() / Math.max(1, p.spread), c = canvasOf(); p.ratio = ratio;
      // 3 columns, fingers apart: the photo in hand grows back into its card (user, 2026-11-13).
      if (columns === 3 && ratio > 1) { if (c) c.style.transform = ''; scrub(clamp01(1 - (ratio - 1) / .7)); return; }
      if (progress.get() < 1) scrub(1);
      const k = columns === 3 ? Math.max(.7, ratio) : Math.min(1.45, Math.max(.95, ratio));
      if (c) { c.style.transformOrigin = `${p.ox}px ${p.oy}px`; c.style.transform = `scale(${k})`; }
      return;
    }
    const g = gesture.current; if (!g || e.pointerId !== g.id) return;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (g.mode === 'wait' && e.pointerType !== 'touch' && Math.hypot(dx, dy) > 9) {
      clearTimeout(g.timer);
      if (Math.abs(dx) > Math.abs(dy)) { g.mode = 'select'; scroller.current?.setPointerCapture?.(e.pointerId); } else g.mode = 'scroll';
    }
    if (g.mode === 'select') { selectRange(indexAt(e.clientX, e.clientY)); autoScroll(e.clientY); }
  };
  const toggle = (index: number) => { const id = items[index]?.id; if (!id) return; const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); setSelected(next); haptic('selection'); };
  const onPointerUp = (e: React.PointerEvent) => {
    fingers.current.delete(e.pointerId); if (fingers.current.size < 2) endPinch();
    const g = gesture.current; if (!g || e.pointerId !== g.id) return;
    clearTimeout(g.timer); cancelAnimationFrame(edge.current); gesture.current = null;
    if (g.mode === 'wait') toggle(g.start);
  };
  const onPointerCancel = (e: React.PointerEvent) => { fingers.current.delete(e.pointerId); endPinch(); const g = gesture.current; if (g) clearTimeout(g.timer); cancelAnimationFrame(edge.current); gesture.current = null; };
  const lastTouch = useRef<{ t: number; x: number; y: number } | null>(null);
  // Touch: WebKit only stops a scroll when the FIRST touchmove is cancelled, so the
  // direction is chosen there: sideways selects, up/down scrolls.
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    const move = (e: TouchEvent) => {
      const g = gesture.current; if (!g || e.touches.length !== 1) return;
      if (g.mode === 'select' || g.mode === 'held') { e.preventDefault(); return; }
      if (g.mode !== 'wait') return;
      const touch = e.touches[0], dx = touch.clientX - g.x, dy = touch.clientY - g.y;
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      clearTimeout(g.timer);
      if (Math.abs(dx) >= Math.abs(dy)) { g.mode = 'select'; e.preventDefault(); } else g.mode = 'scroll';
    };
    // A second quick touch in the same spot (tap, then tap and hold) must never start
    // WebKit's text loupe here: the grid handles its own touches (user, 2026-11-13).
    const start = (e: TouchEvent) => {
      const touch = e.touches[0], prev = lastTouch.current; if (!touch) return;
      if (prev && e.timeStamp - prev.t < 400 && Math.hypot(touch.clientX - prev.x, touch.clientY - prev.y) < 44) e.preventDefault();
    };
    const end = (e: TouchEvent) => { const touch = e.changedTouches[0]; if (touch) lastTouch.current = { t: e.timeStamp, x: touch.clientX, y: touch.clientY }; };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchend', end); el.removeEventListener('touchmove', move); };
  });
  // Keyboard and assistive technology: Enter/Space on a tile selects it.
  const onClick = (e: React.MouseEvent) => {
    if (e.detail !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-i]'); if (el) toggle(Number(el.dataset.i));
  };

  const targets = useMemo(() => items.filter(a => selected.has(a.id)), [items, selected]);
  const nothing = () => { haptic('warning'); say(t('No hay fotos seleccionadas')); };
  const run = useCallback(async (action: Action) => {
    let ids = targets.map(a => a.id);
    if (!ids.length) { nothing(); return; }
    if (action === 'discard') { const keep = ids.length; ids = ids.filter(id => !marks.favorites.has(id)); if (ids.length < keep) say(t('Las favoritas\nno se eliminan')); }
    if (!ids.length) return;
    if (await decide(action, ids)) setSelected(new Set());
  }, [targets, marks, decide]);
  const shareSelection = () => { if (!targets.length) { nothing(); return; } haptic('light'); share(targets.map(a => a.id)); };
  const anchorSelection = () => {
    const index = items.findIndex(a => a.id === targets[0]?.id);
    const rect = tileRect(index) ?? scroller.current?.getBoundingClientRect();
    if (targets.length && rect) openSet(targets, rect);
  };

  const tiles = [];
  for (let row = first; row <= last; row++) for (let col = 0; col < columns; col++) {
    const index = row * columns + col, asset = items[index]; if (!asset) break;
    tiles.push(<Tile key={asset.id} asset={asset} index={index} x={col * pitch} y={rowY(row)} side={side} size={size}
      selected={selected.has(asset.id)} current={asset.id === current} level={state.marks[asset.id]?.level ?? 0}
      pending={marks.pending.has(asset.id)} favorite={marks.favorites.has(asset.id)} later={marks.later.has(asset.id)} flying={asset.id === flyingId}/>);
  }
  let strip: ReactNode = null;
  if (ad && pitch) {
    let best = -1, distance = Infinity; const middle = offset + height / 2;
    for (let k = Math.max(1, Math.ceil(first / AD_EVERY)); k * AD_EVERY <= last && k * AD_EVERY < rows; k++) {
      const y = rowY(k * AD_EVERY) - AD_H, d = Math.abs(y + AD_H / 2 - middle); if (d < distance) { distance = d; best = y; }
    }
    if (best >= 0) strip = <div className="grid-ad" style={{ transform: `translateY(${best}px)`, height: AD_H }}>{ad(scroller)}</div>;
  }

  const count = targets.length;
  // Paint after every render too (first frame, scroll to the working photo, density).
  useLayoutEffect(() => { painter.current(progress.get()); });
  return <section ref={section} className={`library-grid ${flyingId ? 'is-flying' : ''}`} style={{ top }} data-count={items.length} role="region" aria-label={t('Fototeca')}>
    <div ref={paper} className="grid-paper" style={{ opacity: 0 }}/>
    <div ref={body} className="grid-body">
      <div ref={scroller} className="grid-scroller" onScroll={onScroll}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={onClick} onContextMenu={e => e.preventDefault()}>
        {items.length ? <div className="grid-canvas" style={{ height: total }}>{tiles}{strip}</div>
          : <p className="grid-empty">{t('Nada con estos filtros.')}</p>}
      </div>
      {count > 0 && <div className="grid-selection" style={{ bottom: `calc(${dockHeight + 18}px + env(safe-area-inset-bottom))` }} aria-live="polite">
        <button type="button" className="grid-selection-clear" onClick={() => { setSelected(new Set()); haptic('selection'); }} aria-label={t('Quitar la selección')}><XIcon size={16} weight="bold"/></button>
        <span>{count === 1 ? t('1 seleccionada') : t('{n} seleccionadas', { n: formatNumber(count) })}</span>
        <button type="button" className="grid-selection-anchor" onClick={anchorSelection}><PushPinIcon size={16} weight="bold"/>{t('Anclar')}</button>
        <button type="button" className="grid-selection-share" onClick={shareSelection} aria-label={count > 1 ? t('Compartir {n}', { n: formatNumber(count) }) : t('Compartir')}><ExportIcon size={18} weight="bold"/></button>
      </div>}
      {count === 1 && <button type="button" className="grid-review-from" style={{ bottom: `calc(${dockHeight + 76}px + env(safe-area-inset-bottom))` }} onClick={() => { haptic('light'); reviewFrom(targets[0]); }}><ListNumbersIcon size={16} weight="bold"/>{t('Revisar en orden desde aquí')}</button>}
      <div ref={dock} className="grid-dock" style={{ height: dockHeight }}>
        <div ref={shade} className="grid-dock-shade" style={{ opacity: 0 }}/>
        <button type="button" className="grid-dock-side" onClick={() => { if (!state.history.length) { haptic('warning'); say(t('Nada que deshacer')); } else undo(); }} disabled={busy} aria-label={state.history.length ? t('Deshacer la última decisión') : t('Nada que deshacer')}><ArrowUUpLeftIcon size={22} weight="bold" className="flip-rtl"/></button>
        <div className="grid-dock-bar" style={{ width: barSize.width * scale, height: barSize.height * scale }}>
          <div ref={bar} className="grid-dock-scale" style={{ width: barSize.width }}>
            <DecisionBar count={count} disabled={busy} favoriteOn={false} armed=""
              onDiscard={() => void run('discard')} onFavorite={() => void run('favorite')} onKeep={() => void run('keep')}/>
          </div>
        </div>
        {album ? <button type="button" className="grid-dock-side" disabled={busy} onClick={() => { if (!count) nothing(); else album(targets.map(a => a.id)); }} aria-label={count > 1 ? t('Guardar {n} en un álbum', { n: count }) : t('Guardar en un álbum')}><FolderSimplePlusIcon size={22} weight="bold"/></button>
          : <span className="grid-dock-side" aria-hidden="true"/>}
      </div>
    </div>
    <div ref={ghost} className="grid-ghost" aria-hidden="true"><img ref={ghostImg} alt="" draggable={false}/></div>
  </section>;
}
