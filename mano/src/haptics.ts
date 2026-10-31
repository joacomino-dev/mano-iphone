import { Library, isNative, type HapticKind } from './library';

/** Contextual, rate-limited taps. Repeated threshold crossings in a long
 * session stay quiet: one selection tick per 140 ms at most, other kinds 70 ms. */
let enabled = true;
let last = 0;
let lastSelection = 0;
export function setHapticsEnabled(value: boolean) { enabled = value; }
export function haptic(kind: HapticKind) {
  if (!enabled || !isNative) return;
  const now = performance.now();
  if (kind === 'selection') { if (now - lastSelection < 140) return; lastSelection = now; }
  else if (now - last < 70) return;
  last = now;
  void Library.haptic({ kind }).catch(() => {});
}
