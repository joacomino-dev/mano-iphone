/** 9.8.1: one letter every 20–30 photos, the first after a minute of sorting. */
export const INTRO_MS = 60_000;
export const AD_GAP_MS = 30_000;

/** Cadence of the pile letter. The fixed letters («Una última mirada», the
 * summary) always show when an ad is ready (Monetization.tsx); they only reset
 * the gap. TEST_RULES apply in «Modo de prueba» so ads can be judged quickly. */
export type CadenceRules = { introMs: number; gapMs: number; min: number; span: number };
export const DEFAULT_RULES: CadenceRules = { introMs: INTRO_MS, gapMs: AD_GAP_MS, min: 20, span: 11 };
export const TEST_RULES: CadenceRules = { introMs: 0, gapMs: 0, min: 4, span: 3 };

export class AdCadence {
  private seen = new Set<string>();
  private remaining: number;
  private lastShown = -Infinity;
  private readonly random: () => number;
  readonly rules: CadenceRules;

  constructor(random = Math.random, rules: CadenceRules = DEFAULT_RULES) {
    this.random = random;
    this.rules = rules;
    this.remaining = this.interval();
  }

  private interval() { return this.rules.min + Math.floor(this.random() * this.rules.span); }

  /** Distinct items decided since the last pile letter. */
  review(ids: string[]) {
    for (const id of ids) {
      if (this.seen.has(id)) continue;
      this.seen.add(id);
      this.remaining--;
    }
  }

  between(activeMs: number) {
    return this.remaining <= 0 && activeMs >= this.rules.introMs && activeMs - this.lastShown >= this.rules.gapMs;
  }

  shown(activeMs: number, placement: 'deck' | 'finish' | 'review') {
    this.lastShown = activeMs;
    if (placement === 'deck') this.remaining = this.interval();
  }

  skipDeck() { this.remaining = this.interval(); }
}
