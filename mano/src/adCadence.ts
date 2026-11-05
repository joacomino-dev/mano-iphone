export const INTRO_MS = 180_000;
export const AD_GAP_MS = 120_000;

export class AdCadence {
  private seen = new Set<string>();
  private remaining: number;
  private lastShown = -Infinity;
  private finishCount = 0;
  private finishDay = '';
  private finishAds = 0;
  private readonly random: () => number;

  constructor(random = Math.random, saved?: { day: string; ads: number; count: number }) {
    this.random = random;
    if (saved && Number.isInteger(saved.ads) && Number.isInteger(saved.count) &&
        saved.ads >= 0 && saved.ads <= 2 && saved.count >= 0 && typeof saved.day === 'string') {
      this.finishDay = saved.day;
      this.finishAds = saved.ads;
      this.finishCount = saved.count;
    }
    this.remaining = this.interval();
  }

  private interval() { return 30 + Math.floor(this.random() * 11); }

  review(ids: string[]) {
    for (const id of ids) {
      if (this.seen.has(id)) continue;
      this.seen.add(id);
      this.remaining--;
    }
  }

  between(activeMs: number) {
    return this.remaining <= 0 && activeMs >= INTRO_MS;
  }

  finish(activeMs: number, day: string) {
    if (day !== this.finishDay) {
      this.finishDay = day;
      this.finishAds = 0;
    }
    if (activeMs < INTRO_MS || this.finishAds >= 2) return false;
    if (this.finishCount > 0 && activeMs - this.lastShown < AD_GAP_MS) return false;
    this.finishCount++;
    return this.finishCount % 3 === 1;
  }

  finishSnapshot() {
    return { day: this.finishDay, ads: this.finishAds, count: this.finishCount };
  }

  shown(activeMs: number, placement: 'deck' | 'finish') {
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
