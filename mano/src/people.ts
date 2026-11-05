export type BreakupMode = 'normal' | 'face';
export type CensorStyle = 'oval' | 'eyes';
export type PersonPortrait = { id: string; face: string; version?:string };
export type PersonGroup = { id: string; name: string; count: number; representative: string; portraits?: PersonPortrait[] };
export type PeopleStatus = { available: boolean; consent: boolean; running: boolean; processed: number; total: number; remaining: number; waiting: number; blocked?: string; protectionRevision?: number; groups: PersonGroup[];
  phase?: 'idle'|'indexing'|'reconciling'|'ready'|'paused'; hasPublication?: boolean; revision?: number; minimumPhotos?: number; correctionsNeedReview?:boolean; aliases?: Record<string,string>;
  /** Photos set aside after the app closed twice while reading them. Never deleted. */
  skipped?: number;
  /** Native phase that was open when the previous process ended abruptly. */
  interruptedPhase?: string;
  /** Phases that ended the process twice in a row and wait for an explicit retry. */
  guarded?: string[] };
export type PersonItems = { ids: string[]; items: { id: string; faces: { id: string; box: number[] }[] }[] };
export const NO_PEOPLE: PeopleStatus = { available: false, consent: false, running: false, processed: 0, total: 0, remaining: 0, waiting: 0, groups: [] };
/** Persisted filter data only. No names, face embeddings or image data. */
export function personFilter(input: Record<string, unknown>): { person?: string; breakup?: BreakupMode; censorStyle?: CensorStyle } {
  if (typeof input.person !== 'string' || !input.person || input.person.length > 128) return {};
  // Legacy hidden/unknown state migrates to censored, never to an exposed photo.
  return { person: input.person, breakup: input.breakup === 'normal' ? 'normal' : 'face', censorStyle: input.censorStyle === 'eyes' ? 'eyes' : 'oval' };
}
export function protectedMode(person?: string, mode?: BreakupMode): boolean { return !!person && mode !== 'normal'; }
const PHASES: Record<string,string> = {
  open:'abría el índice de Personas', refresh:'leía tu biblioteca', batch:'analizaba fotos', prune:'limpiaba el índice',
  'model-load':'cargaba el modelo facial', insert:'revisaba una foto', group:'agrupaba caras', read:'leía los grupos',
  'reconcile-prepare':'preparaba la organización', 'reconcile-insert':'comparaba rostros', 'reconcile-group':'organizaba los grupos',
  publish:'publicaba los grupos', portrait:'preparaba las miniaturas', redact:'preparaba una foto censurada',
};
/** People starts by itself on the first launch: face grouping runs only on
 * this iPhone. It stays off only after the user turns it off explicitly. */
export const PEOPLE_OFF_KEY = 'cocowash-people-off-v1';
export function shouldAutoStart(status: Pick<PeopleStatus,'available'|'consent'>, turnedOff: boolean): boolean {
  return status.available && !status.consent && !turnedOff;
}
export function peopleTurnedOff(): boolean { try { return localStorage.getItem(PEOPLE_OFF_KEY) === '1'; } catch { return false; } }
export function setPeopleTurnedOff(value: boolean) { try { if (value) localStorage.setItem(PEOPLE_OFF_KEY, '1'); else localStorage.removeItem(PEOPLE_OFF_KEY); } catch { /* preference only */ } }
/** Plain-language note for an analysis that the app could not finish because it closed. */
export function interruptionNote(status: Pick<PeopleStatus,'blocked'|'interruptedPhase'|'guarded'>): string {
  if (status.blocked !== 'interrupted') return '';
  const phase = status.interruptedPhase ? PHASES[status.interruptedPhase] : undefined;
  const repeated = !!status.guarded?.length;
  return `${phase ? `CocoWash se cerró mientras ${phase}. ` : 'CocoWash se cerró durante el análisis. '}El progreso guardado se conserva.` +
    (repeated ? ' Como ocurrió dos veces seguidas, esa etapa espera a que pulses Reanudar.' : ' Puedes reanudar el análisis.');
}
export function canonicalPerson(id: string | undefined, aliases: Record<string,string> = {}): string | undefined {
  if (!id) return undefined; const seen = new Set<string>();
  while (aliases[id] && aliases[id] !== id && !seen.has(id)) { seen.add(id); id = aliases[id]; }
  return id;
}
