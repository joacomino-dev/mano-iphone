import type { Asset } from './domain.ts';
import type { Place } from './library.ts';

/** Display preferences only. They never change which files enter a session. */
export type DateFormat = 'dmy' | 'd-mon-y' | 'mon-d-y' | 'iso';
export type PhotoMeta = { date: boolean; time: boolean; location: boolean; dateFormat: DateFormat; hour12: boolean };
export type VideoMeta = { date: boolean; time: boolean; location: boolean; duration: boolean; dateFormat: DateFormat; hour12: boolean };
export type DisplaySettings = { photo: PhotoMeta; video: VideoMeta; haptics: boolean };
export const DISPLAY_KEY = 'cocowash-display-v1';
export const ONBOARDING_KEY = 'cocowash-onboarding-v1';
export const DATE_FORMATS: DateFormat[] = ['dmy', 'd-mon-y', 'mon-d-y', 'iso'];
export const defaultDisplay: DisplaySettings = {
  photo: { date: true, time: false, location: true, dateFormat: 'd-mon-y', hour12: false },
  video: { date: true, time: true, location: true, duration: true, dateFormat: 'mon-d-y', hour12: true },
  haptics: true,
};

export function normalizeDisplay(value: unknown): DisplaySettings {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const pick = <T extends Record<string, unknown>>(raw: unknown, base: T): T => {
    const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const out: Record<string, unknown> = { ...base };
    for (const [key, fallback] of Object.entries(base)) {
      const candidate = source[key];
      if (key === 'dateFormat') out[key] = DATE_FORMATS.includes(candidate as DateFormat) ? candidate : fallback;
      else if (typeof fallback === 'boolean' && typeof candidate === 'boolean') out[key] = candidate;
    }
    return out as T;
  };
  return { photo: pick(input.photo, defaultDisplay.photo), video: pick(input.video, defaultDisplay.video),
    haptics: typeof input.haptics === 'boolean' ? input.haptics : defaultDisplay.haptics };
}
export function readDisplay(storage?: Pick<Storage, 'getItem'>): DisplaySettings {
  try { return normalizeDisplay(JSON.parse((storage ?? localStorage).getItem(DISPLAY_KEY) || 'null')); }
  catch { return normalizeDisplay(null); }
}
export function saveDisplay(settings: DisplaySettings, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? localStorage).setItem(DISPLAY_KEY, JSON.stringify(normalizeDisplay(settings))); return true; }
  catch { return false; }
}

/** PhotoKit creationDate in ms. 0/negative means "unknown", never epoch 1970. */
export const hasDate = (ms: number | undefined): ms is number => typeof ms === 'number' && Number.isFinite(ms) && ms > 0;
const pad = (n: number) => String(n).padStart(2, '0');
export function monthShort(date: Date, locale: string): string {
  try { return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace(/\./g, '').trim(); }
  catch { return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][date.getMonth()]; }
}
export function formatDate(ms: number | undefined, format: DateFormat, locale = 'es', upper = false): string | undefined {
  if (!hasDate(ms)) return undefined;
  const date = new Date(ms);
  const d = pad(date.getDate()), m = pad(date.getMonth() + 1), y = String(date.getFullYear());
  const month = upper ? monthShort(date, locale).toLocaleUpperCase(locale) : monthShort(date, locale);
  switch (format) {
    case 'dmy': return `${d}/${m}/${y}`;
    case 'iso': return `${y}-${m}-${d}`;
    case 'mon-d-y': return `${month}. ${d} ${y}`;
    default: return `${d} ${month} ${y}`;
  }
}
/** `vhs` puts the meridiem first, as camcorder OSDs did (AM 02:25). */
export function formatTime(ms: number | undefined, hour12: boolean, vhs = false): string | undefined {
  if (!hasDate(ms)) return undefined;
  const date = new Date(ms); const hours = date.getHours(); const minutes = pad(date.getMinutes());
  if (!hour12) return `${pad(hours)}:${minutes}`;
  const meridiem = hours < 12 ? 'AM' : 'PM'; const h = pad(hours % 12 || 12);
  return vhs ? `${meridiem} ${h}:${minutes}` : `${h}:${minutes} ${meridiem}`;
}
/** MM:SS below an hour, HH:MM:SS from an hour. Unknown/zero length → undefined. */
export function formatDuration(seconds: number | undefined): string | undefined {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const total = Math.max(1, Math.round(seconds));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
export function placeLabel(place: Place | undefined, upper = false, max = 26): string | undefined {
  const city = place?.locality?.trim(); const country = place?.country?.trim();
  const parts = city ? (country && country !== city ? [city, country] : [city]) : country ? [country] : [];
  if (!parts.length) return undefined;
  const label = parts.join(', ').length > max ? parts[0] : parts.join(', ');
  return upper ? label.toLocaleUpperCase() : label;
}

/** Polaroid margin: place reads first (where), date second (when). Missing
 * values are dropped; nothing is invented or left as an empty slot. */
export function polaroidCaption(asset: Asset, place: Place | undefined, settings: PhotoMeta, locale = 'es') {
  const where = settings.location ? placeLabel(place) : undefined;
  const date = settings.date ? formatDate(asset.date, settings.dateFormat, locale) : undefined;
  const time = settings.time ? formatTime(asset.date, settings.hour12) : undefined;
  const when = [date, time].filter(Boolean).join(' · ') || undefined;
  return { where, when, empty: !where && !when };
}

/** VHS OSD: a top-left stack (time, date, place) and an independent duration. */
export function vhsLayout(asset: Asset, place: Place | undefined, settings: VideoMeta, locale = 'es') {
  const lines = [
    settings.time ? formatTime(asset.date, settings.hour12, true) : undefined,
    settings.date ? formatDate(asset.date, settings.dateFormat, locale, true) : undefined,
    settings.location ? placeLabel(place, true, 22) : undefined,
  ].filter((line): line is string => !!line);
  const duration = settings.duration ? formatDuration(asset.duration) : undefined;
  return { lines, duration, empty: !lines.length && !duration };
}
