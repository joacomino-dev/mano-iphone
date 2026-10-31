import { useEffect, useState } from 'react';
import type { Asset } from './domain';
import { Library, demoPlace, type Place } from './library';

/** Place names stay on this iPhone: a bounded local cache keyed by asset. */
const KEY = 'cocowash-places-v1';
const memory = new Map<string, Place>();
let loaded = false;
const pending = new Map<string, Promise<Place | undefined>>();
function load() {
  if (loaded) return; loaded = true;
  try { for (const [id, place] of Object.entries(JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, Place>)) memory.set(id, place); } catch { /* empty cache */ }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries([...memory].slice(-400)))); } catch { /* cache is optional */ }
}

/** One native request in flight at a time. The card on screen jumps the line;
 * prefetched places wait behind it. Native geocoding keeps its own 1.2 s pacing,
 * so prefetching only spends the gaps between cards, never extra Apple queries
 * (each id is asked once, then cached). */
type Job = { asset: Asset; urgent: boolean; resolve: (place: Place | undefined) => void };
let queue: Job[] = [];
let running = false;
function pump() {
  if (running) return;
  const job = queue.shift();
  if (!job) return;
  running = true;
  Library.place({ id: job.asset.id }).then(({ retry, ...place }) => {
    if (!retry) { memory.delete(job.asset.id); memory.set(job.asset.id, place); persist(); }
    job.resolve(place);
  }).catch(() => job.resolve({})).finally(() => { pending.delete(job.asset.id); running = false; pump(); });
}
function lookup(asset: Asset, urgent: boolean): Promise<Place | undefined> {
  load();
  if (asset.demo) return Promise.resolve(demoPlace(asset));
  const cached = memory.get(asset.id);
  if (cached) return Promise.resolve(cached);
  const waiting = pending.get(asset.id);
  if (waiting) {
    // Already waiting in line: move it to the front if it is now on screen.
    if (urgent) { const index = queue.findIndex(j => j.asset.id === asset.id); if (index >= 0) { queue[index].urgent = true; if (index > 0) queue.unshift(...queue.splice(index, 1)); } }
    return waiting;
  }
  const request = new Promise<Place | undefined>(resolve => { const job = { asset, urgent, resolve }; if (urgent) queue.unshift(job); else queue.push(job); });
  pending.set(asset.id, request);
  pump();
  return request;
}
/** The next cards of the review window. Prefetches no longer in the window are
 * dropped before they are asked; a card on screen (urgent) is never dropped. */
export function prefetchPlaces(assets: Asset[]) {
  load();
  const wanted = new Set(assets.map(a => a.id));
  queue = queue.filter(job => { if (job.urgent || wanted.has(job.asset.id)) return true; pending.delete(job.asset.id); job.resolve(undefined); return false; });
  for (const asset of assets) if (asset.hasLocation && !asset.demo && !memory.has(asset.id) && !pending.has(asset.id)) void lookup(asset, false);
}
/** Undefined until known; assets without capture location never ask. */
export function usePlace(asset: Asset | undefined, wanted: boolean): Place | undefined {
  const [place, setPlace] = useState<Place | undefined>(() => asset && wanted && asset.hasLocation ? memory.get(asset.id) ?? (asset.demo ? demoPlace(asset) : undefined) : undefined);
  useEffect(() => {
    if (!asset || !wanted || !asset.hasLocation) { setPlace(undefined); return; }
    let alive = true;
    setPlace(memory.get(asset.id) ?? (asset.demo ? demoPlace(asset) : undefined));
    void lookup(asset, true).then(value => { if (alive) setPlace(value); });
    return () => { alive = false; };
  }, [asset?.id, wanted, asset?.hasLocation]);
  return place;
}
