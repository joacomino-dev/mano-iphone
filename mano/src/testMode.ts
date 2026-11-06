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

/** How many extra rounds of postcards «Modo de prueba» has dealt (library.ts demoRound). */
const ROUNDS_KEY = 'cocowash-test-rounds-v1';
export function readTestRounds(): number {
  try { const n = Number(localStorage.getItem(ROUNDS_KEY)); return Number.isInteger(n) && n > 0 ? Math.min(n, 500) : 0; } catch { return 0; }
}
export function saveTestRounds(rounds: number) { try { localStorage.setItem(ROUNDS_KEY, String(rounds)); } catch { /* optional */ } }

/** «Modo developer › Anuncios» (development only): off shows the app as someone
 * who paid to remove ads — no letters anywhere, Apoyo still there. */
const ADS_OFF_KEY = 'cocowash-dev-ads-off-v1';
export function readAdsOff(): boolean {
  try { return localStorage.getItem(ADS_OFF_KEY) === '1'; } catch { return false; }
}
export function saveAdsOff(off: boolean) {
  try { if (off) localStorage.setItem(ADS_OFF_KEY, '1'); else localStorage.removeItem(ADS_OFF_KEY); } catch { /* optional */ }
}
