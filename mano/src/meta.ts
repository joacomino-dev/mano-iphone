import type { Asset } from './domain.ts';
import type { Place } from './library.ts';
import { normalizeQuality, type PreviewQuality } from './preview.ts';

/** Display preferences only. They never change which files enter a session. */
export type DateFormat = 'dmy' | 'mdy' | 'iso' | 'd-mon-y' | 'mon-d-y' | 'mon-y';
/** `seal`: show the keep seal on cards. `osd`: show the VHS letters at all;
 * `osdSize`: their size (s / m / l), applied on top of the frame fit. */
export type OsdSize = 's' | 'm' | 'l';
export const OSD_SIZES: OsdSize[] = ['s', 'm', 'l'];
export const OSD_SCALE: Record<OsdSize, number> = { s: .6, m: .8, l: 1 };
export type PhotoMeta = { date: boolean; time: boolean; location: boolean; seal: boolean; dateFormat: DateFormat; hour12: boolean };
export type VideoMeta = { date: boolean; time: boolean; location: boolean; duration: boolean; size: boolean; osd: boolean; osdSize: OsdSize; dateFormat: DateFormat; hour12: boolean };
/** iCloud originals: `always` (9.8.1 default) downloads each card as it reaches
 * the pile and the next ones in line; `save` shows what is already on the iPhone
 * and downloads only on request (anchor, zoom). */
export type CloudMode = 'save' | 'always';
export type DisplaySettings = { photo: PhotoMeta; video: VideoMeta; haptics: boolean; quality: PreviewQuality; cloud: CloudMode };
export const DISPLAY_KEY = 'cocowash-display-v1';
/** v2 (0.8): the tour shows once more after updating, so it can be seen with
 * the new main screen; later launches skip it («Ver la introducción» in Ajustes). */
export const ONBOARDING_KEY = 'cocowash-onboarding-v2';
/** Two rows of three in Ajustes: numeric first, then with the month's name. */
export const DATE_FORMATS: DateFormat[] = ['dmy', 'mdy', 'iso', 'd-mon-y', 'mon-d-y', 'mon-y'];
export const defaultDisplay: DisplaySettings = {
  photo: { date: true, time: false, location: true, seal: true, dateFormat: 'd-mon-y', hour12: false },
  video: { date: true, time: true, location: true, duration: true, size: true, osd: true, osdSize: 'm', dateFormat: 'mon-d-y', hour12: true },
  haptics: true,
  quality: 'balanced',
  cloud: 'always',
};

export function normalizeDisplay(value: unknown): DisplaySettings {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const pick = <T extends Record<string, unknown>>(raw: unknown, base: T): T => {
    const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const out: Record<string, unknown> = { ...base };
    for (const [key, fallback] of Object.entries(base)) {
      const candidate = source[key];
      if (key === 'dateFormat') out[key] = DATE_FORMATS.includes(candidate as DateFormat) ? candidate : fallback;
      else if (key === 'osdSize') out[key] = OSD_SIZES.includes(candidate as OsdSize) ? candidate : fallback;
      else if (typeof fallback === 'boolean' && typeof candidate === 'boolean') out[key] = candidate;
    }
    return out as T;
  };
  return { photo: pick(input.photo, defaultDisplay.photo), video: pick(input.video, defaultDisplay.video),
    haptics: typeof input.haptics === 'boolean' ? input.haptics : defaultDisplay.haptics,
    quality: normalizeQuality(input.quality), cloud: input.cloud === 'save' ? 'save' : 'always' };
}
export function readDisplay(storage?: Pick<Storage, 'getItem'>): DisplaySettings {
  // 9.8.1 stores the iCloud choice as `icloud`: the old `cloud: 'save'` was the
  // default almost everyone kept, so it is not carried over.
  try { const raw = JSON.parse((storage ?? localStorage).getItem(DISPLAY_KEY) || 'null'); return normalizeDisplay(raw && typeof raw === 'object' ? { ...raw, cloud: raw.icloud } : raw); }
  catch { return normalizeDisplay(null); }
}
export function saveDisplay(settings: DisplaySettings, storage?: Pick<Storage, 'setItem'>): boolean {
  try { const value = normalizeDisplay(settings); (storage ?? localStorage).setItem(DISPLAY_KEY, JSON.stringify({ ...value, icloud: value.cloud })); return true; }
  catch { return false; }
}

