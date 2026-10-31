import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Asset } from './domain';
import type { Insight } from './insights';
import { cloudDownloads } from './preview';
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
  /** network false: only what is on the iPhone; `cloud` marks a smaller local
   * version of an iCloud original (code IN_CLOUD when there is none). */
  thumbnail(options: { id: string; size?: number; requestId?: string; cacheBytes?: number; network?: boolean }): Promise<{ path: string; cloud?: boolean }>;
  albums(): Promise<{ albums: Album[] }>;
  addToAlbum(options: { ids: string[]; albumId: string }): Promise<void>;
  createAlbum(options: { title: string; ids: string[] }): Promise<{ album: Album; added: number }>;
  metadata(options: { id: string; includeExif?: boolean }): Promise<AssetMetadata>;
  favorite(options: { ids: string[]; value: boolean; ignoreMissing?: boolean }): Promise<{ missing: string[] }>;
  deleteAssets(options: { ids: string[] }): Promise<{ deleted: string[] }>;
  preview(options: { id: string }): Promise<void>;
  prepareVideo(options: { id: string; requestId: string; network?: boolean }): Promise<{path:string; url?:string; mimeType:string; cached:boolean; bytes:number}>;
  cancelVideoPreparation(options: { requestId: string }): Promise<{cancelled:boolean}>;
  cancelThumbnailPreparation(options: { requestId: string }): Promise<{cancelled:boolean}>;
  releasePreparedVideos(options?: {ids?:string[]}): Promise<{released:number}>;
  analyze(options: { ids: string[]; threshold: number }): Promise<{ groups: string[][]; skipped: number; cancelled: boolean }>;
  cancelAnalysis(): Promise<void>;
  /** Bytes per asset (all its resources), at most 2000 ids per call. */
  sizes(options: { ids: string[]; flush?: boolean }): Promise<{ sizes: Record<string, number> }>;
  /** Local Vision signals for photos, at most 400 ids per call (cached natively). */
  classify(options: { ids: string[]; flush?: boolean }): Promise<{ results: Record<string, Insight>; skipped: number; cancelled: boolean }>;
  cancelClassify(): Promise<void>;
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
export type Thumb = { src: string; cloud: boolean };
const cache = new Map<string, Promise<Thumb>>();
/** `network` defaults to the iCloud preference; true downloads if needed. */
export function thumbnailInfo(asset: Asset, size = 900, refresh = false, network = cloudDownloads()): Promise<Thumb> {
  if (asset.demo) return Promise.resolve({ src: demoPostcard(asset), cloud: !!asset.cloud && !network });
  const key = `${asset.id}:${asset.modified??0}:${size}:${network ? 'net' : 'local'}`;
  if (refresh) cache.delete(key);
  if (!cache.has(key)) cache.set(key, Library.thumbnail({ id: asset.id, size, network }).then(r => ({ src: Capacitor.convertFileSrc(r.path), cloud: !!r.cloud })).catch(e => { cache.delete(key); throw e; }));
  return cache.get(key)!;
}
export const thumbnail = (asset: Asset, size = 900, refresh = false, network?: boolean) => thumbnailInfo(asset, size, refresh, network).then(t => t.src);
export const inCloudError = (error: unknown) => (error as { code?: string })?.code === 'IN_CLOUD';
// Demo media spans several days so date filters and the counter can be tried;
// only some carry a (demonstration) place, to show the layouts without one.
// Images are CocoWash's own generated postcards (no people, no stock photos);
// similar-photo groups share one postcard so they read as «parecidas». Two
// extra cards stand for the clean-up sets: a receipt and a chat screenshot.
const POSTCARDS: [number, number][] = [[1000, 1500], [1500, 1000], [1000, 1500], [1200, 1200], [1500, 1000], [1000, 1500], [1000, 1500], [900, 1950]];
const demoIndex = (asset: Pick<Asset, 'id'>) => Number(asset.id.replace(/\D/g, '')) || 0;
const RECEIPTS = [7, 16], SCREENSHOTS = [8, 18], LOW = [12, 17];
const postcardOf = (i: number) => RECEIPTS.includes(i) ? 6 : SCREENSHOTS.includes(i) ? 7 : i < 4 ? 0 : i >= 10 && i < 14 ? 4 : i % 6;
export const demoPostcard = (asset: Pick<Asset, 'id'>) => `/assets/demo/postcard-${postcardOf(demoIndex(asset)) + 1}.svg`;
// Plausible weights for the demonstration: photos 1,6–5,2 MB, a Live Photo adds
// its motion, screenshots are light, the two videos weigh 186 MB and 64 MB.
const demoBytes = (i: number, kind: Asset['kind']) => kind === 'video' ? (i === 4 ? 186_400_000 : 64_200_000)
  : SCREENSHOTS.includes(i) ? 640_000 + i * 9_000 : Math.round((1.6 + (i * 37 % 36) / 10) * 1e6) + (kind === 'live' ? 2_400_000 : 0);
export const demoAssets: Asset[] = Array.from({ length: 20 }, (_, i) => { const video = i === 9 || i === 4; const [width, height] = video ? [1500, 1000] : POSTCARDS[postcardOf(i)];
  const kind: Asset['kind'] = video ? 'video' : i === 14 ? 'live' : 'photo';
  return { id: `demo-${i}`, kind, date: Date.now() - (i < 6 ? (i + 1) * 3 * 3600000 : i < 13 ? (i - 4) * 86400000 : (i * 3) * 86400000), width, height, duration: video ? 2 : 0, group: i<4?'trip-a':i>=10&&i<14?'trip-b':undefined, hasLocation: i % 3 !== 1 && !SCREENSHOTS.includes(i), demo: true,
    bytes: demoBytes(i, kind), screenshot: SCREENSHOTS.includes(i), low: LOW.includes(i), text: RECEIPTS.includes(i) || SCREENSHOTS.includes(i) ? 1 : 0, cloud: i === 4 || i === 5 }; });
const demoPlaces: Place[] = [{ locality: 'Quito', country: 'Ecuador' }, { locality: 'Cartagena', country: 'Colombia' }, { locality: 'Lisboa', country: 'Portugal' }];
export function demoPlace(asset: Asset): Place { return asset.hasLocation ? demoPlaces[demoIndex(asset) % demoPlaces.length] : {}; }
