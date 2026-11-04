import { personFilter, type BreakupMode } from './people.ts';
export type MediaKind = 'photo' | 'video' | 'live';
/** `bytes`: what deleting it frees (all its resources), when measured.
 * `screenshot`: screenshots and screen recordings (PhotoKit subtype).
 * `low` / `text`: on-device Vision signals (insights.ts); text 1 = document or
 * screenshot of text, .5 = text with a face (kept last in that filter);
 * `quality` −1…1 picks the best shot of a similar group.
 * `cloud`: demonstration only — behaves as if the original were in iCloud.
 * `favorite`: Photos says it is a favourite (native enumeration, read by
 * reconcileLibrary; the record's `favorites` is what the pile uses). */
export type Asset = { id: string; kind: MediaKind; date: number; width: number; height: number; duration: number; modified?: number; group?: string; hasLocation?: boolean; demo?: boolean;
  bytes?: number; screenshot?: boolean; low?: boolean; text?: number; quality?: number; cloud?: boolean; favorite?: boolean; people?: string[] };
export type Mark = { level: number; due: number; keptAt: number };
/** What was on the table when a decision was made, to put it back exactly on
 * undo: `handIds` in display order (front first, already rotated), the
 * selection, the filter and the group's «Mejor toma» (`best`). `rotated` is
 * only read from records written before 0.9.3, whose `handIds` were unrotated. */
export type DecisionContext = { handIds: string[]; rotated: string[]; selected: string[]; group?: string; filter?: Filter; best?: string };
/** `later` («Más tarde») leaves the marks untouched and moves the item to the
 * end of the pile; `wasLater` lets undo put a postponed item back where it was.
 * `unfavorite` only exists inside the «Favoritas» set: it takes the item out of
 * Favorites and back to the general pile (undo puts it back). */
export type Action = 'keep' | 'discard' | 'favorite' | 'later' | 'unfavorite';
export const UNDO_LIMIT = 30;
export const ACTIONS: Action[] = ['keep', 'discard', 'favorite', 'later', 'unfavorite'];
/** `laterAt`: where each postponed item stood in `later` before this decision,
 * so undo puts it back in exactly that place (not at the end). */
export type Decision = { ids: string[]; action: Action; previous: Record<string, Mark | null>; at: number; context?: DecisionContext; wasLater?: string[]; laterAt?: Record<string, number> };
export type RecordState = { marks: Record<string, Mark>; pending: string[]; favorites: string[]; removed: string[]; history: Decision[]; later: string[] };
export type Order = 'oldest' | 'newest' | 'largest' | 'smallest' | 'random';
/** Quick sets, combinable with every other filter. «favorites» is the only
 * one that shows favourites: everywhere else they stay out of the pile. */