/** PhotoKit creationDate in ms. 0/negative means "unknown", never epoch 1970. */
export const hasDate = (ms: number | undefined): ms is number => typeof ms === 'number' && Number.isFinite(ms) && ms > 0;
const pad = (n: number) => String(n).padStart(2, '0');
export function monthShort(date: Date, locale: string): string {
  try { return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace(/\./g, '').trim(); }
  catch { return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][date.getMonth()]; }
}
/** Scripts whose month names are not written «17 jun 2021»: Intl composes them. */
const composed = (locale: string) => /^(ja|ar|zh|ko)/.test(locale);
export function formatDate(ms: number | undefined, format: DateFormat, locale = 'es', upper = false): string | undefined {
  if (!hasDate(ms)) return undefined;
  const date = new Date(ms);
  const d = pad(date.getDate()), m = pad(date.getMonth() + 1), y = String(date.getFullYear());
  switch (format) {
    case 'dmy': return `${d}/${m}/${y}`;
    case 'mdy': return `${m}/${d}/${y}`;
    case 'iso': return `${y}-${m}-${d}`;
  }
  // The VHS letters only exist in Latin capitals: camcorders spoke English.
  const lang = upper && composed(locale) ? 'en' : locale;
  if (composed(lang)) {
    const options: Intl.DateTimeFormatOptions = format === 'mon-y' ? { year: 'numeric', month: 'short' } : format === 'mon-d-y' ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' } : { year: 'numeric', month: 'short', day: 'numeric' };
    try { return new Intl.DateTimeFormat(lang, options).format(date); } catch { /* numeric below */ }
    return `${y}-${m}-${d}`;
  }
  const month = upper ? monthShort(date, lang).toLocaleUpperCase(lang) : monthShort(date, lang);
  switch (format) {
    case 'mon-d-y': return `${month} ${Number(d)}, ${y}`;
    case 'mon-y': return `${month} ${y}`;
    default: return `${d} ${month} ${y}`;
  }
}
/** The VHS letters draw Latin capitals, digits and a few signs: other scripts drop out. */
export const osdWritable = (text: string | undefined) => !!text && /^[\p{Script=Latin}\d\s.,:'\/-]+$/u.test(text);
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

/** Polaroid margin: place (where) holds the left slot, date (when) the right.
 * Missing values are never invented; the UI leaves their slot empty. */
export function polaroidCaption(asset: Asset, place: Place | undefined, settings: PhotoMeta, locale = 'es') {
  const where = settings.location ? placeLabel(place) : undefined;
  const date = settings.date ? formatDate(asset.date, settings.dateFormat, locale) : undefined;
  const time = settings.time ? formatTime(asset.date, settings.hour12) : undefined;
  const when = [date, time].filter(Boolean).join(' · ') || undefined;
  return { where, when, empty: !where && !when };
}

/** Decimal units, as iOS reports storage (1 GB = 10⁹ bytes), Spanish comma:
 * 820 KB · 3,4 MB · 148 MB · 1,2 GB. Unknown or zero → undefined. */
export function formatBytes(bytes: number | undefined, locale = 'es'): string | undefined {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return undefined;
  // Pick the unit after rounding: 999,97 MB reads «1 GB», never «1000 MB».
  const [unit, size] = bytes >= 999.5e6 ? ['GB', 1e9] : bytes >= 999.5e3 ? ['MB', 1e6] : ['KB', 1e3];
  const value = Math.max(unit === 'KB' ? 1 : 0, bytes / size);
  const digits = unit !== 'KB' && value < 10 ? 1 : 0;
  // French writes octets (Ko, Mo, Go); in Arabic the Latin unit is isolated so
  // the bidi algorithm keeps «8.2 MB» together inside right-to-left text.
  const text = `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${/^fr/.test(locale) ? unit.replace('B', 'o') : unit}`;
  return /^ar/.test(locale) ? `\u2066${text}\u2069` : text;
}

/** VHS OSD: a top-left stack (time, date, place) and a right column with the
 * duration and the weight (what deleting the video would free). */
export function vhsLayout(asset: Asset, place: Place | undefined, settings: VideoMeta, appLocale = 'es') {
  // The VHS letters are Latin capitals: Arabic and Japanese read them in English.
  const locale = /^(ar|ja)/.test(appLocale) ? 'en' : appLocale;
  const lines = [
    settings.time ? formatTime(asset.date, settings.hour12, true) : undefined,
    settings.date ? formatDate(asset.date, settings.dateFormat, locale, true) : undefined,
    settings.location && osdWritable(placeLabel(place, true, 22)) ? placeLabel(place, true, 22) : undefined,
  ].filter((line): line is string => !!line);
  const duration = settings.duration ? formatDuration(asset.duration) : undefined;
  const size = settings.size ? formatBytes(asset.bytes, locale)?.toLocaleUpperCase(locale) : undefined;
  const right = [duration, size].filter((line): line is string => !!line);
  return { lines, duration, size, right, empty: !lines.length && !right.length };
}
