import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Library } from './library';

/** Android's Back button and predictive back gesture close what is open on top
 * (a sheet, the anchored view) instead of leaving the app. Every open layer
 * registers here; Back closes the most recent one. With nothing open, native Back
 * is left alone, so leaving the app keeps Android's back-to-home preview.
 * iOS and the browser preview never call native code from here. */
const android = Capacitor.getPlatform() === 'android';
const layers: { close: () => void }[] = [];
let listening: Promise<{ remove(): Promise<void> }> | undefined;

function sync() {
  if (!android) return;
  void Library.backHandling({ active: layers.length > 0 }).catch(() => {});
  if (!listening) listening = Library.addListener('backButton', () => layers[layers.length - 1]?.close());
}

export function useAndroidBack(open: boolean, close: () => void) {
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    if (!android || !open) return;
    const layer = { close: () => latest.current() };
    layers.push(layer); sync();
    return () => { const i = layers.indexOf(layer); if (i >= 0) layers.splice(i, 1); sync(); };
  }, [open]);
}