export type Smart = 'all' | 'later' | 'screenshots' | 'lowQuality' | 'text' | 'favorites';
export type Filter = { seal: number | 'all' | 'none'; order: Order; media: 'all' | MediaKind; includeWaiting: boolean; dateRange?: 'all' | '24h' | '7d' | '30d' | 'custom'; from?: string; to?: string; geek?: boolean; smart?: Smart; person?: string; breakup?: BreakupMode; v?: 2 };
export const ORDERS: Order[] = ['oldest', 'newest', 'largest', 'smallest', 'random'];
export const SMARTS: Smart[] = ['all', 'later', 'screenshots', 'lowQuality', 'text', 'favorites'];
export const LEVELS = ['Blanco', 'Rojo', 'Verde', 'Negro', 'Azul', 'Morado', 'Naranja', 'Dorado'];
export const DAYS = [7, 14, 30, 60, 120, 240, 365, Infinity];
export const initialState = (): RecordState => ({ marks: {}, pending: [], favorites: [], removed: [], history: [], later: [] });
/** Chronological by default (0.6): the person knows where they are in their roll. */
export const initialFilter: Filter = { seal: 'all', order: 'oldest', media: 'all', includeWaiting: false, smart: 'all', v: 2 };
export function withoutPeople(filter: Filter): Filter { const { person: _person, breakup: _breakup, ...rest } = filter; return rest; }
/** Forget derived person associations while retaining every decision and hand. */
export function forgetPeople(state: RecordState): RecordState {
  return { ...state, history: state.history.map(d => d.context?.filter?.person ? { ...d, context: { ...d.context, filter: withoutPeople(d.context.filter) } } : d) };
}
export function normalizeFilter(value: unknown): Filter {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    seal: input.seal === 'all' || input.seal === 'none' || (Number.isInteger(input.seal) && Number(input.seal) >= 1 && Number(input.seal) <= 8) ? input.seal as Filter['seal'] : initialFilter.seal,
    // Before 0.6 «random» was the default nobody chose: those filters become
    // chronological once; a «random» picked in 0.6 (v: 2) is kept.
    order: ORDERS.includes(input.order as Order) && (input.v === 2 || input.order !== 'random') ? input.order as Order : initialFilter.order,
    media: ['all', 'photo', 'video', 'live'].includes(String(input.media)) ? input.media as Filter['media'] : initialFilter.media,
    includeWaiting: input.includeWaiting === true,
    dateRange: ['all', '24h', '7d', '30d', 'custom'].includes(String(input.dateRange)) ? input.dateRange as Filter['dateRange'] : 'all',
    ...(typeof input.from === 'string' ? { from: input.from } : {}),
    ...(typeof input.to === 'string' ? { to: input.to } : {}),
    geek: input.geek === true,
    smart: SMARTS.includes(input.smart as Smart) ? input.smart as Smart : 'all',
    ...personFilter(input),
    v: 2,
  };
}
export function normalizeDecisionContext(value: unknown): DecisionContext {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const ids = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((id): id is string => typeof id === 'string' && id.length > 0))] : [];
  return { handIds: ids(input.handIds), rotated: ids(input.rotated), selected: ids(input.selected),
    ...(typeof input.group === 'string' ? { group: input.group } : {}),
    ...(input.filter && typeof input.filter === 'object' ? { filter: normalizeFilter(input.filter) } : {}),
    ...(typeof input.best === 'string' && input.best ? { best: input.best } : {}) };
}
function localDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0); date.setFullYear(year, month - 1, day); date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
/** Asset.date is PhotoKit creationDate expressed in milliseconds, not modified time. */
export function matchesDate(date: number, filter: Filter, now = Date.now()): boolean {
  const range = filter.dateRange ?? 'all';
  if (range === 'all') return true;
  if (!Number.isFinite(date)) return false;
  if (range !== 'custom') {
    const duration = range === '24h' ? 86400000 : (range === '7d' ? 7 : 30) * 86400000;
    return date >= now - duration && date <= now;
  }
  const from = filter.from ? localDate(filter.from) : undefined;
  const to = filter.to ? localDate(filter.to) : undefined;
  if (from === null || to === null) return false;
  if (to) { to.setDate(to.getDate() + 1); to.setHours(0, 0, 0, 0); }
  return (!from || date >= from.getTime()) && (!to || date < to.getTime());
}
/** Which items a decision may touch. Favourites can be kept (a seal: they rest
 * in the «Favoritas» set like anywhere else), postponed or taken out of
 * Favorites, never queued for deletion nor favourited twice. */
