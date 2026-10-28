export type MediaKind = 'photo' | 'video' | 'live';
export type Asset = { id: string; kind: MediaKind; date: number; width: number; height: number; duration: number; modified?: number; group?: string; demo?: boolean };
export type Mark = { level: number; due: number; keptAt: number };
export type Decision = { ids: string[]; action: 'keep' | 'discard' | 'favorite'; previous: Record<string, Mark | null>; at: number };
export type RecordState = { marks: Record<string, Mark>; pending: string[]; favorites: string[]; removed: string[]; history: Decision[] };
export type Filter = { seal: number | 'all' | 'none'; order: 'oldest' | 'newest' | 'random'; media: 'all' | MediaKind; includeWaiting: boolean };
export const LEVELS = ['Blanco', 'Rojo', 'Verde', 'Negro', 'Azul', 'Morado', 'Naranja', 'Dorado'];
export const DAYS = [7, 14, 30, 60, 120, 240, 365, Infinity];
export const initialState = (): RecordState => ({ marks: {}, pending: [], favorites: [], removed: [], history: [] });
export const initialFilter: Filter = { seal: 'all', order: 'oldest', media: 'all', includeWaiting: false };
export function decide(state: RecordState, ids: string[], action: Decision['action'], now = Date.now()): RecordState {
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
    history: [...state.history, { ids: unique, action, previous, at: now }].slice(-150) };
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
export function readState(key: string): RecordState {
  try { const s = JSON.parse(localStorage.getItem(key) || 'null');
    if (!s || typeof s.marks !== 'object' || !Array.isArray(s.pending)) return initialState();
    return { ...initialState(), ...s, history: Array.isArray(s.history) ? s.history : [] };
  } catch { return initialState(); }
}
