/** Bounded rolling window; monotonic time supplied by the event handler. */
export class EmptyFinishPresses {
  private presses: number[] = [];
  press(now: number): boolean {
    this.presses = this.presses.filter(t => now >= t && now - t <= 3000);
    this.presses.push(now);
    if (this.presses.length < 3) return false;
    this.presses = []; return true;
  }
  clear() { this.presses = []; }
}