function decidable(state: RecordState, action: Action) {
  return (id: string) => !state.removed.includes(id) && !state.pending.includes(id)
    && (action === 'unfavorite' ? state.favorites.includes(id) : action === 'keep' || action === 'later' || !state.favorites.includes(id));
}
export function decide(state: RecordState, ids: string[], action: Action, now = Date.now(), context?: DecisionContext): RecordState {
  const unique = [...new Set(ids)].filter(decidable(state, action));
  if (!unique.length) return state;
  const marks = { ...state.marks }; const previous: Decision['previous'] = {};
  for (const id of unique) {
    previous[id] = marks[id] ? { ...marks[id] } : null;
    if (action === 'keep') { const level = Math.min(8, (marks[id]?.level ?? 0) + 1);
      marks[id] = { level, keptAt: now, due: Number.isFinite(DAYS[level - 1]) ? now + DAYS[level - 1] * 86400000 : Number.MAX_SAFE_INTEGER }; }
  }
  const later = state.later ?? [];
  const wasLater = unique.filter(id => later.includes(id));
  const laterAt = Object.fromEntries(wasLater.map(id => [id, later.indexOf(id)]));
  const rest = later.filter(id => !unique.includes(id));
  return { ...state, marks, pending: action === 'discard' ? [...state.pending, ...unique] : state.pending,
    favorites: action === 'favorite' ? [...state.favorites, ...unique] : action === 'unfavorite' ? state.favorites.filter(id => !unique.includes(id)) : state.favorites,
    // Postponing again moves it to the very end; any other decision settles it.
    later: action === 'later' ? [...rest, ...unique] : rest,
    history: [...state.history, { ids: unique, action, previous, at: now, ...(wasLater.length ? { wasLater, laterAt } : {}), ...(context ? { context: normalizeDecisionContext(context) } : {}) }].slice(-UNDO_LIMIT) };
}
export function undo(state: RecordState): RecordState {
  const last = state.history.at(-1); if (!last) return state; const marks = { ...state.marks };
  for (const id of last.ids) { const previous = last.previous[id]; if (previous) marks[id] = previous; else delete marks[id]; }
  const later = (state.later ?? []).filter(id => !last.ids.includes(id));
  // Postponed items go back to the exact place they held (older records without
  // `laterAt` append them, as before).
  for (const id of [...(last.wasLater ?? [])].sort((a, b) => (last.laterAt?.[a] ?? Infinity) - (last.laterAt?.[b] ?? Infinity))) {
    const at = last.laterAt?.[id]; later.splice(typeof at === 'number' ? Math.min(at, later.length) : later.length, 0, id);
  }
  return { ...state, marks, history: state.history.slice(0, -1), pending: last.action === 'discard' ? state.pending.filter(id => !last.ids.includes(id)) : state.pending,
    favorites: last.action === 'favorite' ? state.favorites.filter(id => !last.ids.includes(id)) : last.action === 'unfavorite' ? [...new Set([...state.favorites, ...last.ids])] : state.favorites,
    later };
}
export function restore(state: RecordState, id: string): RecordState {
  return { ...state, pending: state.pending.filter(x => x !== id), history: state.history.map(d => ({ ...d, ids: d.ids.filter(x => x !== id) })).filter(d => d.ids.length > 0) };
}
function hash(id: string, seed: number) { let n = seed | 0; for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
/** Quick clean-up set membership (screenshots/recordings, low quality, text,
 * postponed). Vision signals arrive progressively; unanalysed items stay out. */
export function smartMatch(asset: Asset, filter: Filter, later: ReadonlySet<string>, favorites: ReadonlySet<string> = new Set()) {
  if (filter.person && !asset.people?.includes(filter.person)) return false;
  switch (filter.smart ?? 'all') {
    case 'later': return later.has(asset.id);
    case 'screenshots': return !!asset.screenshot;
    case 'lowQuality': return !!asset.low;
    case 'text': return (asset.text ?? 0) > 0;
    case 'favorites': return favorites.has(asset.id);
    default: return true;
  }
}
/** The pile's membership test, shared by eligible() and the filter counts.
 * Favourites only ever appear in the «Favoritas» set, which shows nothing else. */
function pileTest(state: RecordState, filter: Filter, now: number) {
  const favorites = new Set(state.favorites);
  const onlyFavorites = filter.smart === 'favorites';
  const excluded = new Set([...state.pending, ...state.removed]);
  const later = new Set(state.later ?? []);
  return (a: Asset) => { const mark = state.marks[a.id]; return !excluded.has(a.id) && favorites.has(a.id) === onlyFavorites
    && (filter.media === 'all' || filter.media === a.kind)
    && matchesDate(a.date, filter, now)
    && smartMatch(a, filter, later, favorites)
    && (filter.seal === 'all' || (filter.seal === 'none' ? !mark : mark?.level === filter.seal))
    && (filter.includeWaiting || filter.seal !== 'all' || !mark || mark.due <= now); };
}
/** «Favoritas» in the filter sheet: every favourite in the library (Photos'
 * own and those made here) within the media and date filters — the number the
 * person sees in Photos. Unlike the pile, it ignores seals and the wait after
 * «Conservar»: a favourite never stops being one. */
export function favoritesTotal(assets: Asset[], state: RecordState, filter: Filter, now = Date.now()) {
  const favorites = new Set(state.favorites), removed = new Set(state.removed); let n = 0;
  for (const a of assets) if (favorites.has(a.id) && !removed.has(a.id) && (filter.media === 'all' || filter.media === a.kind) && matchesDate(a.date, filter, now)) n++;
  return n;
}
/** How many files a filter puts in the pile, without sorting (filter sheet). */
export function pileCount(assets: Asset[], state: RecordState, filter: Filter, now = Date.now()) {
  const test = pileTest(state, filter, now); let n = 0;
  for (const a of assets) if (test(a)) n++;
  return n;
}
const bySize = (a: Asset, b: Asset, direction: 1 | -1) => {
  const x = a.bytes ?? 0, y = b.bytes ?? 0;
  if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1); // not measured yet: last
  return (x - y) * direction;
};
/** The canonical sequence: the whole library in the chosen order (stable: ties
 * keep library order). It depends only on the assets, the order and the seed,
 * so it is sorted once and reused while decisions change the record. */
