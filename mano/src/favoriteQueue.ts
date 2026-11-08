import { Library } from './library';
import { onAndroid } from './locales/android';
import { acknowledgeFavorites, favoritesToSend, queueFavorites, withoutFavorites, type PendingFavorites } from './favoritePending';
import type { Asset } from './domain';

/** Favourites in the gallery. On the iPhone, Photos takes each change at once
 * (unchanged). On Android every change needs the system's confirmation, so a
 * favourite is CocoWash's decision at once and reaches the gallery in one batch
 * when the round ends (user decision, 2026-11-07): one dialog for the hearts,
 * one for any removed hearts. Pending changes survive closing the app. */
const KEY = 'cocowash-android-favorites-v1';
// Persist before calling Android: after termination the gallery may have changed
// without our receiving its callback. Keep a later undo as an explicit intent.
const IN_FLIGHT = 'cocowash-android-favorites-inflight-v1';

function read(key = KEY): PendingFavorites {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}') as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([,v])=>typeof v==='boolean')) : {};
  } catch { return {}; }
}
function save(pending: PendingFavorites, key = KEY) {
  if (Object.keys(pending).length) localStorage.setItem(key, JSON.stringify(pending)); else localStorage.removeItem(key);
}

/** Only reconciliation overlays queued choices; raw assets remain gallery truth. */
export function withPendingFavorites(assets: Asset[]): Asset[] {
  if(!onAndroid())return assets;
  const pending=read();return assets.map(a=>Object.hasOwn(pending,a.id)?{...a,favorite:pending[a.id]}:a);
}

export async function setFavorite(ids: string[], value: boolean, ignoreMissing = false): Promise<{ missing: string[] }> {
  if (!onAndroid()) return Library.favorite({ ids, value, ignoreMissing });
  save(queueFavorites(read(), ids, value, read(IN_FLIGHT)));
  return { missing: [] };
}

let sending: Promise<void> | undefined;

/** Sends pending changes to the gallery. `only`: just these items (before deleting
 * them, so a heart removed in this round is not still protecting them). A «Cancel»
 * in Android's dialog drops that batch (the person chose not to mirror it); any
 * other failure keeps it for the next round. */
export function flushFavorites(only?: readonly string[], invalidate?:()=>void): Promise<void> {
  if (!onAndroid()) return Promise.resolve();
  const run = async () => {
    for (const value of only ? [false] : [true, false]) {
      const ids = favoritesToSend(read(), value, only);
      if (!ids.length) continue;
      let started=false;
      try {
        save({...read(IN_FLIGHT),...Object.fromEntries(ids.map(id=>[id,value]))},IN_FLIGHT);
        invalidate?.();started=true;
        await Library.favorite({ ids, value, ignoreMissing: true });
        save(acknowledgeFavorites(read(), ids, value));
        save(withoutFavorites(read(IN_FLIGHT), ids),IN_FLIGHT);
      } catch (error) {
        if ((error as { code?: string })?.code === 'CANCELLED') {
          // Keep an opposite choice made while this exact batch was pending.
          try { save(acknowledgeFavorites(read(),ids,value));save(withoutFavorites(read(IN_FLIGHT),ids),IN_FLIGHT); } catch { /* retained for an idempotent retry */ }
        }
      } finally { if(started)invalidate?.(); }
    }
  };
  sending = (sending ?? Promise.resolve()).then(run, run);
  return sending;
}
