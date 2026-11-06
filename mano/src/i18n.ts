import en from './locales/en.ts';
import fr from './locales/fr.ts';
import ar from './locales/ar.ts';
import ja from './locales/ja.ts';
import { PLURALS, type PluralKey } from './locales/plurals.ts';

/** CocoWash speaks Spanish (the source text), English, French, Arabic and
 * Japanese. The language follows the iPhone (iOS resolves it per app: Settings ›
 * CocoWash › Language, then the device languages); anything else falls back to
 * English. Ajustes › Idioma can pin one; changing it restarts the web view so
 * every module reads one language. */
export type Lang = 'es' | 'en' | 'fr' | 'ar' | 'ja';
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'es', name: 'Español' }, { id: 'en', name: 'English' }, { id: 'fr', name: 'Français' }, { id: 'ar', name: 'العربية' }, { id: 'ja', name: '日本語' },
];
export const LANGUAGE_KEY = 'cocowash-language-v1';
const SUPPORTED = LANGS.map(l => l.id);
const TABLES: Record<Exclude<Lang, 'es'>, Record<string, string>> = { en, fr, ar, ja };

const base = (tag: unknown) => typeof tag === 'string' ? tag.toLowerCase().split(/[-_]/)[0] : '';
/** Pinned choice, else the first supported language the iPhone prefers, else English. */
export function detectLanguage(stored: string | null, preferred: readonly unknown[]): Lang {
  if (stored && SUPPORTED.includes(stored as Lang)) return stored as Lang;
  for (const tag of preferred) { const code = base(tag); if (SUPPORTED.includes(code as Lang)) return code as Lang; }
  return 'en';
}
function storedChoice(): string | null {
  try { return localStorage.getItem(LANGUAGE_KEY); } catch { return null; }
}
function preferredLanguages(): unknown[] {
  if (typeof window === 'undefined') return ['es'];
  const native = (window as { CocoLocale?: { preferred?: unknown[]; languages?: unknown[] } }).CocoLocale;
  if (Array.isArray(native?.preferred) && native.preferred.length) return native.preferred;
  return typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language] : [];
}
// Node tests have no window: they read the Spanish source text.
export const lang: Lang = typeof window === 'undefined' ? 'es' : detectLanguage(storedChoice(), preferredLanguages());
/** For Intl: Latin digits in Arabic, so counters, sizes and the VHS stay in one script. */
export const locale = lang === 'ar' ? 'ar-u-nu-latn' : lang;
export const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';
if (typeof document !== 'undefined') {
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
}

/** `pinned`: a language chosen in Ajustes (otherwise «Automático»). */
export function languageChoice(): Lang | 'auto' {
  const stored = storedChoice();
  return stored && SUPPORTED.includes(stored as Lang) ? stored as Lang : 'auto';
}
export function setLanguage(choice: Lang | 'auto', reload: () => void = () => location.reload()) {
  try { if (choice === 'auto') localStorage.removeItem(LANGUAGE_KEY); else localStorage.setItem(LANGUAGE_KEY, choice); } catch { return; }
  reload();
}

const number = (value: number) => new Intl.NumberFormat(locale).format(value);
const fill = (text: string, vars?: Record<string, string | number>) => vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => {
  const value = vars[name];
  return value === undefined ? match : typeof value === 'number' ? number(value) : value;
}) : text;

/** The Spanish text is the key; `{name}` placeholders are filled from `vars`. */
export function t(text: string, vars?: Record<string, string | number>): string {
  return fill(lang === 'es' ? text : TABLES[lang][text] ?? text, vars);
}
/** Counted phrases with each language's own plural rules (Arabic has six). */
export function tn(key: PluralKey, n: number, vars?: Record<string, string | number>): string {
  const forms = PLURALS[lang][key] as Partial<Record<Intl.LDMLPluralRule, string>>;
  const rule = new Intl.PluralRules(lang).select(n);
  return fill(forms[rule] ?? forms.other ?? '', { n, ...vars });
}
/** A translated text with nodes (e.g. <strong>) in place of `{name}` placeholders. */
export function parts<T>(text: string, nodes: Record<string, T>): (string | T)[] {
  return text.split(/(\{\w+\})/).filter(Boolean).map(piece => { const name = /^\{(\w+)\}$/.exec(piece)?.[1]; return name && name in nodes ? nodes[name] : piece; });
}
/** Numbers in the app's language (Latin digits). */
export const formatNumber = number;
