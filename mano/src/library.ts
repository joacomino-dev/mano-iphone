import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Asset } from './domain';
export type Album = { id: string; title: string };
export type AssetMetadata = {
  id: string; kind: Asset['kind']; filename?: string; uniformTypeIdentifier?: string;
  width: number; height: number; creationDate?: number; modified?: number; duration: number;
  isFavorite: boolean; isHidden: boolean;
  location?: { latitude: number; longitude: number; altitude?: number };
  exifStatus: 'notRequested' | 'available' | 'absent' | 'unavailable' | 'notApplicable';
  exif?: { cameraMake?: string; cameraModel?: string; lensModel?: string; dateTimeOriginal?: string;
    iso?: number; fNumber?: number; exposureTime?: number; focalLength?: number; orientation?: number };
};
type LibraryPlugin = {
  authorize(): Promise<{ status: string }>;
  assets(): Promise<{ assets: Asset[]; status: string }>;
  thumbnail(options: { id: string; size?: number; requestId?: string }): Promise<{ path: string }>;
  albums(): Promise<{ albums: Album[] }>;
  addToAlbum(options: { ids: string[]; albumId: string }): Promise<void>;
  createAlbum(options: { title: string; ids: string[] }): Promise<{ album: Album; added: number }>;
  metadata(options: { id: string; includeExif?: boolean }): Promise<AssetMetadata>;
  favorite(options: { ids: string[]; value: boolean; ignoreMissing?: boolean }): Promise<{ missing: string[] }>;
  deleteAssets(options: { ids: string[] }): Promise<{ deleted: string[] }>;
  preview(options: { id: string }): Promise<void>;
  prepareVideo(options: { id: string; requestId: string }): Promise<{path:string; url?:string; mimeType:string; cached:boolean; bytes:number}>;
  cancelVideoPreparation(options: { requestId: string }): Promise<{cancelled:boolean}>;
  cancelThumbnailPreparation(options: { requestId: string }): Promise<{cancelled:boolean}>;
  releasePreparedVideos(options?: {ids?:string[]}): Promise<{released:number}>;
  analyze(options: { ids: string[]; threshold: number }): Promise<{ groups: string[][]; skipped: number; cancelled: boolean }>;
  cancelAnalysis(): Promise<void>;
  addListener(event: 'analysisProgress', cb: (data: { done: number; total: number }) => void): Promise<{ remove(): Promise<void> }>;
  addListener(event: 'mediaPreparationProgress', cb: (data: { requestId: string; phase?: 'download' | 'prepare'; progress: number }) => void): Promise<{ remove(): Promise<void> }>;
  permissionStatus(): Promise<{ status: string }>;
  openSettings(): Promise<void>;
  manageLimitedAccess(): Promise<{ changed: boolean }>;
  haptic(options: { kind: HapticKind }): Promise<void>;
  place(options: { id: string }): Promise<Place & { retry?: string }>;
  diagnostic(options: { message: string }): Promise<void>;
};
export type HapticKind = 'selection' | 'light' | 'soft' | 'medium' | 'rigid' | 'success' | 'warning' | 'error';
export type Place = { locality?: string; region?: string; country?: string; countryCode?: string };
export type PhotoPermission = 'authorized' | 'limited' | 'denied' | 'notDetermined';
export const isNative = Capacitor.isNativePlatform();
export const Library = registerPlugin<LibraryPlugin>('PhotoLibrary');
const cache = new Map<string, Promise<string>>();
export function thumbnail(asset: Asset, size = 900, refresh = false): Promise<string> {
  if (asset.demo) return Promise.resolve('/assets/photos/lake.png');
  const key = `${asset.id}:${asset.modified??0}:${size}`;
  if (refresh) cache.delete(key);
  if (!cache.has(key)) cache.set(key, Library.thumbnail({ id: asset.id, size }).then(r => Capacitor.convertFileSrc(r.path)).catch(e => { cache.delete(key); throw e; }));
  return cache.get(key)!;
}
// Demo media spans several days so date filters and the counter can be tried;
// only some carry a (demonstration) place, to show the layouts without one.
export const demoAssets: Asset[] = Array.from({ length: 20 }, (_, i) => ({ id: `demo-${i}`, kind: i === 9 || i === 4 ? 'video' : i === 14 ? 'live' : 'photo', date: Date.now() - (i < 6 ? (i + 1) * 3 * 3600000 : i < 13 ? (i - 4) * 86400000 : (i * 3) * 86400000), width: 1000, height: 1500, duration: i === 9 || i === 4 ? 2 : 0, group: i<4?'trip-a':i>=10&&i<14?'trip-b':undefined, hasLocation: i % 3 !== 1, demo: true }));
const demoPlaces: Place[] = [{ locality: 'Quito', country: 'Ecuador' }, { locality: 'Cartagena', country: 'Colombia' }, { locality: 'Lisboa', country: 'Portugal' }];
export function demoPlace(asset: Asset): Place { return asset.hasLocation ? demoPlaces[Number(asset.id.replace(/\D/g, '')) % demoPlaces.length] : {}; }
