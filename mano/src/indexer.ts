import { useEffect, useRef, useState } from 'react';
import type { Asset } from './domain';
import { Library } from './library';
import { categorize, validInsight } from './insights';

export type Flags = { low: boolean; text: number };
export type LibraryIndex = {
  /** Bumps whenever sizes or flags grow; use it as a memo dependency. */
  version: number;
  sizes: ReadonlyMap<string, number>; flags: ReadonlyMap<string, Flags>;
  sized: number; analyzed: number; photos: number;
  measuring: boolean; analyzing: boolean;
};

const SIZE_CHUNK = 1000, VISION_CHUNK = 120;
/** Vision results reach the pile at most this often: each bump re-sorts it. */
const VISION_REFRESH_MS = 4000;

/** The library's weight and clean-up signals, measured on the iPhone in the
 * background once the library is open: sizes first (fast, descriptor reads),
 * then Vision over photos, oldest first, a chunk at a time. Native caches make
 * later launches near instant. Vision pauses while the similar-photo search,
 * a warm-up or loading runs, and resumes where it stopped. Nothing is sent
 * anywhere; a missing native method just leaves the sets empty. */
export function useLibraryIndex(assets: Asset[], fingerprint: string, enabled: boolean, paused: boolean): LibraryIndex {
  const sizes = useRef(new Map<string, number>());
  const flags = useRef(new Map<string, Flags>());
  const latest = useRef(assets); latest.current = assets;
  const [version, setVersion] = useState(0);
  const [measuring, setMeasuring] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sized, setSized] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true; setSized(false);
    void (async () => {
      const ids = latest.current.map(a => a.id).filter(id => !sizes.current.has(id));
      if (ids.length) setMeasuring(true);
      try {
        for (let i = 0; i < ids.length && alive; i += SIZE_CHUNK) {
          const { sizes: chunk } = await Library.sizes({ ids: ids.slice(i, i + SIZE_CHUNK), flush: i + SIZE_CHUNK >= ids.length });
          if (!alive) return;
          for (const [id, bytes] of Object.entries(chunk)) if (Number.isFinite(bytes) && bytes > 0) sizes.current.set(id, bytes);
          setVersion(v => v + 1);
        }
      } catch { /* unavailable: weights stay unknown */ }
      finally { if (alive) { setMeasuring(false); setSized(true); } }
    })();
    return () => { alive = false; };
  }, [enabled, fingerprint]);

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
          for (const [id, insight] of Object.entries(result.results)) if (validInsight(insight)) { flags.current.set(id, categorize(insight)); pending = true; }
          if (!alive || result.cancelled) return;
          if (pending && performance.now() - shown > VISION_REFRESH_MS) { shown = performance.now(); pending = false; setVersion(v => v + 1); }
        }
      } catch { /* unavailable: clean-up sets stay empty */ }
      finally { if (pending) setVersion(v => v + 1); if (alive) setAnalyzing(false); }
    })();
    return () => { alive = false; setAnalyzing(false); void Library.cancelClassify().catch(() => {}); };
  }, [enabled, sized, paused, fingerprint]);

  const photos = assets.reduce((n, a) => n + (a.kind === 'video' ? 0 : 1), 0);
  return { version, sizes: sizes.current, flags: flags.current, sized: sizes.current.size, analyzed: Math.min(photos, flags.current.size), photos, measuring, analyzing };
}

/** Library assets with their measured weight and clean-up flags. */
export function enrich(assets: Asset[], index: Pick<LibraryIndex, 'sizes' | 'flags'>): Asset[] {
  if (!index.sizes.size && !index.flags.size) return assets;
  return assets.map(a => {
    const bytes = index.sizes.get(a.id), flag = index.flags.get(a.id);
    return bytes === undefined && !flag ? a : { ...a, ...(bytes !== undefined ? { bytes } : {}), ...(flag ? { low: flag.low, text: flag.text } : {}) };
  });
}