export function orderAssets(assets: Asset[], order: Order, seed = 1): Asset[] {
  if (order === 'random') {
    const keys = new Map(assets.map(a => [a.id, hash(a.id, seed)]));
    return [...assets].sort((a, b) => keys.get(a.id)! - keys.get(b.id)!);
  }
  return [...assets].sort((a, b) => {
    switch (order) {
      case 'newest': return b.date - a.date;
      case 'largest': return bySize(a, b, -1) || a.date - b.date;
      case 'smallest': return bySize(a, b, 1) || a.date - b.date;
      default: return a.date - b.date;
    }
  });
}
/** The pile from an ordered sequence, in one linear pass: unsealed first, then
 * seal by seal, each in sequence order; «Más tarde» items wait at the end,
 * oldest postponement first, unless the person opened exactly that set. Same
 * result as sorting by (postponed, text, seal, order) — see domain tests. */
export function eligibleFrom(ordered: Asset[], state: RecordState, filter: Filter, now = Date.now()): Asset[] {
  const test = pileTest(state, filter, now);
  const postponedLast = filter.smart !== 'later';
  const rank = postponedLast ? new Map((state.later ?? []).map((id, i) => [id, i])) : new Map<string, number>();
  const levels: Asset[][] = []; const waiting: Asset[] = [];
  for (const a of ordered) {
    if (!test(a)) continue;
    if (rank.has(a.id)) { waiting.push(a); continue; }
    const level = state.marks[a.id]?.level ?? 0;
    (levels[level] ??= []).push(a);
  }
  let head = levels.flatMap(bucket => bucket ?? []);
  // Stable: within the same text score, the seal-then-sequence order stands.
  if (filter.smart === 'text') head = head.sort((a, b) => (b.text ?? 0) - (a.text ?? 0));
  return waiting.length ? [...head, ...waiting.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)] : head;
}
export function eligible(assets: Asset[], state: RecordState, filter: Filter, now = Date.now(), seed = 1) {
  return eligibleFrom(orderAssets(assets, filter.order, seed), state, filter, now);
}
export function nextHand(queue: Asset[], similar: boolean) {
  if (!queue.length) return []; if (!similar || !queue[0].group) return [queue[0]];
  return queue.filter(a => a.group === queue[0].group).slice(0, 7);
}
/** The hand that `first` opens: its similar group (up to 5), leaving out members
 * postponed with «Más tarde» unless the hand itself is a postponed one. Videos
 * are never stacked: a video is always a hand of its own and never joins a
 * group of photos. */
