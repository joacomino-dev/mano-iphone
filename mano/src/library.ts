import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Asset } from './domain';
export type Album = { id: string; title: string };
type LibraryPlugin = {
  authorize(): Promise<{ status: string }>;
  assets(): Promise<{ assets: Asset[]; status: string }>;
  thumbnail(options: { id: string; size?: number }): Promise<{ path: string }>;
  albums(): Promise<{ albums: Album[] }>;
  addToAlbum(options: { ids: string[]; albumId: string }): Promise<void>;
  favorite(options: { ids: string[]; value: boolean; ignoreMissing?: boolean }): Promise<{ missing: string[] }>;
  deleteAssets(options: { ids: string[] }): Promise<{ deleted: string[] }>;
  preview(options: { id: string }): Promise<void>;
  analyze(options: { ids: string[]; threshold: number }): Promise<{ groups: string[][]; skipped: number; cancelled: boolean }>;
  cancelAnalysis(): Promise<void>;
  addListener(event: 'analysisProgress', cb: (data: { done: number; total: number }) => void): Promise<{ remove(): Promise<void> }>;
};
export const isNative = Capacitor.isNativePlatform();
export const Library = registerPlugin<LibraryPlugin>('PhotoLibrary');
const cache = new Map<string, Promise<string>>();
export function thumbnail(asset: Asset, size = 900): Promise<string> {
  if (asset.demo) return Promise.resolve('/assets/photos/lake.png');
  const key = `${asset.id}:${asset.modified??0}:${size}`;
  if (!cache.has(key)) cache.set(key, Library.thumbnail({ id: asset.id, size }).then(r => Capacitor.convertFileSrc(r.path)).catch(e => { cache.delete(key); throw e; }));
  return cache.get(key)!;
}
export const demoAssets: Asset[] = Array.from({ length: 20 }, (_, i) => ({ id: `demo-${i}`, kind: i === 9 ? 'video' : i === 14 ? 'live' : 'photo', date: Date.now() - (20 - i) * 3600000, width: 1000, height: 1500, duration: i === 9 ? 12 : 0, group: `trip-${Math.floor(i / 5)}`, demo: true }));
