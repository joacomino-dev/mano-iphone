import { lang } from './i18n';
import { Library, isNative } from './library';

/** CocoWash's help and privacy pages (es, and en for every other language).
 * Apple asks for the privacy policy to be reachable inside the app. */
const SITE = 'https://joaquinmino.work/cocowash/';
export const helpUrl = () => SITE + (lang === 'es' ? '' : 'support.html');
export const privacyUrl = () => SITE + (lang === 'es' ? 'privacidad.html' : 'privacy.html');

export function openLink(url: string): Promise<void> {
  if (isNative) return Library.openLink({ url });
  window.open(url, '_blank', 'noopener');
  return Promise.resolve();
}
