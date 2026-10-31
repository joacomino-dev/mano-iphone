export type MediaKind = 'photo' | 'video' | 'live';
/** `bytes`: what deleting it frees (all its resources), when measured.
 * `screenshot`: screenshots and screen recordings (PhotoKit subtype).
 * `low` / `text`: on-device Vision signals (insights.ts); text 1 = document or
 * screenshot of text, .5 = text with a face (kept last in that filter).
 * `cloud`: demonstration only — behaves as if the original were in iCloud. */
export type Asset = { id: string; kind: MediaKind; date: number; width: number; height: number; duration: number; modified?: number; group?: string; hasLocation?: boolean; demo?: boolean;
  bytes?: number; screenshot?: boolean; low?: boolean; text?: number; cloud?: boolean };
export type Mark = { level: number; due: number; keptAt: number };
export type DecisionContext = { handIds: string[]; rotated: string[]; selected: string[]; group?: string; filter?: Filter };
/** `later` («Más tarde») leaves the marks untouched and moves the item to the
 * end of the pile; `wasLater` lets undo put a postponed item back where it was. */
export type Action = 'keep' | 'discard' | 'favorite' | 'later';
export type Decision = { ids: string[]; action: Action; previous: Record<string, Mark | null>; at: number; context?: DecisionContext; wasLater?: string[] };
export type RecordState = { marks: Record<string, Mark>; pending: string[]; favorites: string[]; removed: string[]; history: Decision[]; later: string[] };
export type Order = 'oldest' | 'newest' | 'largest' | 'smallest' | 'random';
/** Quick clean-up sets, combinable with every other filter. */
export type Smart = 'all' | 'later' | 'screenshots' | 'lowQuality' | 'text';
export type Filter = { seal: number | 'all' | 'none'; order: Order; media: 'all' | MediaKind; includeWaiting: boolean; dateRange?: 'all' | '24h' | '7d' | '30d' | 'custom'; from?: string; to?: string; geek?: boolean; smart?: Smart; v?: 2 };
export const ORDERS: Order[] = ['oldest', 'newest', 'largest', 'smallest', 'random'];
export const SMARTS: Smart[] = ['all', 'later', 'screenshots', 'lowQuality', 'text'];
export const LEVELS = ['Blanco', 'Rojo', 'Verde', 'Negro', 'Azul', 'Morado', 'Naranja', 'Dorado'];
export const DAYS = [7, 14, 30, 60, 120, 240, 365, Infinity];
export const initialState = (): RecordState => ({ marks: {}, pending: [], favorites: [], removed: [], history: [], later: [] });
/** Chronological by default (0.6): the person knows where they are in their roll. */
export const initialFilter: Filter = { seal: 'all', order: 'oldest', media: 'all', includeWaiting: false, smart: 'all', v: 2 };
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
    v: 2,
  };
}
export function normalizeDecisionContext(value: unknown): DecisionContext {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const ids = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((id): id is string => typeof id === 'string' && id.length > 0))] : [];
  return { handIds: ids(input.handIds), rotated: ids(input.rotated), selected: ids(input.selected),
    ...(typeof input.group === 'string' ? { group: input.group } : {}),
    ...(input.filter && typeof input.filter === 'object' ? { filter: normalizeFilter(input.filter) } : {}) };
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
export function decide(state: RecordState, ids: string[], action: Action, now = Date.now(), context?: DecisionContext): RecordState {
  const unique = [...new Set(ids)].filter(id => !state.removed.includes(id) && !state.pending.includes(id) && !state.favorites.includes(id));
  if (!unique.length) return state;
  const marks = { ...state.marks }; const previous: Decision['previous'] = {};
  for (const id of unique) {
    previous[id] = marks[id] ? { ...marks[id] } : null;
    if (action === 'keep') { const level = Math.min(8, (marks[id]?.level ?? 0) + 1);
      marks[id] = { level, keptAt: now, due: Number.isFinite(DAYS[level - 1]) ? now + DAYS[level - 1] * 86400000 : Number.MAX_SAFE_INTEGER }; }
  }
  const later = state.later ?? [];
  const wasLater = unique.filter(id => later.includes(id));
  const rest = later.filter(id => !unique.includes(id));
  return { ...state, marks, pending: action === 'discard' ? [...state.pending, ...unique] : state.pending,
    favorites: action === 'favorite' ? [...state.favorites, ...unique] : state.favorites,
    // Postponing again moves it to the very end; any other decision settles it.
    later: action === 'later' ? [...rest, ...unique] : rest,
    history: [...state.history, { ids: unique, action, previous, at: now, ...(wasLater.length ? { wasLater } : {}), ...(context ? { context: normalizeDecisionContext(context) } : {}) }].slice(-10) };
}
export function undo(state: RecordState): RecordState {
  const last = state.history.at(-1); if (!last) return state; const marks = { ...state.marks };
  for (const id of last.ids) { const previous = last.previous[id]; if (previous) marks[id] = previous; else delete marks[id]; }
  const later = (state.later ?? []).filter(id => !last.ids.includes(id));
  return { ...state, marks, history: state.history.slice(0, -1), pending: last.action === 'discard' ? state.pending.filter(id => !last.ids.includes(id)) : state.pending,
    favorites: last.action === 'favorite' ? state.favorites.filter(id => !last.ids.includes(id)) : state.favorites,
    later: [...later, ...(last.wasLater ?? [])] };
}
export function restore(state: RecordState, id: string): RecordState {
  return { ...state, pending: state.pending.filter(x => x !== id), history: state.history.map(d => ({ ...d, ids: d.ids.filter(x => x !== id) })).filter(d => d.ids.length > 0) };
}
function hash(id: string, seed: number) { let n = seed | 0; for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
/** Quick clean-up set membership (screenshots/recordings, low quality, text,
 * postponed). Vision signals arrive progressively; unanalysed items stay out. */
export function smartMatch(asset: Asset, filter: Filter, later: ReadonlySet<string>) {
  switch (filter.smart ?? 'all') {
    case 'later': return later.has(asset.id);
    case 'screenshots': return !!asset.screenshot;
    case 'lowQuality': return !!asset.low;
    case 'text': return (asset.text ?? 0) > 0;
    default: return true;
  }
}
/** The pile's membership test, shared by eligible() and the filter counts. */
function pileTest(state: RecordState, filter: Filter, now: number) {
  const excluded = new Set([...state.pending, ...state.favorites, ...state.removed]);
  const later = new Set(state.later ?? []);
  return (a: Asset) => { const mark = state.marks[a.id]; return !excluded.has(a.id)
    && (filter.media === 'all' || filter.media === a.kind)
    && matchesDate(a.date, filter, now)
    && smartMatch(a, filter, later)
    && (filter.seal === 'all' || (filter.seal === 'none' ? !mark : mark?.level === filter.seal))
    && (filter.includeWaiting || filter.seal !== 'all' || !mark || mark.due <= now); };
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
export function eligible(assets: Asset[], state: RecordState, filter: Filter, now = Date.now(), seed = 1) {
  // «Más tarde» items wait at the end of the pile, oldest postponement first,
  // unless the person opened exactly that set.
  const rank = new Map((state.later ?? []).map((id, i) => [id, i + 1]));
  const postponedLast = filter.smart !== 'later';
  return assets.filter(pileTest(state, filter, now)).sort((a, b) => {
    if (postponedLast) { const wait = (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0); if (wait) return wait; }
    if (filter.smart === 'text') { const textual = (b.text ?? 0) - (a.text ?? 0); if (textual) return textual; }
    const priority = (state.marks[a.id]?.level ?? 0) - (state.marks[b.id]?.level ?? 0);
    if (priority) return priority;
    switch (filter.order) {
      case 'random': return hash(a.id, seed) - hash(b.id, seed);
      case 'newest': return b.date - a.date;
      case 'largest': return bySize(a, b, -1) || a.date - b.date;
      case 'smallest': return bySize(a, b, 1) || a.date - b.date;
      default: return a.date - b.date;
    }
  });
}
export function nextHand(queue: Asset[], similar: boolean) {
  if (!queue.length) return []; if (!similar || !queue[0].group) return [queue[0]];
  return queue.filter(a => a.group === queue[0].group).slice(0, 7);
}
/** The hand that `first` opens: its similar group (up to 5), leaving out members
 * postponed with «Más tarde» unless the hand itself is a postponed one. */
export function handOf(queue: Asset[], first: Asset, later: readonly string[] = []) {
  if (!first.group) return [first];
  const waiting = new Set(later.includes(first.id) ? [] : later);
  return queue.filter(a => a.group === first.group && !waiting.has(a.id)).slice(0, 5);
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
  // Native enumeration excludes current favorites. A returned ID is no longer favorited,
  // and a formerly deleted ID returned by Photos has been restored by the user.
  return {...state, favorites:state.favorites.filter(id=>!present.has(id)), removed:state.removed.filter(id=>!present.has(id))};
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
  for (const raw of Array.isArray(input.history) ? input.history.slice(-10) : []) {
    if (!object(raw) || !strings(raw.ids) || !['keep','discard','favorite','later'].includes(String(raw.action)) || typeof raw.at !== 'number' || !Number.isFinite(raw.at) || !object(raw.previous)) continue;
    if (!Object.values(raw.previous).every(v => v === null || mark(v))) continue;
    const previous: Decision['previous'] = {};
    for (const id of raw.ids) { const old = raw.previous[id]; previous[id] = mark(old) ? { ...old } : null; }
    history.push({ ids: [...new Set(raw.ids)], action: raw.action as Action, at: raw.at, previous,
      ...(strings(raw.wasLater) && raw.wasLater.length ? { wasLater: [...new Set(raw.wasLater)] } : {}),
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
export function filterScope(assets: Asset[], state: RecordState, filter: Filter, now = Date.now(), decidedHere: ReadonlySet<string> = new Set()) {
  const removed = new Set(state.removed); const later = new Set(state.later ?? []);
  const inScope = assets.filter(a => !removed.has(a.id)
    && (filter.media === 'all' || filter.media === a.kind)
    && matchesDate(a.date, filter, now)
    && (decidedHere.has(a.id) || smartMatch(a, filter, later))
    && (filter.seal === 'all' || decidedHere.has(a.id) || (filter.seal === 'none' ? !state.marks[a.id] : state.marks[a.id]?.level === filter.seal)));
  const remaining = eligible(assets, state, filter, now).length;
  return { total: inScope.length, remaining, reviewed: Math.max(0, inScope.length - remaining) };
}
