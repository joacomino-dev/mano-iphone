import { SessionWriter, validateSession, type ActiveSession } from './session.ts';
import { queueFavorites, type PendingFavorites } from './favoritePending.ts';
import { initialFilter, initialState, validateRecordState } from './domain.ts';

export const FAVORITES_KEY = 'cocowash-android-favorites-v1';
export const IN_FLIGHT_KEY = 'cocowash-android-favorites-inflight-v1';
export type NativeIntent = { kind: 'favorite' | 'album' | 'delete'; ids: string[]; started: number };
export type JournalEntry = {
  version: 1; revision: number; session: string;
  favorites: PendingFavorites; inFlight: PendingFavorites; intent?: NativeIntent;
};
export interface JournalBackend {
  read(key: string): Promise<unknown>;
  /** null: overwrite (the in-memory entry is newer after a degraded write). */
  write(key: string, entry: JournalEntry, expectedRevision: number | null): Promise<void>;
  /** Drop a lost connection (iOS suspends WebView storage in the background). */
  reconnect?(): Promise<void>;
}
export const STORAGE_FAILURE = 'No se pudo guardar el progreso. Libera espacio antes de continuar.';
export const INTERRUPTED_OPERATION = 'Una operación de Fotos quedó interrumpida. Comprueba su resultado en Fotos antes de volver a intentarla. Tus decisiones guardadas se conservan.';

function validFavorites(value: unknown): value is PendingFavorites {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(v => typeof v === 'boolean');
}
function validateEntry(raw: unknown): JournalEntry {
  const value = raw as JournalEntry;
  if (!value || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 1 ||
      typeof value.session !== 'string' || !validFavorites(value.favorites) || !validFavorites(value.inFlight)) throw new Error(STORAGE_FAILURE);
  const session = validateSession(JSON.parse(value.session));
  if (!session?.record) throw new Error(STORAGE_FAILURE);
  if (value.intent && (!['favorite', 'album', 'delete'].includes(value.intent.kind) || !Array.isArray(value.intent.ids) ||
      !value.intent.ids.every(id => typeof id === 'string') || !Number.isFinite(value.intent.started))) throw new Error(STORAGE_FAILURE);
  return value;
}

/** One serial journal owns decisions, Android intents and native-operation intent.
 * A rejected write never changes its acknowledged snapshot. No request-success ack. */
export class SessionJournal {
  private tail: Promise<unknown> = Promise.resolve();
  private degraded = false;
  private writer = new SessionWriter();
  readonly key: string;
  private backend: JournalBackend;
  private entry: JournalEntry;
  private constructor(key: string, backend: JournalBackend, entry: JournalEntry) { this.key=key;this.backend=backend;this.entry=entry; }
  static async open(key: string, backend: JournalBackend, fallback: () => { session: ActiveSession; favorites: PendingFavorites; inFlight: PendingFavorites }) {
    const raw = await backend.read(key);
    if (raw !== undefined) return new SessionJournal(key, backend, validateEntry(raw));
    const initial = fallback();
    const writer = new SessionWriter();
    const entry: JournalEntry = { version: 1, revision: 1, session: JSON.stringify(writer.prepare(initial.session)), favorites: initial.favorites, inFlight: initial.inFlight };
    await backend.write(key, entry, 0);
    return new SessionJournal(key, backend, entry);
  }
  get session(): ActiveSession { return validateSession(JSON.parse(this.entry.session))!; }
  get snapshot(): Readonly<JournalEntry> { return structuredClone(this.entry); }
  private update(change: (current: JournalEntry) => JournalEntry): Promise<void> {
    const run = async () => {
      const next = change(structuredClone(this.entry));
      next.revision = this.entry.revision + 1;
      // Never surfaced to the person (user, 2026-11-08): a lost connection is
      // reopened and retried; if storage still refuses, the newest state stays in
      // memory and in the localStorage mirror below, and the next write retries
      // with an overwrite. Decisions are never blocked by a storage error.
      const expected = this.degraded ? null : this.entry.revision;
      try { await this.backend.write(this.key, next, expected); this.degraded = false; }
      catch {
        try { await this.backend.reconnect?.(); await this.backend.write(this.key, next, null); this.degraded = false; }
        catch { this.degraded = true; }
      }
      this.entry = next;
      // Compatibility mirrors are best-effort, never the commit acknowledgement.
      try {
        localStorage.setItem(this.key, next.session);
        if (this.key === 'cocowash-library-session-v1') {
          if(Object.keys(next.favorites).length)localStorage.setItem(FAVORITES_KEY, JSON.stringify(next.favorites));else localStorage.removeItem(FAVORITES_KEY);
          if(Object.keys(next.inFlight).length)localStorage.setItem(IN_FLIGHT_KEY, JSON.stringify(next.inFlight));else localStorage.removeItem(IN_FLIGHT_KEY);
        }
      } catch { /* The journal remains authoritative, including after quota errors. */ }
    };
    const result = this.tail.then(run, run);
    this.tail = result;
    return result;
  }
  save(session: ActiveSession, options?: { favorite?: { ids: string[]; value: boolean }; clearIntent?: boolean }): Promise<void> {
    const serialized = JSON.stringify(this.writer.prepare(session));
    return this.update(current => ({ ...current, session: serialized,
      favorites: options?.favorite ? queueFavorites(current.favorites, options.favorite.ids, options.favorite.value, current.inFlight) : current.favorites,
      ...(options?.clearIntent ? { intent: undefined } : {}) }));
  }
  queues(change: (pending: PendingFavorites, inFlight: PendingFavorites) => { favorites: PendingFavorites; inFlight: PendingFavorites }) {
    return this.update(current => ({ ...current, ...change(current.favorites, current.inFlight) }));
  }
  intent(value?: NativeIntent) { return this.update(current => ({ ...current, intent: value })); }
}

