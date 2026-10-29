export type MediaKind = 'photo' | 'video' | 'live';
export type Asset = { id: string; kind: MediaKind; date: number; width: number; height: number; duration: number; modified?: number; group?: string; demo?: boolean };
export type Mark = { level: number; due: number; keptAt: number };
export type DecisionContext = { handIds: string[]; rotated: string[]; selected: string[]; group?: string; filter?: Filter };
export type Decision = { ids: string[]; action: 'keep' | 'discard' | 'favorite'; previous: Record<string, Mark | null>; at: number; context?: DecisionContext };
export type RecordState = { marks: Record<string, Mark>; pending: string[]; favorites: string[]; removed: string[]; history: Decision[] };
export type Filter = { seal: number | 'all' | 'none'; order: 'oldest' | 'newest' | 'random'; media: 'all' | MediaKind; includeWaiting: boolean; dateRange?: 'all' | '24h' | '7d' | '30d' | 'custom'; from?: string; to?: string; geek?: boolean };
export const LEVELS = ['Blanco', 'Rojo', 'Verde', 'Negro', 'Azul', 'Morado', 'Naranja', 'Dorado'];
export const DAYS = [7, 14, 30, 60, 120, 240, 365, Infinity];
export const initialState = (): RecordState => ({ marks: {}, pending: [], favorites: [], removed: [], history: [] });
export const initialFilter: Filter = { seal: 'all', order: 'random', media: 'all', includeWaiting: false };
export function normalizeFilter(value: unknown): Filter {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    seal: input.seal === 'all' || input.seal === 'none' || (Number.isInteger(input.seal) && Number(input.seal) >= 1 && Number(input.seal) <= 8) ? input.seal as Filter['seal'] : initialFilter.seal,
    order: ['oldest', 'newest', 'random'].includes(String(input.order)) ? input.order as Filter['order'] : initialFilter.order,
    media: ['all', 'photo', 'video', 'live'].includes(String(input.media)) ? input.media as Filter['media'] : initialFilter.media,
    includeWaiting: input.includeWaiting === true,
    dateRange: ['all', '24h', '7d', '30d', 'custom'].includes(String(input.dateRange)) ? input.dateRange as Filter['dateRange'] : 'all',
    ...(typeof input.from === 'string' ? { from: input.from } : {}),
    ...(typeof input.to === 'string' ? { to: input.to } : {}),
    geek: input.geek === true,
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
export function decide(state: RecordState, ids: string[], action: Decision['action'], now = Date.now(), context?: DecisionContext): RecordState {
  const unique = [...new Set(ids)].filter(id => !state.removed.includes(id) && !state.pending.includes(id) && !state.favorites.includes(id));
  if (!unique.length) return state;
  const marks = { ...state.marks }; const previous: Decision['previous'] = {};
  for (const id of unique) {
    previous[id] = marks[id] ? { ...marks[id] } : null;
    if (action === 'keep') { const level = Math.min(8, (marks[id]?.level ?? 0) + 1);
      marks[id] = { level, keptAt: now, due: Number.isFinite(DAYS[level - 1]) ? now + DAYS[level - 1] * 86400000 : Number.MAX_SAFE_INTEGER }; }
  }
  return { ...state, marks, pending: action === 'discard' ? [...state.pending, ...unique] : state.pending,
    favorites: action === 'favorite' ? [...state.favorites, ...unique] : state.favorites,
    history: [...state.history, { ids: unique, action, previous, at: now, ...(context ? { context: normalizeDecisionContext(context) } : {}) }].slice(-10) };
}
export function undo(state: RecordState): RecordState {
  const last = state.history.at(-1); if (!last) return state; const marks = { ...state.marks };
  for (const id of last.ids) { const previous = last.previous[id]; if (previous) marks[id] = previous; else delete marks[id]; }
  return { ...state, marks, history: state.history.slice(0, -1), pending: last.action === 'discard' ? state.pending.filter(id => !last.ids.includes(id)) : state.pending,
    favorites: last.action === 'favorite' ? state.favorites.filter(id => !last.ids.includes(id)) : state.favorites };
}
export function restore(state: RecordState, id: string): RecordState {
  return { ...state, pending: state.pending.filter(x => x !== id), history: state.history.map(d => ({ ...d, ids: d.ids.filter(x => x !== id) })).filter(d => d.ids.length > 0) };
}
function hash(id: string, seed: number) { let n = seed | 0; for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
export function eligible(assets: Asset[], state: RecordState, filter: Filter, now = Date.now(), seed = 1) {
  const excluded = new Set([...state.pending, ...state.favorites, ...state.removed]);
  return assets.filter(a => { const mark = state.marks[a.id]; return !excluded.has(a.id)
    && (filter.media === 'all' || filter.media === a.kind)
    && matchesDate(a.date, filter, now)
    && (filter.seal === 'all' || (filter.seal === 'none' ? !mark : mark?.level === filter.seal))
    && (filter.includeWaiting || filter.seal !== 'all' || !mark || mark.due <= now);
  }).sort((a, b) => { const priority = (state.marks[a.id]?.level ?? 0) - (state.marks[b.id]?.level ?? 0);
    if (priority) return priority;
    return filter.order === 'random' ? hash(a.id, seed) - hash(b.id, seed) : filter.order === 'newest' ? b.date - a.date : a.date - b.date; });
}
export function nextHand(queue: Asset[], similar: boolean) {
  if (!queue.length) return []; if (!similar || !queue[0].group) return [queue[0]];
  return queue.filter(a => a.group === queue[0].group).slice(0, 7);
}
export function nextSessionHand(assets: Asset[], state: RecordState, filter: Filter = initialFilter, now = Date.now(), seed = 1): Asset[] {
  const queue = eligible(assets, state, filter, now, seed);
  const first = queue[0];
  if (!first) return [];
  return first.group ? queue.filter(a => a.group === first.group).slice(0, 5) : [first];
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
  const history: Decision[] = [];
  for (const raw of Array.isArray(input.history) ? input.history.slice(-10) : []) {
    if (!object(raw) || !strings(raw.ids) || !['keep','discard','favorite'].includes(String(raw.action)) || typeof raw.at !== 'number' || !Number.isFinite(raw.at) || !object(raw.previous)) continue;
    if (!Object.values(raw.previous).every(v => v === null || mark(v))) continue;
    const previous: Decision['previous'] = {};
    for (const id of raw.ids) { const old = raw.previous[id]; previous[id] = mark(old) ? { ...old } : null; }
    history.push({ ids: [...new Set(raw.ids)], action: raw.action as Decision['action'], at: raw.at, previous,
      ...(raw.context ? { context: normalizeDecisionContext(raw.context) } : {}) });
  }
  return { marks: Object.fromEntries(Object.entries(input.marks).map(([id, value]) => [id, { ...value as Mark }])), pending: [...new Set(input.pending)], favorites: [...new Set(input.favorites as string[] ?? [])], removed: [...new Set(input.removed as string[] ?? [])], history };
}
export function readState(key: string): RecordState {
  try { return validateRecordState(JSON.parse(localStorage.getItem(key) || 'null')) ?? initialState(); }
  catch { return initialState(); }
}
