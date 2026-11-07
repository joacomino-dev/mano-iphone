/** Favourite changes waiting to reach the gallery (Android): item id → wanted
 * value. An entry exists only while CocoWash's choice differs from what the
 * gallery last received, so marking and unmarking the same item before the round
 * ends leaves nothing to send. Pure, for tests. */
export type PendingFavorites = Record<string, boolean>;

export function queueFavorites(pending: PendingFavorites, ids: readonly string[], value: boolean): PendingFavorites {
  const next = { ...pending };
  for (const id of ids) {
    if (id in next && next[id] !== value) delete next[id];
    else next[id] = value;
  }
  return next;
}

/** The ids to send with `value`; `only` limits them (e.g. to the items about to be deleted). */
export function favoritesToSend(pending: PendingFavorites, value: boolean, only?: readonly string[]): string[] {
  const scope = only ? new Set(only) : undefined;
  return Object.keys(pending).filter(id => pending[id] === value && (!scope || scope.has(id)));
}

export function withoutFavorites(pending: PendingFavorites, ids: readonly string[]): PendingFavorites {
  const next = { ...pending };
  for (const id of ids) delete next[id];
  return next;
}
