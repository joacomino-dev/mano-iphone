import type { Asset } from './domain.ts';
export const VIDEO_PREFETCH_BYTES = 256 * 1024 * 1024;
/** Estimate only for admission, never shown as a measured file size. Actual
 * prepared bytes replace it when available. Visible video is always admitted. */
export function videoWindow(assets: Asset[], visible?: Asset, measured: ReadonlyMap<string, number> = new Map(), budget = VIDEO_PREFETCH_BYTES): Asset[] {
  const key = (a: Asset) => `${a.id}:${a.modified ?? 0}`;
  const result: Asset[] = [], seen = new Set<string>(); let used = 0;
  if (visible?.kind === 'video') { result.push(visible); seen.add(key(visible)); }
  for (const asset of assets) {
    if (asset.kind !== 'video' || seen.has(key(asset))) continue;
    const bytes = measured.get(key(asset)) ?? (asset.bytes && asset.bytes > 0 ? asset.bytes : Math.max(32, Math.ceil(asset.duration || 0)) * 1024 * 1024);
    if (bytes > budget - used) continue;
    used += bytes; seen.add(key(asset)); result.push(asset);
  }
  return result;
}
