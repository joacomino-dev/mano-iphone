export type BreakupMode = 'normal' | 'face' | 'hidden';
export type PersonGroup = { id: string; name: string; count: number; representative: string };
export type PeopleStatus = { available: boolean; consent: boolean; running: boolean; processed: number; total: number; remaining: number; waiting: number; groups: PersonGroup[] };
export type PersonItems = { ids: string[]; items: { id: string; faces: { id: string; box: number[] }[] }[] };
export const NO_PEOPLE: PeopleStatus = { available: false, consent: false, running: false, processed: 0, total: 0, remaining: 0, waiting: 0, groups: [] };
/** Persisted filter data only. No names, face embeddings or image data. */
export function personFilter(input: Record<string, unknown>): { person?: string; breakup?: BreakupMode } {
  if (typeof input.person !== 'string' || !input.person || input.person.length > 128) return {};
  return { person: input.person, breakup: input.breakup === 'normal' || input.breakup === 'face' ? input.breakup : 'hidden' };
}
export function protectedMode(person?: string, mode?: BreakupMode): boolean { return !!person && mode !== 'normal'; }
