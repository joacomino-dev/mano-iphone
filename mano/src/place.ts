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
function lookup(asset: Asset): Promise<Place | undefined> {
  load();
  if (asset.demo) return Promise.resolve(demoPlace(asset));
  const cached = memory.get(asset.id);
  if (cached) return Promise.resolve(cached);
  const running = pending.get(asset.id);
  if (running) return running;
  const request = Library.place({ id: asset.id }).then(({ retry, ...place }) => {
    if (!retry) { memory.delete(asset.id); memory.set(asset.id, place); persist(); }
    return place;
  }).catch(() => undefined).finally(() => pending.delete(asset.id));
  pending.set(asset.id, request);
  return request;
}
/** Undefined until known; assets without capture location never ask. */
export function usePlace(asset: Asset | undefined, wanted: boolean): Place | undefined {
  const [place, setPlace] = useState<Place | undefined>(() => asset && wanted && asset.hasLocation ? memory.get(asset.id) ?? (asset.demo ? demoPlace(asset) : undefined) : undefined);
  useEffect(() => {
    if (!asset || !wanted || !asset.hasLocation) { setPlace(undefined); return; }
    let alive = true;
    setPlace(memory.get(asset.id) ?? (asset.demo ? demoPlace(asset) : undefined));
    void lookup(asset).then(value => { if (alive) setPlace(value); });
    return () => { alive = false; };
  }, [asset?.id, wanted, asset?.hasLocation]);
  return place;
}
