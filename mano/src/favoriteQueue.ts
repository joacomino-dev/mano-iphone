import { Library } from './library';
import { onAndroid } from './locales/android';
import { favoritesToSend, queueFavorites, withoutFavorites, type PendingFavorites } from './favoritePending';

/** Favourites in the gallery. On the iPhone, Photos takes each change at once
 * (unchanged). On Android every change needs the system's confirmation, so a
 * favourite is CocoWash's decision at once and reaches the gallery in one batch
 * when the round ends (user decision, 2026-11-07): one dialog for the hearts,
 * one for any removed hearts. Pending changes survive closing the app. */
const KEY = 'cocowash-android-favorites-v1';

function read(): PendingFavorites {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as PendingFavorites : {};
  } catch { return {}; }
}
function save(pending: PendingFavorites) {
  try { if (Object.keys(pending).length) localStorage.setItem(KEY, JSON.stringify(pending)); else localStorage.removeItem(KEY); } catch { /* kept in memory only */ }
}

export async function setFavorite(ids: string[], value: boolean, ignoreMissing = false): Promise<{ missing: string[] }> {
  if (!onAndroid()) return Library.favorite({ ids, value, ignoreMissing });
  save(queueFavorites(read(), ids, value));
  return { missing: [] };
}

let sending: Promise<void> | undefined;

/** Sends pending changes to the gallery. `only`: just these items (before deleting
 * them, so a heart removed in this round is not still protecting them). A «Cancel»
 * in Android's dialog drops that batch (the person chose not to mirror it); any
 * other failure keeps it for the next round. */
export function flushFavorites(only?: readonly string[]): Promise<void> {
  if (!onAndroid()) return Promise.resolve();
  const run = async () => {
    for (const value of only ? [false] : [true, false]) {
      const ids = favoritesToSend(read(), value, only);
      if (!ids.length) continue;
      try {
        await Library.favorite({ ids, value, ignoreMissing: true });
        save(withoutFavorites(read(), ids));
      } catch (error) {
        if ((error as { code?: string })?.code === 'CANCELLED') save(withoutFavorites(read(), ids));
      }
    }
  };
  sending = (sending ?? Promise.resolve()).then(run, run);
  return sending;
}