/** Revision check and write share one transaction. strict is a durability hint;
 * native force-stop tests remain required on each WebView implementation. */
export async function openIndexedDB(factory: IDBFactory = indexedDB): Promise<JournalBackend> {
  const connect = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open('cocowash-decisions-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sessions');
    request.onerror = () => reject(new Error(STORAGE_FAILURE));
    request.onblocked = () => reject(new Error(STORAGE_FAILURE));
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  });
  let db = await connect();
  return {
    reconnect: async () => { try { db.close(); } catch { /* already lost */ } db = await connect(); },
    read: key => new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const request = tx.objectStore('sessions').get(key);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(new Error(STORAGE_FAILURE));
    }),
    write: (key, entry, expected) => new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite', { durability: 'strict' });
      const store = tx.objectStore('sessions');
      const previous = store.get(key);
      previous.onsuccess = () => {
        if (expected !== null && (previous.result?.revision ?? 0) !== expected) { tx.abort(); return; }
        store.put(entry, key);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error(STORAGE_FAILURE));
    })
  };
}

let current: SessionJournal | undefined;
export function activeJournal(key?: string) { return !key || current?.key === key ? current : undefined; }
export async function initializeJournal(key: string, fallback: Parameters<typeof SessionJournal.open>[2]) {
  current = await SessionJournal.open(key, await openIndexedDB(), fallback);
  return current;
}
export function legacyFavorites(key: string): PendingFavorites {
  const raw = localStorage.getItem(key);
  if (!raw) return {};
  const value: unknown = JSON.parse(raw);
  if (!validFavorites(value)) throw new Error(STORAGE_FAILURE);
  return value;
}

/** Migration runs only if no journal exists. Read/parse failures must not erase a
 * pre-journal session by replacing it with an apparently empty new library. */
export function migrateSession(key: string, legacyKey: string, storage: Pick<Storage,'getItem'> = localStorage): ActiveSession {
  const canonical = storage.getItem(key);
  const saved = canonical === null ? null : validateSession(JSON.parse(canonical));
  if (canonical !== null && !saved) throw new Error(STORAGE_FAILURE);
  let record = saved?.record;
  if (!record) {
    const legacy = storage.getItem(legacyKey);
    record = legacy === null ? initialState() : validateRecordState(JSON.parse(legacy)) ?? undefined;
    if (!record) throw new Error(STORAGE_FAILURE);
  }
  return { ...(saved ?? { version:1,active:false,seed:Math.floor(Math.random()*100000),filter:initialFilter,
    context:{handIds:[],rotated:[],selected:[]},updatedAt:Date.now() }),record };
}
