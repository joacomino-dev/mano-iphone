import type { Asset } from './domain.ts';

/** Preview quality only: what is requested from PhotoKit to show a card or an
 * anchored/zoomed view. Originals are never read, changed or re-encoded. */
export type PreviewQuality = 'fast' | 'balanced' | 'high';
export const PREVIEW_QUALITIES: PreviewQuality[] = ['fast', 'balanced', 'high'];
export type PreviewProfile = {
  /** Card long edge = CSS long edge × min(screen scale, scaleCap) × scaleBoost. */
  scaleCap: number; scaleBoost: number; cardMax: number;
  /** Anchored/zoomed long edge, fetched on demand and swapped in place. */
  zoom: number;
  /** On-disk preview cache (native, least recently used first). */
  cacheMB: number;
};
export const PREVIEW_PROFILES: Record<PreviewQuality, PreviewProfile> = {
  fast: { scaleCap: 2, scaleBoost: 1, cardMax: 1280, zoom: 1600, cacheMB: 150 },
  balanced: { scaleCap: 3, scaleBoost: 1, cardMax: 1792, zoom: 2400, cacheMB: 300 },
  high: { scaleCap: 3, scaleBoost: 1.25, cardMax: 2048, zoom: 3072, cacheMB: 500 },
};
/** Native cap (PhotoLibrary.swift); requests above it are clamped there too. */
export const PREVIEW_MAX = 3072;
const STEP = 128;
const bucket = (px: number, max: number) => Math.min(max, Math.max(256, Math.ceil(px / STEP) * STEP));

/** Card geometry shared by the stack and the preloader: aspect-correct, centred,
 * never cropped. `margin` is the frame below the image (caption or tape foot). */
export const CARD_SIDE = 8, CAPTION = 32, TAPE_FOOT = 16, STAGE_INSET = 44, STAGE_FOOT = 26;
export function cardBox(stage: { width: number; height: number }, asset: Pick<Asset, 'width' | 'height' | 'kind'>) {
  const ratio = Math.max(.05, asset.width / Math.max(1, asset.height));
  const margin = CARD_SIDE + (asset.kind === 'video' ? TAPE_FOOT : CAPTION);
  const imageWidth = Math.max(20, Math.min(stage.width - STAGE_INSET, (stage.height - margin - STAGE_FOOT) * ratio));
  const imageHeight = imageWidth / ratio;
  return { ratio, margin, imageWidth, imageHeight, cardWidth: imageWidth + CARD_SIDE * 2, cardHeight: imageHeight + margin };
}

/** Long edge in device pixels, bucketed so nearby sizes share one cached file. */
export function previewSize(quality: PreviewQuality, purpose: 'card' | 'zoom' | 'thumb', cssLongEdge: number, scale: number): number {
  const profile = PREVIEW_PROFILES[quality] ?? PREVIEW_PROFILES.balanced;
  const dpr = Number.isFinite(scale) && scale > 0 ? scale : 2;
  const css = Number.isFinite(cssLongEdge) && cssLongEdge > 0 ? cssLongEdge : 360;
  const card = bucket(css * Math.min(dpr, profile.scaleCap) * profile.scaleBoost, profile.cardMax);
  if (purpose === 'thumb') return bucket(css * Math.min(dpr, 2), 512);
  if (purpose === 'zoom') return Math.min(PREVIEW_MAX, Math.max(card, profile.zoom));
  return card;
}
export const normalizeQuality = (value: unknown): PreviewQuality => PREVIEW_QUALITIES.includes(value as PreviewQuality) ? value as PreviewQuality : 'balanced';
export const cacheBytes = (quality: PreviewQuality) => (PREVIEW_PROFILES[quality] ?? PREVIEW_PROFILES.balanced).cacheMB * 1024 * 1024;

/** Where the stack will draw cards, set by the app as soon as it is measured.
 * Before that, a conservative phone-sized stage keeps the first requests sharp. */
const sizing = { quality: 'balanced' as PreviewQuality, stage: { width: 340, height: 460 }, scale: 3 };
export function setPreviewSizing(next: Partial<typeof sizing>) { Object.assign(sizing, next); }
export const previewQuality = () => sizing.quality;
export function cardPixels(asset: Pick<Asset, 'width' | 'height' | 'kind'>) {
  const box = cardBox(sizing.stage, asset);
  return previewSize(sizing.quality, 'card', Math.max(box.imageWidth, box.imageHeight), sizing.scale);
}
export function zoomPixels(asset: Pick<Asset, 'width' | 'height' | 'kind'>) {
  const box = cardBox(sizing.stage, asset);
  return previewSize(sizing.quality, 'zoom', Math.max(box.imageWidth, box.imageHeight), sizing.scale);
}
export const thumbPixels = (cssLongEdge = 140) => previewSize(sizing.quality, 'thumb', cssLongEdge, sizing.scale);
