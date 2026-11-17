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
import { flushSync } from 'react-dom';
import type { MotionValue } from 'motion/react';
import { frame as motionFrame, cancelFrame } from 'motion';
import { repeatedPress } from './textInteraction';

/** «Fototeca» (user, 2026-11-12; docs/ai-handoff/GRID_VIEW_PLAN.md): the whole
 * library in its real order, opened on the card in hand, with each decision's
 * small stamp. Tapping selects; holding opens one photo large; «Anclar» shows the
 * selection large to rotate through; the pile's decision bar, shrunk into the
 * bottom dock, decides the selection. Only visible rows mount; thumbnails load a few at a
 * time and are cancelled as soon as their row scrolls away. With a loaded ad, a
 * letter strip sits after every AD_EVERY rows (50: «cada 5 veces más», user
 * 2026-11-12); only the one on screen hosts it. */
const GAP = 2, OVERSCAN = 4, OVERSCAN_DELAY_MS = 100, COLUMNS_KEY = 'cocowash-grid-columns-v1', AD_EVERY = 50, AD_H = 184;
const loader = new ReviewLoader<Thumb>(4, 240);
// File references only. Keep a larger local thumbnail when a denser grid needs
// fewer pixels, rather than decoding/encoding the same photo again at that size.
const gridThumbs = new Map<string, { size: number; value: Thumb }>();
const readColumns = (): 3 | 5 => { try { return localStorage.getItem(COLUMNS_KEY) === '5' ? 5 : 3; } catch { return 3; } };
const clock = (seconds: number) => { const s = Math.max(0, Math.round(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** The front card's photo: where it is and what it shows. */
export type CardShot = { rect: DOMRect; src: string; frame?: DOMRect; paper?: string; caption?: { html: string; className: string } };
/** Two fingers on the photo (user, 2026-11-13: «que la foto se quede entre mis dedos hasta
 * que la suelte»): where they started, where they are and how far apart, relative. */
export type Hold = { x0: number; y0: number; x: number; y: number; ratio: number };
/** The pile's own Deshacer and Álbum (icon centres): the dock's buttons start there. */
export type ToolSpots = { undo?: DOMRect; album?: DOMRect };
type Rect = { left: number; top: number; width: number; height: number };
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
  /** The fingers while they hold the photo; null once they let go. */
  fingers: MotionValue<Hold | null>;
  tools?: ToolSpots;
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
  open: (asset: Asset, from: DOMRect, src?: string) => void;
  /** Anchors several items to rotate through, growing from the first one's tile. */
  openSet: (assets: Asset[], from: DOMRect, src?: string) => void;
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

const GridThumb = memo(function GridThumb({ asset, size, visible }: { asset: Asset; size: number; visible: boolean }) {
  const [thumb, setThumb] = useState<Thumb>(), [state, setState] = useState<'loading' | 'cloud' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const key = `${asset.id}:${asset.modified ?? 0}:${size}`;
  useEffect(() => {
    const identity = `${asset.id}:${asset.modified ?? 0}`, known = gridThumbs.get(identity);
    if (!retry && known && known.size >= size) { gridThumbs.delete(identity); gridThumbs.set(identity, known); setThumb(known.value); return; }
    const controller = new AbortController(); setState('loading');
    // Visible cells subscribe first; the four overscan rows remain mounted and
    // cancellable but never get ahead of the photos actually on screen.
    const start = () => {
    void loader.request(`${key}:${retry}`, signal => reviewThumbnail(asset, size, signal, retry > 0, visible), controller.signal, visible)
      .then(value => { if (!controller.signal.aborted) {
        const previous = gridThumbs.get(identity);
        if (!previous || previous.size <= size) { gridThumbs.delete(identity); gridThumbs.set(identity, { size, value }); }
        while (gridThumbs.size > 240) gridThumbs.delete(gridThumbs.keys().next().value!);
        setThumb(value);
      } })
      .catch(e => { if (!controller.signal.aborted) setState(inCloudError(e) ? 'cloud' : 'error'); });
    };
    const timer = visible ? undefined : window.setTimeout(start, OVERSCAN_DELAY_MS);
    if (visible) start();
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, visible, retry]);
  if (thumb) return <img src={thumb.src} alt="" draggable={false} decoding="async" onError={() => { gridThumbs.delete(`${asset.id}:${asset.modified ?? 0}`); loader.forget(`${key}:${retry}`); setThumb(undefined); if (!retry) setRetry(1); else setState('error'); }}/>;
  return <span className={`grid-thumb-wait is-${state}`}>{state === 'cloud' ? <CloudIcon size={18}/> : state === 'error' ? <ImageBrokenIcon size={18}/> : null}</span>;
});

const Tile = memo(function Tile({ asset, index, x, y, side, size, visible, selected, current, level, pending, favorite, later, flying }: {
  asset: Asset; index: number; x: number; y: number; side: number; size: number; selected: boolean; current: boolean; flying?: boolean;
  level: number; pending: boolean; favorite: boolean; later: boolean; visible: boolean;
}) {
  const decision = pending ? t('para eliminar') : favorite ? t('favorita') : level ? t('conservada') : '';
  const label = [asset.kind === 'video' ? t('Vídeo') : t('Foto'), new Date(asset.date).toLocaleDateString(), decision, later ? t('más tarde') : ''].filter(Boolean).join(', ');
  return <button type="button" className={`grid-tile ${selected ? 'is-selected' : ''} ${current ? 'is-current' : ''} ${pending ? 'is-pending' : ''}`}
    data-i={index} data-id={asset.id} style={{ width: side, height: side, transform: `translate(${x}px,${y}px)`, visibility: flying ? 'hidden' : undefined }}
    aria-label={label} aria-pressed={selected} aria-current={current || undefined}>
    <GridThumb asset={asset} size={size} visible={visible}/>
    {asset.kind === 'video' && <span className="grid-duration">{clock(asset.duration)}</span>}
    {(pending || favorite || level > 0) && <span className="grid-stamp">{pending ? <Stamp kind="discard"/> : favorite ? <Stamp kind="favorite"/> : <Stamp kind="keep" level={level}/>}</span>}
    {later && <span className="grid-later"><DecisionIcon kind="later" size={14}/></span>}
    {selected && <span className="grid-check"><CheckIcon size={14} weight="bold"/></span>}
  </button>;
});

export default function LibraryGrid({ assets, state, filter, filtersOn, current, busy, close, decide, undo, notice, open, openSet, enterFrom, cardFrom, ad, album, albumDone, share, reviewFrom, top, selected, setSelected, progress, scrub, release, cardTarget, fingers: grasp, tools }: Props) {
  const scroller = useRef<HTMLDivElement>(null), dock = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null), body = useRef<HTMLDivElement>(null), paper = useRef<HTMLDivElement>(null), shade = useRef<HTMLDivElement>(null), ghost = useRef<HTMLDivElement>(null), ghostImg = useRef<HTMLImageElement>(null), ghostPaper = useRef<HTMLDivElement>(null), ghostCaption = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0), [height, setHeight] = useState(0), [offset, setOffset] = useState(0);
  const geometry = useRef<{ box: DOMRect; top: number } | null>(null);
  const [columns, setColumns] = useState<3 | 5>(readColumns);
  const [settled, setSettled] = useState<3 | 5>(columns);
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
  // Deshacer and Álbum travel from the pile's tool row to the dock: offsets from rest.
  const toolShift = useRef<Record<string, { x: number; y: number }>>({});
  useLayoutEffect(() => {
    dock.current?.querySelectorAll<HTMLElement>('[data-tool]').forEach(el => {
      const from = tools?.[el.dataset.tool as keyof ToolSpots]; if (!from) return;
      el.style.translate = ''; const r = el.getBoundingClientRect();
      toolShift.current[el.dataset.tool!] = { x: from.left + from.width / 2 - (r.left + r.width / 2), y: from.top + from.height / 2 - (r.top + r.height / 2) };
    });
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
    const read = () => { geometry.current = null; setWidth(el.clientWidth); setHeight(el.clientHeight); };
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
  const refocus = useRef(true), pinchAnchor = useRef<{ id: string; y: number } | null>(null);
  useLayoutEffect(() => {
    const el = scroller.current; if (!el || !side || !refocus.current) return;
    refocus.current = false;
    // A density pinch keeps the photo under the fingers where it was (no recentring jump).
    const held = pinchAnchor.current; pinchAnchor.current = null;
    if (held) { const i = items.findIndex(a => a.id === held.id); if (i >= 0) { const top = (body.current ?? el).getBoundingClientRect().top; el.scrollTop = Math.max(0, rowY(Math.floor(i / columns)) + side / 2 - (held.y - top)); setOffset(el.scrollTop); return; } }
    const index = focusIndex(items); if (index < 0) return;
    const visible = el.clientHeight - dockHeight;
    el.scrollTop = Math.max(0, rowY(Math.floor(index / columns)) - (visible - pitch) / 2); setOffset(el.scrollTop);
  }, [pitch, columns, items]);
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
    if (ghostPaper.current) { ghostPaper.current.style.background = from?.paper ?? ''; ghostPaper.current.style.opacity = '0'; }
    if (ghostCaption.current) { ghostCaption.current.className = `grid-ghost-caption ${from?.caption?.className ?? ''}`; ghostCaption.current.innerHTML = from?.caption?.html ?? ''; }
    const tile = id ? scroller.current?.querySelector<HTMLElement>(`.grid-tile[data-id="${CSS.escape(id)}"]`) : null; if (tile && from) tile.style.visibility = 'hidden';
    setFlyingId(from ? id : undefined);
  };
  // While held, the photo stays between the fingers: scaled by their spread around where they
  // started, moved with them, turning from the card's shape to the tile's with the progress.
  // Let go and it flies from wherever it is to its tile, or back to its card.
  const lastRect = useRef<Rect | null>(null), landing = useRef<{ rect: Rect; from: number } | null>(null), heldBase = useRef<Rect | null>(null);
  const paint = (v: number) => {
    const sc = scroller.current, frame = body.current, root = section.current; if (!sc || !frame || !root || !side) return;
    const hold = grasp.get();
    if (v >= 1 && !hold) {
      if (flight.current) { const id = items[flight.current.index]?.id; const tile = id ? sc.querySelector<HTMLElement>(`.grid-tile[data-id="${CSS.escape(id)}"]`) : null; if (tile) tile.style.visibility = ''; flight.current = null; setFlyingId(undefined); }
      reached.current = true; landing.current = null; heldBase.current = null;
    }
    else if (!flight.current) {
      if (reached.current) { const date = assets.find(a => a.id === current)?.date; if (current && date !== undefined) focus.current = { id: current, date }; startFlight(cardTarget()); }
      else startFlight(cardFrom);
    }
    const bounds = geometry.current ??= { box: frame.getBoundingClientRect(), top: root.getBoundingClientRect().top };
    const zoom = 1 + .06 * (1 - v), box = bounds.box, top0 = bounds.top;
    const f = flight.current, index = f?.index ?? -1;
    // The tile's centre on screen (kept inside the visible band), the origin of the grid's zoom.
    let cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    if (index >= 0) {
      cx = box.left + (index % columns) * pitch + side / 2;
      cy = Math.max(box.top + side / 2, Math.min(box.bottom - dockHeight - side / 2, box.top + rowY(Math.floor(index / columns)) - sc.scrollTop + side / 2));
    }
    const done = v >= 1 && !hold;
    if (paper.current) paper.current.style.opacity = String(clamp01(v / .55));
    if (shade.current) shade.current.style.opacity = String(clamp01((v - .2) / .5));
    sc.style.opacity = String(clamp01((v - .04) / .56));
    sc.style.transformOrigin = `${cx - box.left}px ${cy - box.top}px`;
    sc.style.transform = done ? '' : `scale(${zoom})`;
    const chrome = clamp01((v - .35) / .5);
    root.querySelectorAll<HTMLElement>('.grid-selection,.grid-review-from').forEach(el => { el.style.opacity = done ? '' : String(chrome); el.style.translate = done ? '' : `0 ${(1 - chrome) * 8}px`; });
    // The same tools, moving: icon + label in the pile's row, a disc in the dock.
    root.querySelectorAll<HTMLElement>('[data-tool]').forEach(el => {
      const d = toolShift.current[el.dataset.tool!] ?? { x: 0, y: 0 }, disc = el.querySelector<HTMLElement>('.grid-dock-disc'), label = el.querySelector<HTMLElement>('.grid-dock-label');
      el.style.translate = done ? '' : `${(1 - v) * d.x}px ${(1 - v) * d.y}px`;
      if (disc) disc.style.opacity = done ? '' : String(clamp01((v - .15) / .6));
      if (label) label.style.opacity = done ? '0' : String(1 - clamp01(v / .4));
    });
    if (bar.current && entry.current !== null) bar.current.style.transform = `translateX(-50%) translateY(${(1 - v) * entry.current}px) scale(${mix(1, scale, v)})`;
    const g = ghost.current; if (!g) return;
    if (!f?.from || done) { g.style.display = 'none'; lastRect.current = null; return; }
    const size = side * zoom, card = f.from.rect, tile: Rect = { left: cx - size / 2, top: cy - size / 2, width: size, height: size };
    let r: Rect;
    if (hold) {
      landing.current = null;
      // Where the fingers took it: the card (way in) or the tile (way back).
      const base = heldBase.current ??= reached.current ? tile : { left: card.left, top: card.top, width: card.width, height: card.height };
      const aspect = mix(card.width / Math.max(1, card.height), 1, v), m = Math.max(side * .8, Math.max(base.width, base.height) * hold.ratio);
      const w = aspect < 1 ? m * aspect : m, h = aspect < 1 ? m : m / aspect;
      const mx = hold.x + (base.left + base.width / 2 - hold.x0) * hold.ratio, my = hold.y + (base.top + base.height / 2 - hold.y0) * hold.ratio;
      r = { left: mx - w / 2, top: my - h / 2, width: w, height: h };
    } else if (landing.current) {
      // Let go: from where it was to the tile (progress rising) or to the card (falling).
      const L = landing.current, up = v >= L.from, k = up ? clamp01((v - L.from) / Math.max(.001, 1 - L.from)) : clamp01((L.from - v) / Math.max(.001, L.from)), to = up ? tile : { left: card.left, top: card.top, width: card.width, height: card.height };
      r = { left: mix(L.rect.left, to.left, k), top: mix(L.rect.top, to.top, k), width: mix(L.rect.width, to.width, k), height: mix(L.rect.height, to.height, k) };
    } else {
      r = { left: mix(card.left, tile.left, v), top: mix(card.top, tile.top, v), width: mix(card.width, size, v), height: mix(card.height, size, v) };
    }
    lastRect.current = r;
    // The card's paper around the photo, shrinking to nothing at the tile; its caption fades.
    const sx = r.width / Math.max(1, card.width), sy = r.height / Math.max(1, card.height);
    const pf = f.from.frame, frameSize = pf ? sx * (1 - v) : 0, paperEl = ghostPaper.current, cap = ghostCaption.current;
    if (paperEl && pf) {
      const left = (card.left - pf.left) * (1 - v), above = (card.top - pf.top) * frameSize / sy;
      paperEl.style.transform = `translate(${-left}px,${-above}px) scale(${1 + (pf.width - card.width) * (1 - v) / card.width},${1 + (pf.height - card.height) * frameSize / (sy * card.height)})`;
      paperEl.style.opacity = frameSize > .02 ? '1' : '0';
    }
    if (cap && pf) { cap.style.opacity = String(clamp01(1 - v * 2.2)); cap.style.transform = `scale(1,${sx / sy})`; cap.style.width = `${card.width}px`; }
    g.style.display = 'block';
    // Fixed layout box; only transforms change while flying. Counter-scale the
    // image uniformly inside the clipping window, preserving object-fit: cover
    // even when the photograph and the target square have different proportions.
    g.style.width = `${card.width}px`; g.style.height = `${card.height}px`;
    g.style.transform = `translate(${r.left}px,${r.top - top0}px) scale(${sx},${sy})`;
    const img = ghostImg.current;
    if (img) {
      const iw = img.naturalWidth || card.width, ih = img.naturalHeight || card.height;
      const cover = Math.max(r.width / iw, r.height / ih) / Math.max(card.width / iw, card.height / ih);
      img.style.transform = `scale(${cover / sx},${cover / sy})`;
    }
    const radius = mix(2, 0, v); g.style.borderRadius = `${radius / sx}px / ${radius / sy}px`;
  };
  const painter = useRef(paint); painter.current = paint;
  const renderFlight = useCallback(() => painter.current(progress.get()), [progress]);
  const scheduleFlight = useCallback(() => { motionFrame.render(renderFlight); }, [renderFlight]);
  useEffect(() => progress.on('change', scheduleFlight), [progress, scheduleFlight]);
  // Fingers move: repaint; fingers lift: the flight lands from where the photo was.
  useEffect(() => grasp.on('change', hold => { if (!hold && lastRect.current) { landing.current = { rect: lastRect.current, from: progress.get() }; heldBase.current = null; } scheduleFlight(); }), [grasp, progress, scheduleFlight]);
  useEffect(() => () => cancelFrame(renderFlight), [renderFlight]);
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
      const ids = items.slice(from * columns, (to + 1) * columns).filter(a => {
        const known = gridThumbs.get(`${a.id}:${a.modified ?? 0}`);
        return !a.demo && (!known || known.size < size);
      }).map(a => a.id).slice(0, 240);
      // PhotoKit need not decode a second representation of a file the grid
      // already reuses. Empty also cancels obsolete work after a fast reversal.
      void Library.cacheThumbnails({ ids, size }).catch(() => {});
    }, 160);
    return () => window.clearTimeout(timer);
  }, [first, last, columns, items, size]);
  useEffect(() => () => { void Library.cacheThumbnails({ ids: [], size: 0 }).catch(() => {}); }, []);
  const frame = useRef(0);
  const onScroll = () => { if (frame.current) return; frame.current = requestAnimationFrame(() => { frame.current = 0; setOffset(scroller.current?.scrollTop ?? 0); }); };
  useEffect(() => () => { cancelAnimationFrame(frame.current); loader.cancelAll(); }, []);
  // Density: every visible photo glides and scales from where it was to where it goes.
  const lastDecision = state.history.at(-1);
  // A decision taken here presses its stamp onto the tiles on screen (user 2026-11-17: the icons
  // «solo aparecen»). Only for a new decision: never for tiles mounted by scrolling, an undo or
  // a decision from before the grid opened. Before paint, so the stamp never shows unpressed.
  const stampedAt = useRef(lastDecision?.at ?? 0);
  useLayoutEffect(() => {
    if (!lastDecision || lastDecision.at <= stampedAt.current) return;
    stampedAt.current = lastDecision.at;
    if (reduced || Date.now() - lastDecision.at > 1000) return;
    for (const id of lastDecision.ids.slice(0, 60)) {
      const tile = scroller.current?.querySelector(`.grid-tile[data-id="${CSS.escape(id)}"]`);
      const mark = tile?.querySelector<HTMLElement>(lastDecision.action === 'later' ? '.grid-later' : '.grid-stamp');
      mark?.animate([{ opacity: 0, transform: 'scale(1.7) rotate(-8deg)' }, { opacity: 1, transform: 'scale(.9) rotate(0deg)', offset: .55 }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }, [lastDecision]);
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
  // The tile's thumbnail goes with it, so the opened photo shows from its first frame.
  const tileSrc = (index: number) => scroller.current?.querySelector<HTMLImageElement>(`[data-i="${index}"] img`)?.src;
  const fingers = useRef(new Map<number, { x: number; y: number }>()), pinch = useRef<{ spread: number; ratio: number; ox: number; oy: number; mx: number; my: number; x: number; y: number; startT: number } | null>(null);
  const canvasOf = () => scroller.current?.querySelector<HTMLElement>('.grid-canvas') ?? null;
  // Density follows the fingers too: the canvas scales around them, then settles.
  const settleCanvas = () => { const c = canvasOf(); if (!c || !c.style.transform) return; const from = c.style.transform, origin = c.style.transformOrigin; c.style.transform = ''; if (!reduced) c.animate([{ transform: from, transformOrigin: origin }, { transform: 'none', transformOrigin: origin }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }); };
  // Density as one object (user, 2026-11-17: «elementos que se mueven descontrolados… se pierde la
  // ubicación de la foto que está revisando»). Choreography: the lead — the photo being reviewed
  // when it is on screen, otherwise the one under the fingers — stays where it is and only
  // changes size; the old grid and the new one are two layers carried by that one motion,
  // crossfading around it. No tile ever travels across the grid. Per frame: two transforms and
  // two opacities. The new layout is rendered once when the gesture begins (the old one stays
  // visible as a copy); letting go finishes or undoes the crossfade, then the copy is dropped.
  type Morph = { from: 3 | 5; to: 3 | 5; t: number; anchor: { id: string; y: number }; ghost: HTMLElement;
    old: { x: number; y: number; side: number }; next: { x: number; y: number; side: number }; S: number };
  const morph = useRef<Morph | null>(null), lastAnchor = useRef<string | null>(null);
  const densityFrame = useRef(0), densityEpoch = useRef(0);
  const pendingMorph = useRef<{ morph: Morph; value: number } | null>(null);
  const beginMorph = (to: 3 | 5, mx: number, my: number): Morph | null => {
    const sc = scroller.current, frame = body.current, canvas = canvasOf(); if (!sc || !frame || !canvas || !side || !width) return null;
    // The grid's frame, never the scroller (it may still be zoomed by the way in).
    const box = frame.getBoundingClientRect(), S = sc.scrollTop, view = sc.clientHeight - dockHeight;
    const centreY = (index: number) => box.top + rowY(Math.floor(index / columns)) - S + side / 2;
    const onScreen = (index: number) => { const y = centreY(index); return index >= 0 && y > box.top + side * .25 && y < box.top + view - side * .25; };
    // The lead: the photo being reviewed if it is on screen; else the last anchor if it is still
    // in the row under the fingers (round trips stay put); else the photo under the fingers.
    const working = current ? items.findIndex(a => a.id === current) : -1;
    const row = rowAt(my - box.top + S), col = Math.max(0, Math.min(columns - 1, Math.floor((mx - box.left) / pitch)));
    const kept = lastAnchor.current ? items.findIndex(a => a.id === lastAnchor.current) : -1;
    const ai = onScreen(working) ? working : kept >= 0 && Math.floor(kept / columns) === row ? kept : Math.min(items.length - 1, row * columns + col);
    const id = items[ai]?.id; if (!id) return null;
    const old = { x: box.left + (ai % columns) * pitch + side / 2, y: centreY(ai), side };
    // The old grid, as it is now, becomes a still copy on top; the real one changes layout under it.
    const ghost = canvas.cloneNode(true) as HTMLElement;
    ghost.classList.add('grid-canvas-ghost'); ghost.removeAttribute('style');
    ghost.style.cssText = `position:absolute;left:${canvas.offsetLeft}px;top:${canvas.offsetTop - S}px;width:${canvas.offsetWidth}px;height:${canvas.offsetHeight}px;pointer-events:none;z-index:2;contain:strict`;
    ghost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id')); ghost.setAttribute('aria-hidden', 'true');
    frame.appendChild(ghost);
    const m: Morph = { from: columns, to, t: 0, anchor: { id, y: old.y }, ghost, old, next: old, S };
    morph.current = m;
    pinchAnchor.current = { id, y: old.y }; refocus.current = true;
    flushSync(() => setColumns(to));
    const side2 = (width - GAP * (to - 1)) / to, S2 = sc.scrollTop;
    m.next = { x: box.left + (ai % to) * (side2 + GAP) + side2 / 2, y: box.top + (Math.floor(ai / to) * (side2 + GAP) + (ad ? Math.floor(Math.floor(ai / to) / AD_EVERY) * AD_H : 0)) - S2 + side2 / 2, side: side2 };
    paintMorph(m, 0);
    return m;
  };
  // Both layers show the lead at the same place: its box moves from where it was to where it
  // goes, and each layer is scaled and moved so that its own copy of the lead fills that box.
  const paintMorph = (m: Morph, t: number) => {
    m.t = t; const canvas = canvasOf(), box = body.current?.getBoundingClientRect(); if (!canvas || !box) return;
    const cx = mix(m.old.x, m.next.x, t), cy = mix(m.old.y, m.next.y, t), size = mix(m.old.side, m.next.side, t);
    const sc = scroller.current!;
    const place = (el: HTMLElement, lead: { x: number; y: number; side: number }, scrollTop: number) => {
      // Origin at the lead's centre in the layer's own coordinates.
      const ox = lead.x - box.left - canvas.offsetLeft, oy = lead.y - box.top - canvas.offsetTop + scrollTop;
      el.style.transformOrigin = `${ox}px ${oy}px`;
      el.style.transform = `translate(${cx - lead.x}px,${cy - lead.y}px) scale(${size / lead.side})`;
    };
    place(m.ghost, m.old, m.S);
    place(canvas, m.next, sc.scrollTop);
    // Short overlap: the new layout is ready underneath before the copy fades, so the double
    // exposure lasts only the middle of the gesture. Towards 3 columns the new layer is smaller
    // than the screen until the very end, so the copy stays longer and no bare edge shows.
    m.ghost.style.opacity = String(1 - clamp01(m.to === 3 ? (t - .5) / .45 : (t - .2) / .4));
    canvas.style.opacity = String(clamp01(t / .35));
  };
  const morphPainter = useRef(paintMorph); morphPainter.current = paintMorph;
  const renderMorph = useCallback(() => {
    const pending = pendingMorph.current; pendingMorph.current = null;
    if (pending && pending.morph === morph.current) morphPainter.current(pending.morph, pending.value);
  }, []);
  const stopDensity = () => {
    ++densityEpoch.current; cancelAnimationFrame(densityFrame.current); densityFrame.current = 0;
    cancelFrame(renderMorph); renderMorph();
  };
  useEffect(() => () => { ++densityEpoch.current; cancelAnimationFrame(densityFrame.current); cancelFrame(renderMorph); pendingMorph.current = null; morph.current?.ghost.remove(); }, [renderMorph]);
  /** Ends a crossfade at once: the new layout kept (commit) or the old one restored. */
  const closeMorph = (m: Morph, commit: boolean) => {
    morph.current = null; densityFrame.current = 0;
    const canvas = canvasOf(); if (canvas) { canvas.style.transform = ''; canvas.style.transformOrigin = ''; canvas.style.opacity = ''; }
    if (commit) {
      lastAnchor.current = m.anchor.id; setSettled(m.to); haptic('selection');
      try { localStorage.setItem(COLUMNS_KEY, String(m.to)); } catch { /* per-device convenience only */ }
    } else {
      // Back to the old layout at the old scroll: identical to the copy, then the copy goes.
      pinchAnchor.current = { id: m.anchor.id, y: m.anchor.y }; refocus.current = true;
      flushSync(() => setColumns(m.from));
    }
    m.ghost.remove();
  };
  const finishMorph = (commit: boolean) => {
    const m = morph.current; if (!m) return; stopDensity(); const epoch = densityEpoch.current;
    const from = m.t, to = commit ? 1 : 0, start = performance.now(), duration = reduced ? 0 : 140 + 200 * Math.abs(to - from);
    const done = () => { if (epoch === densityEpoch.current) closeMorph(m, commit); };
    if (!duration) { paintMorph(m, to); done(); return; }
    const step = (now: number) => { if (epoch !== densityEpoch.current) return; const q = Math.min(1, (now - start) / duration), e = 1 - Math.pow(1 - q, 3); paintMorph(m, mix(from, to, e)); if (q < 1) densityFrame.current = requestAnimationFrame(step); else done(); };
    densityFrame.current = requestAnimationFrame(step);
  };
  const endPinch = () => {
    const p = pinch.current; pinch.current = null; if (!p) return;
    if (progress.get() < 1) { settleCanvas(); finishMorph(false); grasp.set(null); release(); return; }
    if (grasp.get()) grasp.set(null); // never leave the photo held once the fingers are gone
    // Past 40 % of the way, the other density; otherwise back to this one.
    if (morph.current) finishMorph(morph.current.t > .4); else settleCanvas();
  };
  const spread = () => { const [a, b] = [...fingers.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.isPrimary) { fingers.current.clear(); pinch.current = null; }
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.current.size === 2) {
      // Take ownership of the current visual position. An older settling loop
      // must never commit its columns or overwrite the new fingers' transforms.
      stopDensity();
      // Both fingers belong to the grid until they lift: a density change re-renders the tiles
      // they went down on, and a touch captured by a removed tile would lose its release.
      for (const id of fingers.current.keys()) { try { e.currentTarget.setPointerCapture(id); } catch { /* already lifted */ } }
      const g = gesture.current; if (g) clearTimeout(g.timer); gesture.current = null;
      const [a, b] = [...fingers.current.values()], c = canvasOf()?.getBoundingClientRect();
      pinch.current = { spread: spread(), ratio: 1, ox: (a.x + b.x) / 2 - (c?.left ?? 0), oy: (a.y + b.y) / 2 - (c?.top ?? 0), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, startT: morph.current?.t ?? 0 }; return;
    }
    const index = indexAt(e.clientX, e.clientY); if (index < 0 || !e.isPrimary || progress.get() < 1) return;
    const g = { start: index, x: e.clientX, y: e.clientY, mode: 'wait' as 'wait' | 'select' | 'scroll' | 'held', adding: !selected.has(items[index].id), base: selected, timer: 0, id: e.pointerId };
    g.timer = window.setTimeout(() => { // hold: see it large
      if (gesture.current !== g || g.mode !== 'wait') return;
      g.mode = 'held'; haptic('rigid'); const rect = tileRect(index); if (rect) open(items[index], rect, tileSrc(index));
    }, 420);
    gesture.current = g;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (fingers.current.has(e.pointerId)) fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = pinch.current;
    if (p && fingers.current.size === 2) {
      const ratio = spread() / Math.max(1, p.spread), c = canvasOf(); p.ratio = ratio;
      // 3 columns, fingers apart: the photo in hand grows back into its card (user, 2026-11-13).
      const base = morph.current?.from ?? columns;
      if (base === 3 && ratio > 1 && (!morph.current || p.startT + (1 - ratio) / .4 <= 0)) {
        if (c) c.style.transform = '';
        if (morph.current) { stopDensity(); closeMorph(morph.current, false); }
        // Reversing a density gesture can keep opening the card without lifting.
        // Its new starting spread is the exact point where density reached 3.
        const boundary = 1 + p.startT * .4, cardRatio = ratio / boundary;
        p.spread *= boundary; p.startT = 0;
        const [a, b] = [...fingers.current.values()], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const h = grasp.get(); grasp.set(h ? { ...h, x: m.x, y: m.y, ratio: cardRatio } : { x0: m.x, y0: m.y, x: m.x, y: m.y, ratio: cardRatio });
        scrub(Math.min(.98, clamp01(1 - (cardRatio - 1) / .7))); return;
      }
      // Back from the card to the grid without lifting: the photo is no longer held, it lands on
      // its tile (user 2026-11-17: it stayed floating, and the dock and «Revisar en orden» froze).
      if (progress.get() < 1) { if (grasp.get()) grasp.set(null); scrub(1); }
      const [fa, fb] = [...fingers.current.values()]; p.x = (fa.x + fb.x) / 2; p.y = (fa.y + fb.y) / 2;
      // 3 → 5 as the fingers close to 0.6 of their spread; 5 → 3 as they open to 1.6.
      if (!morph.current && (base === 3 ? ratio < .98 : ratio > 1.02)) beginMorph(base === 3 ? 5 : 3, p.mx, p.my);
      if (morph.current) {
        const value = clamp01(p.startT + (base === 3 ? (1 - ratio) / .4 : (ratio - 1) / .6));
        morph.current.t = value; pendingMorph.current = { morph: morph.current, value }; motionFrame.render(renderMorph);
      }
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
  const lastTouch = useRef<{ time: number; clientX: number; clientY: number } | undefined>(undefined);
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
      if (repeatedPress(prev, touch, e.timeStamp)) e.preventDefault();
    };
    const end = (e: TouchEvent) => { const touch = e.changedTouches[0]; if (touch) lastTouch.current = { time: e.timeStamp, clientX: touch.clientX, clientY: touch.clientY }; };
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
    if (targets.length && rect) openSet(targets, rect, tileSrc(index));
  };

  const tiles = [];
  for (let row = first; row <= last; row++) for (let col = 0; col < columns; col++) {
    const index = row * columns + col, asset = items[index]; if (!asset) break;
    tiles.push(<Tile key={asset.id} asset={asset} index={index} x={col * pitch} y={rowY(row)} side={side} size={size}
      visible={rowY(row) + side > offset && rowY(row) < offset + height}
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
  useLayoutEffect(() => { scheduleFlight(); });
  return <section ref={section} className={`library-grid cols-${settled} ${flyingId ? 'is-flying' : ''}`} style={{ top }} data-count={items.length} role="region" aria-label={t('Fototeca')}>
    <div ref={paper} className="grid-paper" style={{ opacity: 0 }}/>
    <div ref={body} className="grid-body">
      <div ref={scroller} className="grid-scroller" onScroll={onScroll}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={onClick} onContextMenu={e => e.preventDefault()}>
        {items.length ? <div className={`grid-canvas cols-${columns}`} style={{ height: total }}>{tiles}{strip}</div>
          : <p className="grid-empty">{t('Nada con estos filtros.')}</p>}
      </div>
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
        <button type="button" className="grid-dock-side" data-tool="undo" onClick={() => { if (!state.history.length) { haptic('warning'); say(t('Nada que deshacer')); } else undo(); }} disabled={busy} aria-label={state.history.length ? t('Deshacer la última decisión') : t('Nada que deshacer')}><span className="grid-dock-disc" aria-hidden="true"/><ArrowUUpLeftIcon size={24} className="flip-rtl"/><span className="grid-dock-label" aria-hidden="true">{t('Deshacer')}</span></button>
        <div className="grid-dock-bar" style={{ width: barSize.width * scale, height: barSize.height * scale }}>
          <div ref={bar} className="grid-dock-scale" style={{ width: barSize.width }}>
            <DecisionBar count={count} disabled={busy} favoriteOn={false} armed=""
              onDiscard={() => void run('discard')} onFavorite={() => void run('favorite')} onKeep={() => void run('keep')}/>
          </div>
        </div>
        {album ? <button type="button" className="grid-dock-side" disabled={busy} onClick={() => { if (!count) nothing(); else album(targets.map(a => a.id)); }} aria-label={count > 1 ? t('Guardar {n} en un álbum', { n: count }) : t('Guardar en un álbum')} data-tool="album"><span className="grid-dock-disc" aria-hidden="true"/><FolderSimplePlusIcon size={24}/><span className="grid-dock-label" aria-hidden="true">{t('Álbum')}</span></button>
          : <span className="grid-dock-side" aria-hidden="true"/>}
      </div>
    <div ref={ghost} className="grid-ghost" aria-hidden="true"><div ref={ghostPaper} className="grid-ghost-paper"/><span className="grid-ghost-photo"><img ref={ghostImg} alt="" draggable={false}/></span><div ref={ghostCaption} className="grid-ghost-caption"/></div>
  </section>;
}
