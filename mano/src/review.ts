/** Review-only scheduling. Cancelling a running request keeps its slot until
 * the native promise settles, so rapid scrolling never exceeds the limit. */
const aborted = () => new DOMException('Revisión cancelada', 'AbortError');
type Waiter<T> = { resolve: (value: T) => void; reject: (error: unknown) => void; detach: () => void };
type Job<T> = { key: string; run: (signal: AbortSignal) => Promise<T>; controller: AbortController; waiters: Set<Waiter<T>> };
export class ReviewLoader<T> {
  private jobs = new Map<string, Job<T>>();
  private waiting: Job<T>[] = [];
  private active = new Set<Job<T>>();
  private cache = new Map<string, T>();

  request(key: string, run: Job<T>['run'], signal: AbortSignal): Promise<T> {
    if (signal.aborted) return Promise.reject(aborted());
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!; this.cache.delete(key); this.cache.set(key, value);
      return Promise.resolve(value);
    }
    let job = this.jobs.get(key);
    if (!job || job.controller.signal.aborted) {
      job = { key, run, controller: new AbortController(), waiters: new Set() };
      this.jobs.set(key, job); this.waiting.push(job);
    }
    const task = job;
    return new Promise<T>((resolve, reject) => {
      const cancel = () => {
        task.waiters.delete(waiter); waiter.detach(); reject(aborted());
        if (!task.waiters.size) {
          task.controller.abort();
          if (this.jobs.get(key) === task) this.jobs.delete(key);
          this.waiting = this.waiting.filter(j => j !== task);
        }
      };
      const waiter: Waiter<T> = { resolve, reject, detach: () => signal.removeEventListener('abort', cancel) };
      task.waiters.add(waiter); signal.addEventListener('abort', cancel, { once: true });
      this.pump();
    });
  }

  forget(key: string) { this.cache.delete(key); }
  cancelAll() {
    this.waiting = [];
    for (const job of this.jobs.values()) {
      job.controller.abort();
      for (const waiter of job.waiters) { waiter.detach(); waiter.reject(aborted()); }
      job.waiters.clear();
    }
    this.jobs.clear();
  }
  private pump() {
    while (this.active.size < 2 && this.waiting.length) {
      const job = this.waiting.shift()!;
      if (job.controller.signal.aborted) continue;
      this.active.add(job);
      void Promise.resolve().then(() => {
        if (job.controller.signal.aborted) throw aborted();
        return job.run(job.controller.signal);
      }).then(value => {
        if (job.controller.signal.aborted) return;
        this.cache.set(job.key, value);
        while (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value!);
        for (const w of job.waiters) w.resolve(value);
      }).catch(error => { for (const w of job.waiters) w.reject(error); }).finally(() => {
        for (const w of job.waiters) w.detach(); job.waiters.clear();
        if (this.jobs.get(job.key) === job) this.jobs.delete(job.key);
        this.active.delete(job); this.pump();
      });
    }
  }
}

/** Three-column rows with two rows of overscan. A focused row stays mounted
 * even when pointer scrolling moves it out of view. No dependence on N assets. */
export function reviewRows(count: number, offset: number, viewport: number, height: number, gap: number, focused = -1): number[] {
  const total = Math.ceil(count / 3), pitch = Math.max(1, height + gap);
  const first = Math.max(0, Math.min(total, Math.floor(Math.max(0, offset) / pitch) - 2));
  const end = Math.min(total, Math.max(first, Math.ceil(Math.max(0, offset + viewport) / pitch) + 2));
  const rows = new Set(Array.from({ length: end - first }, (_, i) => first + i));
  if (focused >= 0 && focused < count) rows.add(Math.floor(focused / 3));
  return [...rows].sort((a, b) => a - b);
}
export const reviewHeight = (count: number, rowHeight: number, gap: number) => Math.max(0, Math.ceil(count / 3) * (rowHeight + gap) - gap);