export const stackable = (a: Asset) => !!a.group && a.kind !== 'video';
export function handOf(queue: Asset[], first: Asset, later: readonly string[] = []) {
  if (!stackable(first)) return [first];
  const waiting = new Set(later.includes(first.id) ? [] : later);
  return queue.filter(a => a.group === first.group && stackable(a) && !waiting.has(a.id)).slice(0, 5);
}
export function nextSessionHand(assets: Asset[], state: RecordState, filter: Filter = initialFilter, now = Date.now(), seed = 1): Asset[] {
  const queue = eligible(assets, state, filter, now, seed);
  const first = queue[0];
  if (!first) return [];
  return handOf(queue, first, state.later);
}
export function reviewedCount(assets: Asset[], state: RecordState) {
  const decided = new Set([...Object.keys(state.marks), ...state.pending, ...state.favorites, ...state.removed]);
  return assets.filter(a => decided.has(a.id)).length;
}
export function reconcileLibrary(state: RecordState, fresh: Asset[]): RecordState {
  const present = new Set(fresh.map(a=>a.id));
  // Photos is the truth for what it returns: its favourites (made here or in
  // Photos) join the record, and a returned ID without the flag is no longer one.
  // A formerly deleted ID returned by Photos has been restored by the user.
  const favorites = [...new Set([...state.favorites.filter(id=>!present.has(id)), ...fresh.filter(a=>a.favorite).map(a=>a.id)])];
  return {...state, favorites, removed:state.removed.filter(id=>!present.has(id))};
}
export function libraryFingerprint(assets: Asset[]) {
  let n=2166136261;
  for(const a of [...assets].sort((a,b)=>a.id.localeCompare(b.id))) for(const c of `${a.id}:${a.modified??0}`) n=Math.imul(n^c.charCodeAt(0),16777619);
  return `${assets.length}:${n>>>0}`;
}
export function validateRecordState(value: unknown): RecordState | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(id => typeof id === 'string' && id.length > 0);
  const mark = (v: unknown): v is Mark => object(v) && Number.isInteger(v.level) && Number(v.level) >= 1 && Number(v.level) <= 8 && typeof v.due === 'number' && Number.isFinite(v.due) && typeof v.keptAt === 'number' && Number.isFinite(v.keptAt);
  if (!object(input.marks) || !Object.values(input.marks).every(mark) || !strings(input.pending)) return null;
  if (input.favorites !== undefined && !strings(input.favorites) || input.removed !== undefined && !strings(input.removed)) return null;
  if (input.later !== undefined && !strings(input.later)) return null;
  const history: Decision[] = [];
  for (const raw of Array.isArray(input.history) ? input.history.slice(-UNDO_LIMIT) : []) {
    if (!object(raw) || !strings(raw.ids) || !ACTIONS.includes(raw.action as Action) || typeof raw.at !== 'number' || !Number.isFinite(raw.at) || !object(raw.previous)) continue;
    if (!Object.values(raw.previous).every(v => v === null || mark(v))) continue;
    const previous: Decision['previous'] = {};
    for (const id of raw.ids) { const old = raw.previous[id]; previous[id] = mark(old) ? { ...old } : null; }
    const laterAt = object(raw.laterAt) ? Object.fromEntries(Object.entries(raw.laterAt).filter(([, v]) => Number.isInteger(v) && Number(v) >= 0)) as Record<string, number> : undefined;
    history.push({ ids: [...new Set(raw.ids)], action: raw.action as Action, at: raw.at, previous,
      ...(strings(raw.wasLater) && raw.wasLater.length ? { wasLater: [...new Set(raw.wasLater)], ...(laterAt && Object.keys(laterAt).length ? { laterAt } : {}) } : {}),
      ...(raw.context ? { context: normalizeDecisionContext(raw.context) } : {}) });
  }
  return { marks: Object.fromEntries(Object.entries(input.marks).map(([id, value]) => [id, { ...value as Mark }])), pending: [...new Set(input.pending)], favorites: [...new Set(input.favorites as string[] ?? [])], removed: [...new Set(input.removed as string[] ?? [])], history,
    later: [...new Set(input.later as string[] ?? [])] };
}
export function readState(key: string): RecordState {
  try { return validateRecordState(JSON.parse(localStorage.getItem(key) || 'null')) ?? initialState(); }
  catch { return initialState(); }
}
/** What the session counter shows: the files the active filters select (media,
 * capture date, seal), how many of them are already decided and how many remain
 * in the pile. `decidedHere` keeps items decided under a seal filter in scope
 * after their seal changes, so the count never shrinks under the person. */
export function filterScope(assets: Asset[], state: RecordState, filter: Filter, now = Date.now(), decidedHere: ReadonlySet<string> = new Set(), remaining?: number) {
  const removed = new Set(state.removed); const later = new Set(state.later ?? []); const favorites = new Set(state.favorites);
  // Favourites count only in their own set (and stay counted once decided here).
  const inScope = assets.filter(a => !removed.has(a.id) && (decidedHere.has(a.id) || favorites.has(a.id) === (filter.smart === 'favorites'))
    && (filter.media === 'all' || filter.media === a.kind)
    && matchesDate(a.date, filter, now)
    && (decidedHere.has(a.id) || smartMatch(a, filter, later, favorites))
    && (filter.seal === 'all' || decidedHere.has(a.id) || (filter.seal === 'none' ? !state.marks[a.id] : state.marks[a.id]?.level === filter.seal)));
  const left = remaining ?? eligible(assets, state, filter, now).length;
  return { total: inScope.length, remaining: left, reviewed: Math.max(0, inScope.length - left) };
}
