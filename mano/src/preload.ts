import { eligible, handOf, initialFilter, type Asset, type Filter, type RecordState } from './domain.ts';

/** Flatten the actual upcoming hands, rather than preloading unrelated queue neighbours. */
export function upcomingSessionAssets(assets: Asset[], state: RecordState, filter: Filter = initialFilter, now = Date.now(), seed = 1, limit = 10): Asset[] {
  let queue = eligible(assets, state, filter, now, seed);
  const result: Asset[] = [];
  const seen = new Set<string>();
  const count = Math.max(0, Math.floor(limit));
  while (queue.length && result.length < count) {
    const first = queue[0];
    const hand = handOf(queue, first, state.later);
    const ids = new Set(hand.map(a => a.id));
    for (const asset of hand) if (!seen.has(asset.id) && result.length < count) { seen.add(asset.id); result.push(asset); }
    queue = queue.filter(a => !ids.has(a.id));
  }
  return result;
}

export type PreloadStatus = 'queued' | 'loading' | 'ready' | 'error';
export type PreloadItem<T> = { id: string; status: PreloadStatus; value?: T; error?: string };
export type PreloadSnapshot<T> = { items: PreloadItem<T>[]; total: number; ready: number; failed: number; loading: number; completed: number };
type Entry<T> = PreloadItem<T> & { asset: Asset; key: string };
type Task = { controller: AbortController; session: string };
const assetKey = (asset: Asset) => JSON.stringify([asset.id, asset.modified ?? 0, asset.kind]);

/** Two preparation calls at a time, including calls still settling after cancellation.
 * The supplied preparer should honour signal and bound native/iCloud request duration.
 * Failed items remain individually retryable; one rejection never rejects the queue.
 */
export class AssetPreloader<T> {
  private entries = new Map<string, Entry<T>>();
  private active = new Map<string, Task>();
  private cache = new Map<string, T>();
  private listeners = new Set<(snapshot: PreloadSnapshot<T>) => void>();
  private session = '';
  private disposed = false;
  private readonly prepare: (asset: Asset, signal: AbortSignal) => Promise<T>;

  constructor(prepare: (asset: Asset, signal: AbortSignal) => Promise<T>) { this.prepare = prepare; }

  update(assets: Asset[], sessionKey = 'default') {
    if (this.disposed) return;
    const changedSession = this.session !== sessionKey;
    this.session = sessionKey;
    const previous = this.entries;
    this.entries = new Map();
    for (const asset of assets.slice(0, 10)) {
      const key = assetKey(asset);
      if (this.entries.has(key)) continue;
      const old = !changedSession ? previous.get(key) : undefined;
      this.entries.set(key, this.cache.has(key)
        ? { id: asset.id, asset, key, status: 'ready', value: this.cache.get(key)! }
        : old ? { ...old, asset } : { id: asset.id, asset, key, status: 'queued' });
    }
    for (const [key, task] of this.active) if (changedSession || !this.entries.has(key)) task.controller.abort();
    this.pump();
    this.emit();
  }

  snapshot(): PreloadSnapshot<T> {
    const items = [...this.entries.values()].map(({ id, status, value, error }) => ({ id, status, value, error }));
    const ready = items.filter(i => i.status === 'ready').length;
    const failed = items.filter(i => i.status === 'error').length;
    return { items, total: items.length, ready, failed, loading: items.filter(i => i.status === 'loading').length, completed: ready + failed };
  }

  subscribe(listener: (snapshot: PreloadSnapshot<T>) => void) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => { this.listeners.delete(listener); };
  }

  get(asset: Asset): T | undefined { return this.cache.get(assetKey(asset)); }

  /** Drop references before the owner releases/evicts a native resource. If the
   * asset is still wanted, prepare it again; a later window must never reuse it.
   */
  forget(asset: Asset) {
    if (this.disposed) return;
    const key = assetKey(asset);
    this.cache.delete(key);
    const entry = this.entries.get(key);
    if (!entry) this.active.get(key)?.controller.abort();
    else if (entry.status === 'ready') {
      entry.status = 'queued'; delete entry.value; delete entry.error;
      this.pump(); this.emit();
    }
  }

  retry(asset: Asset) {
    const entry = this.entries.get(assetKey(asset));
    if (!entry || entry.status !== 'error' || this.disposed) return;
    entry.status = 'queued'; delete entry.error;
    this.pump(); this.emit();
  }

  dispose() {
    this.disposed = true;
    for (const task of this.active.values()) task.controller.abort();
    this.entries.clear(); this.cache.clear(); this.listeners.clear();
  }

  private emit() {
    if (this.disposed) return;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  private pump() {
    if (this.disposed) return;
    for (const entry of this.entries.values()) {
      if (this.active.size >= 2) break;
      if (entry.status !== 'queued' || this.active.has(entry.key)) continue;
      const task = { controller: new AbortController(), session: this.session };
      this.active.set(entry.key, task); entry.status = 'loading';
      void Promise.resolve().then(() => {
        if (task.controller.signal.aborted) throw new Error('Preparation cancelled');
        return this.prepare(entry.asset, task.controller.signal);
      }).then(value => {
        if (!this.isCurrent(entry.key, task)) return;
        this.cache.delete(entry.key); this.cache.set(entry.key, value);
        // Values are local resource references, with a bounded in-memory cache.
        while (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value!);
        const current = this.entries.get(entry.key)!;
        current.status = 'ready'; current.value = value; delete current.error;
      }).catch(error => {
        if (!this.isCurrent(entry.key, task)) return;
        const current = this.entries.get(entry.key)!;
        current.status = 'error'; current.error = error instanceof Error ? error.message : 'No se pudo preparar el archivo';
      }).finally(() => {
        this.active.delete(entry.key);
        if (this.disposed) return;
        this.pump(); this.emit();
      });
    }
  }

  private isCurrent(key: string, task: Task) {
    return !this.disposed && !task.controller.signal.aborted && task.session === this.session && this.active.get(key) === task && this.entries.has(key);
  }
}
