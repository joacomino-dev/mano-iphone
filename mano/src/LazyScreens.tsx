import { createElement, lazy, useState, type ComponentProps, type ComponentType } from 'react';

/** Share the lazy import with idle preloading. Once ready, mount synchronously:
 * opening an already-preloaded screen must not flash its Suspense fallback. */
function preloadable<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  let ready: ComponentType<P> | undefined;
  let pending: ReturnType<typeof load> | undefined;
  const preload = () => pending ??= load()
    .then(module => { ready = module.default; return module; })
    .catch(error => { pending = undefined; throw error; });
  const Deferred = lazy(preload);
  const Screen = (props: P) => {
    // Keep the selected component type for this mount, including when a load
    // completes later; toggling a setting must never remount the whole screen.
    const [Resolved] = useState(() => ready);
    return Resolved ? createElement(Resolved, props) : createElement(Deferred, props);
  };
  return Object.assign(Screen, { preload });
}

export const DisplaySettingsPanel = preloadable<ComponentProps<typeof import('./DisplaySettings').DisplaySettingsPanel>>(() => import('./DisplaySettings').then(module => ({ default: module.DisplaySettingsPanel })));
export const Onboarding = preloadable<ComponentProps<typeof import('./Onboarding').Onboarding>>(() => import('./Onboarding').then(module => ({ default: module.Onboarding })));
export const Inspector = preloadable<ComponentProps<typeof import('./Inspector').Inspector>>(() => import('./Inspector').then(module => ({ default: module.Inspector })));

/** Best effort only: a failed warm-up must not interrupt the current screen. */
export function preloadScreensWhenIdle() {
  const warm = () => { void Promise.all([DisplaySettingsPanel.preload(), Onboarding.preload(), Inspector.preload()]).catch(() => {}); };
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(warm, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(warm, 200);
  return () => clearTimeout(id);
}
