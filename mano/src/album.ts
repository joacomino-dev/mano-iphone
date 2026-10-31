import { decide, type DecisionContext, type RecordState } from './domain.ts';

/** Saving to an album is a decision to keep: assign first, then keep (one undoable
 * history entry, like a swipe) and move on. A failed or cancelled assignment
 * neither keeps nor advances. The album membership itself is not undone. */
export type AlbumOutcome = { ok: true; title: string; added: number } | { ok: false; error: unknown };

export async function assignToAlbum(write: () => Promise<{ title: string; added?: number }>, ids: string[]): Promise<AlbumOutcome> {
  if (!ids.length) return { ok: false, error: new Error('Nada seleccionado.') };
  try { const result = await write(); return { ok: true, title: result.title, added: result.added ?? ids.length }; }
  catch (error) { return { ok: false, error }; }
}

export function afterAlbum(state: RecordState, ids: string[], outcome: AlbumOutcome, now = Date.now(), context?: DecisionContext): RecordState {
  return outcome.ok ? decide(state, ids, 'keep', now, context) : state;
}
