import { useEffect, useMemo, useRef, useState } from 'react';
import type { Asset } from './domain';
import { Library } from './library';
import { categorize, qualityOf, validInsight } from './insights';
import { IndexState } from './index-state';

export type Flags = { low: boolean; text: number; quality: number };
export type LibraryIndex = {
  /** Bumps whenever sizes or flags grow; use it as a memo dependency. */
  version: number;
  sizes: ReadonlyMap<string, number>; flags: ReadonlyMap<string, Flags>;
  sized: number; analyzed: number; photos: number;
  measuring: boolean; analyzing: boolean;
};

const SIZE_CHUNK = 200, VISION_CHUNK = 120;
/** Vision results reach the pile at most this often: each bump re-sorts it. */
const VISION_REFRESH_MS = 4000;
/** Weights reach the pile at most this often while they are being measured. */
const SIZE_REFRESH_MS = 1500;

/** The library's weight and clean-up signals, measured on the iPhone in the
 * background once the library is open: weights first (originals on the iPhone,
 * public API; iCloud-only ones stay unknown),
 * then Vision over photos, oldest first, a chunk at a time. Native caches make
 * later launches near instant. Vision pauses while the similar-photo search,
 * a warm-up or loading runs, and resumes where it stopped. Nothing is sent
 * anywhere; a missing native method just leaves the sets empty. */
export function useLibraryIndex(assets: Asset[], fingerprint: string, enabled: boolean, paused: boolean): LibraryIndex {
  const [index] = useState(() => new IndexState<Flags>());
  const sizes = { current: index.sizes }, flags = { current: index.flags };
  // Reconcile before enrichment can read stale data from an edited/deleted ID.
  useMemo(() => index.reconcile(assets), [index, assets]);
  const generation = index.generation;
  const latest = useRef(assets); latest.current = assets;
  const [version, setVersion] = useState(0);
  const [measuring, setMeasuring] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sized, setSized] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true; setSized(false);
    void (async () => {
      // Videos first: they weigh the most and the VHS shows their weight.
      const ids = [...latest.current].sort((a, b) => Number(b.kind === 'video') - Number(a.kind === 'video')).map(a => a.id).filter(id => !sizes.current.has(id));
      if (ids.length) setMeasuring(true);
      // Each bump re-enriches the library and refreshes the pile: the first
      // chunk shows at once, the rest at most every SIZE_REFRESH_MS.
      let shown = -Infinity, pending = false;
      try {
        for (let i = 0; i < ids.length && alive; i += SIZE_CHUNK) {
          const { sizes: chunk } = await Library.sizes({ ids: ids.slice(i, i + SIZE_CHUNK), flush: i + SIZE_CHUNK >= ids.length });
          if (!alive || generation !== index.generation) return;
          for (const [id, bytes] of Object.entries(chunk)) if (index.accepts(generation,id) && Number.isFinite(bytes) && bytes > 0) { sizes.current.set(id, bytes); pending = true; }
          if (pending && performance.now() - shown > SIZE_REFRESH_MS) { shown = performance.now(); pending = false; setVersion(v => v + 1); }
        }
      } catch { /* unavailable: the weights measured so far still show */ }
      finally { if (alive) { if (pending) setVersion(v => v + 1); setMeasuring(false); setSized(true); } }
    })();
    return () => { alive = false; };
  }, [enabled, fingerprint, generation]);

  useEffect(() => {
    if (!enabled || !sized || paused) return;
    let alive = true;
    void (async () => {
      const ids = latest.current.filter(a => a.kind !== 'video' && !flags.current.has(a.id)).map(a => a.id);
      if (!ids.length) return;
      setAnalyzing(true);
      let shown = performance.now(), pending = false;
      try {
        for (let i = 0; i < ids.length && alive; i += VISION_CHUNK) {
          const result = await Library.classify({ ids: ids.slice(i, i + VISION_CHUNK), flush: i + VISION_CHUNK >= ids.length });
          if (!alive || result.cancelled) return;
          if (generation !== index.generation) return;
          for (const [id, insight] of Object.entries(result.results)) if (index.accepts(generation,id) && validInsight(insight)) { flags.current.set(id, { ...categorize(insight), quality: qualityOf(insight) }); pending = true; }
          if (pending && performance.now() - shown > VISION_REFRESH_MS) { shown = performance.now(); pending = false; setVersion(v => v + 1); }
        }
      } catch { /* unavailable: clean-up sets stay empty */ }
      finally { if (alive) { if (pending) setVersion(v => v + 1); setAnalyzing(false); } }
    })();
    return () => { alive = false; setAnalyzing(false); void Library.cancelClassify().catch(() => {}); };
  }, [enabled, sized, paused, fingerprint, generation]);

  const photos = assets.reduce((n, a) => n + (a.kind === 'video' ? 0 : 1), 0);
  return { version, sizes: sizes.current, flags: flags.current, sized: sizes.current.size, analyzed: Math.min(photos, flags.current.size), photos, measuring, analyzing };
}

/** Library assets with their measured weight and clean-up flags. */
export function enrich(assets: Asset[], index: Pick<LibraryIndex, 'sizes' | 'flags'>): Asset[] {
  if (!index.sizes.size && !index.flags.size) return assets;
  return assets.map(a => {
    const bytes = index.sizes.get(a.id), flag = index.flags.get(a.id);
    return bytes === undefined && !flag ? a : { ...a, ...(bytes !== undefined ? { bytes } : {}), ...(flag ? { low: flag.low, text: flag.text, quality: flag.quality } : {}) };
  });
}
