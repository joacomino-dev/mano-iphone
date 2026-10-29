import { normalizeDecisionContext, normalizeFilter, validateRecordState, type DecisionContext, type Filter, type RecordState } from './domain.ts';

export const DEMO_SESSION_KEY = 'cocowash-demo-session-v1';
export const LIBRARY_SESSION_KEY = 'cocowash-library-session-v1';
export type ActiveSession = { version: 1; active: boolean; seed: number; filter: Filter; context: DecisionContext; updatedAt: number; record?: RecordState };
export type SessionStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Unversioned/v0 session drafts migrate in memory; unknown future versions are ignored. */
export function validateSession(value: unknown): ActiveSession | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (input.version !== undefined && input.version !== 0 && input.version !== 1) return null;
  if (typeof input.active !== 'boolean' || typeof input.seed !== 'number' || !Number.isSafeInteger(input.seed)) return null;
  const record = validateRecordState(input.record);
  return { version: 1, active: input.active, seed: input.seed,
    filter: normalizeFilter(input.filter), context: normalizeDecisionContext(input.context),
    updatedAt: typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt) ? input.updatedAt : 0,
    ...(record ? { record } : {}) };
}

/** Separate key: never reads or writes the decisions/marks/favorites record. */
export function readSession(key: string, storage?: SessionStorage): ActiveSession | null {
  try { return validateSession(JSON.parse((storage ?? localStorage).getItem(key) || 'null')); }
  catch { return null; }
}

/** Returns false on quota/security errors so the UI can keep the live session. */
export function saveSession(key: string, session: ActiveSession, storage?: SessionStorage): boolean {
  try {
    const valid = validateSession(session);
    if (!valid) return false;
    (storage ?? localStorage).setItem(key, JSON.stringify(valid)); return true;
  } catch { return false; }
}
