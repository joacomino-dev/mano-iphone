/** «Modo de prueba» (development, until 1.0): on the iPhone the app runs the
 * same demo as the web preview — example postcards, every action imitated,
 * nothing read from or written to Fotos — with real test ads at a fast cadence.
 * Its decisions live in the demo storage keys, apart from the real library. */
export const TEST_MODE_KEY = 'cocowash-test-mode-v1';

export function readTestMode(): boolean {
  try { return localStorage.getItem(TEST_MODE_KEY) === '1'; } catch { return false; }
}

/** Switching modes reloads the web view so every module starts in one mode. */
export function setTestMode(on: boolean, reload: () => void = () => location.reload()) {
  try { if (on) localStorage.setItem(TEST_MODE_KEY, '1'); else localStorage.removeItem(TEST_MODE_KEY); } catch { return; }
  reload();
}
