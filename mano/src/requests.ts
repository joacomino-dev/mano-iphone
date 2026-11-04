const abortError = () => new DOMException('Solicitud cancelada', 'AbortError');
type Waiter<T> = { resolve: (value: T) => void; reject: (e: unknown) => void; detach: () => void; progress?: (value: number) => void };
type Job<T> = { key: string; priority: boolean; controller: AbortController; run: (signal: AbortSignal, progress: (value: number) => void) => Promise<T>; waiters: Set<Waiter<T>> };

/** Shared bounded work, including native promises still settling after abort.
 * Consumers own subscriptions, not the underlying request. Only the last one
 * leaving cancels it. Cache holds file references, never decoded media. */
export class RequestQueue<T> {
  private jobs = new Map<string, Job<T>>();
  private waiting: Job<T>[] = [];
  private active = new Set<Job<T>>();
  private cache = new Map<string, T>();
  private limit: number;
  private cacheLimit: number;
  constructor(limit = 2, cacheLimit = 240) { this.limit = limit; this.cacheLimit = cacheLimit; }
  forget(key: string) { this.cache.delete(key); }
  clear() { this.cache.clear(); }
  request(key: string, run: Job<T>['run'], signal?: AbortSignal, priority = false, progress?: (value: number) => void): Promise<T> {
    if (signal?.aborted) return Promise.reject(abortError());
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!; this.cache.delete(key); this.cache.set(key, value);
      return Promise.resolve(value);
    }
    let job = this.jobs.get(key);
    if (!job || job.controller.signal.aborted) {
      job = { key, run, priority, controller: new AbortController(), waiters: new Set() };
      this.jobs.set(key, job); this.waiting.push(job);
    } else if (priority) job.priority = true;
    const task = job;
    return new Promise<T>((resolve, reject) => {
      const cancel = () => {
        task.waiters.delete(waiter); waiter.detach(); reject(abortError());
        if (!task.waiters.size) {
          task.controller.abort(); this.waiting = this.waiting.filter(j => j !== task);
          if (this.jobs.get(key) === task) this.jobs.delete(key);
        }
      };
      const waiter: Waiter<T> = { resolve, reject, progress, detach: () => signal?.removeEventListener('abort', cancel) };
      task.waiters.add(waiter); signal?.addEventListener('abort', cancel, { once: true }); this.pump();
    });
  }
  private pump() {
    while (this.active.size < this.limit && this.waiting.length) {
      const priority = this.waiting.findIndex(j => j.priority);
      const [job] = this.waiting.splice(priority < 0 ? 0 : priority, 1);
      if (job.controller.signal.aborted) continue;
      this.active.add(job);
      void Promise.resolve().then(() => {
        if (job.controller.signal.aborted) throw abortError();
        return job.run(job.controller.signal, value => {
          if (!job.controller.signal.aborted) for (const w of job.waiters) w.progress?.(value);
        });
      }).then(value => {
        if (job.controller.signal.aborted) return;
        this.cache.set(job.key, value);
        while (this.cache.size > this.cacheLimit) this.cache.delete(this.cache.keys().next().value!);
        if (this.jobs.get(job.key) === job) this.jobs.delete(job.key);
        for (const w of job.waiters) w.resolve(value);
      }).catch(error => { if (this.jobs.get(job.key) === job) this.jobs.delete(job.key); for (const w of job.waiters) w.reject(error); }).finally(() => {
        for (const w of job.waiters) w.detach(); job.waiters.clear();
        if (this.jobs.get(job.key) === job) this.jobs.delete(job.key);
        this.active.delete(job); this.pump();
      });
    }
  }
}
