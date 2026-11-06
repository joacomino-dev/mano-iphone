/** 9.8.1: one letter every 20–30 photos, the first after a minute of sorting. */
export const INTRO_MS = 60_000;
export const AD_GAP_MS = 30_000;

/** Cadence rules. The defaults are the product rules; TEST_RULES only apply
 * in «Modo de prueba» so the owner can see and judge ads quickly. */
export type CadenceRules = { introMs: number; gapMs: number; min: number; span: number; finishEvery: number; finishDaily: number };
export const DEFAULT_RULES: CadenceRules = { introMs: INTRO_MS, gapMs: AD_GAP_MS, min: 20, span: 11, finishEvery: 3, finishDaily: 2 };
export const TEST_RULES: CadenceRules = { introMs: 0, gapMs: 0, min: 4, span: 3, finishEvery: 2, finishDaily: 99 };

export class AdCadence {
  private seen = new Set<string>();
  private remaining: number;
  private lastShown = -Infinity;
  private finishCount = 0;
  private finishDay = '';
  private finishAds = 0;
  private readonly random: () => number;
  readonly rules: CadenceRules;

  constructor(random = Math.random, saved?: { day: string; ads: number; count: number }, rules: CadenceRules = DEFAULT_RULES) {
    this.random = random;
    this.rules = rules;
    if (saved && Number.isInteger(saved.ads) && Number.isInteger(saved.count) &&
        saved.ads >= 0 && saved.ads <= rules.finishDaily && saved.count >= 0 && typeof saved.day === 'string') {
      this.finishDay = saved.day;
      this.finishAds = saved.ads;
      this.finishCount = saved.count;
    }
    this.remaining = this.interval();
  }

  private interval() { return this.rules.min + Math.floor(this.random() * this.rules.span); }

  review(ids: string[]) {
    for (const id of ids) {
      if (this.seen.has(id)) continue;
      this.seen.add(id);
      this.remaining--;
    }
  }

  between(activeMs: number) {
    return this.remaining <= 0 && activeMs >= this.rules.introMs;
  }

  finish(activeMs: number, day: string) {
    if (day !== this.finishDay) {
      this.finishDay = day;
      this.finishAds = 0;
    }
    if (activeMs < this.rules.introMs || this.finishAds >= this.rules.finishDaily) return false;
    if (this.finishCount > 0 && activeMs - this.lastShown < this.rules.gapMs) return false;
    this.finishCount++;
    return this.finishCount % this.rules.finishEvery === (this.rules.finishEvery === 1 ? 0 : 1);
  }

  /** Whether the next close would carry the summary letter (same rules as
   * finish(), without counting): «Una última mirada» then leaves the prepared ad
   * to the summary, so the two letters take turns instead of both showing. */
  finishDue(activeMs: number, day: string) {
    const ads = day === this.finishDay ? this.finishAds : 0;
    if (activeMs < this.rules.introMs || ads >= this.rules.finishDaily) return false;
    if (this.finishCount > 0 && activeMs - this.lastShown < this.rules.gapMs) return false;
    return (this.finishCount + 1) % this.rules.finishEvery === (this.rules.finishEvery === 1 ? 0 : 1);
  }

  finishSnapshot() {
    return { day: this.finishDay, ads: this.finishAds, count: this.finishCount };
  }

  shown(activeMs: number, placement: 'deck' | 'finish' | 'review') {
    this.lastShown = activeMs;
    if (placement === 'finish') this.finishAds++;
    if (placement === 'deck' || this.remaining <= 0) this.remaining = this.interval();
  }

  missedFinish() {
    // Try again at the next eligible close if the scheduled placement did not render.
    this.finishCount = Math.max(0, this.finishCount - 1);
  }

  skipDeck() { this.remaining = this.interval(); }
}
