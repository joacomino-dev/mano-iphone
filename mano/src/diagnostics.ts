import { Library, isNative } from './library';

/** Real JS failures in the installed app reach the device log as
 * COCOWASH_JS_ERROR (Release builds do not forward the WebView console), so a
 * failing CI run or a device report shows the cause instead of a blank screen.
 * Messages carry error text and a short stack only, never media or user data. */
export function reportError(where: string, error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(0, 6).join('\n')}` : String(error);
  console.error(where, error);
  if (isNative) void Library.diagnostic({ message: `${where}: ${detail}`.slice(0, 1500) }).catch(() => {});
}

let installed = false;
export function installErrorReporting() {
  if (installed || !isNative || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', event => reportError('window', event.error ?? event.message));
  window.addEventListener('unhandledrejection', event => reportError('promise', event.reason));
}
