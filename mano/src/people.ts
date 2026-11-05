export type BreakupMode = 'normal' | 'face';
export type CensorStyle = 'oval' | 'eyes';
export type PersonPortrait = { id: string; face: string };
export type PersonGroup = { id: string; name: string; count: number; representative: string; portraits?: PersonPortrait[] };
export type PeopleStatus = { available: boolean; consent: boolean; running: boolean; processed: number; total: number; remaining: number; waiting: number; blocked?: string; protectionRevision?: number; groups: PersonGroup[];
  phase?: 'idle'|'indexing'|'reconciling'|'ready'|'paused'; hasPublication?: boolean; revision?: number; minimumPhotos?: number; correctionsNeedReview?:boolean; aliases?: Record<string,string> };
export type PersonItems = { ids: string[]; items: { id: string; faces: { id: string; box: number[] }[] }[] };
export const NO_PEOPLE: PeopleStatus = { available: false, consent: false, running: false, processed: 0, total: 0, remaining: 0, waiting: 0, groups: [] };
/** Persisted filter data only. No names, face embeddings or image data. */
export function personFilter(input: Record<string, unknown>): { person?: string; breakup?: BreakupMode; censorStyle?: CensorStyle } {
  if (typeof input.person !== 'string' || !input.person || input.person.length > 128) return {};
  // Legacy hidden/unknown state migrates to censored, never to an exposed photo.
  return { person: input.person, breakup: input.breakup === 'normal' ? 'normal' : 'face', censorStyle: input.censorStyle === 'eyes' ? 'eyes' : 'oval' };
}
export function protectedMode(person?: string, mode?: BreakupMode): boolean { return !!person && mode !== 'normal'; }
export function canonicalPerson(id: string | undefined, aliases: Record<string,string> = {}): string | undefined {
  if (!id) return undefined; const seen = new Set<string>();
  while (aliases[id] && aliases[id] !== id && !seen.has(id)) { seen.add(id); id = aliases[id]; }
  return id;
}
