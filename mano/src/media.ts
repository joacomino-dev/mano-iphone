import { Capacitor } from '@capacitor/core';
import type { Asset } from './domain';
import { Library, isNative, thumbnailInfo, inCloudError, clearThumbnailReferences } from './library';
import { cardPixels, cloudDownloads, zoomPixels } from './preview';

/** Poster only. Videos prepare separately (VideoStore) so a slow or failed
 * video download can never take its poster down with it, and vice versa.
 * `cloud`: the poster is the smaller version already on the iPhone (iCloud);
 * `missing`: nothing of it is on the iPhone yet (empty poster). */
export type PreparedMedia = { poster: string; cloud?: boolean; missing?: boolean };
const aborted = () => new DOMException('Preparación cancelada', 'AbortError');
function decodePoster(src: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    const image = new Image();
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); image.onload = null; image.onerror = null; };
    const cancel = () => { cleanup(); image.src = ''; reject(aborted()); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('No se pudo cargar la vista previa.')); }, 20000);
    signal.addEventListener('abort', cancel, { once: true });
    image.onload = () => { cleanup(); resolve(); };
    image.onerror = () => { cleanup(); reject(new Error('No se pudo cargar la vista previa.')); };
    image.src = src;
  });
}

/** Native requests are owned by this task, so cancelling one window cannot cancel
 * another component's thumbnail.
 *
 * Local first, always: a card never waits on the network to appear. What is on
 * the iPhone (the preview, or the smaller version of an iCloud original) is
 * prepared and decoded here; with «Descargar siempre» the full preview then
 * downloads behind it through `cloudPreviews` (tracked, shared, cancellable),
 * and the card swaps to it in place when it lands. */
export async function prepareReviewAsset(asset: Asset, signal: AbortSignal): Promise<PreparedMedia> {
  if (signal.aborted) throw aborted();
  let local: { src: string; cloud: boolean };
  try { local = asset.demo ? await thumbnailInfo(asset, cardPixels(asset), false, false) : await nativeThumbnail(asset, cardPixels(asset), 'review', signal, false); }
  catch (error) {
    if (!inCloudError(error)) throw error;
    if (cloudDownloads()) void cloudPreviews.fetch(asset, 'card').catch(() => {});
    return { poster: '', cloud: true, missing: true };
  }
  await decodePoster(local.src, signal);
  if (local.cloud && cloudDownloads()) void cloudPreviews.fetch(asset, 'card').catch(() => {});
  return { poster: local.src, cloud: local.cloud };
}

/** One native preview request owned by the caller's signal: cancelled natively
 * on abort, its file path converted for the WebView. `network` false stays on
 * the iPhone; `onProgress` follows an iCloud download (0–1). */
async function nativeThumbnail(asset: Asset, size: number, prefix: string, signal: AbortSignal, network: boolean, track?: (cancel: () => void) => void, onProgress?: (value: number) => void) {
  return thumbnailInfo(asset, size, false, network, signal, onProgress, prefix === 'zoom' || prefix === 'review');
}
/** Demonstration only: an iCloud download that takes a moment, with progress. */
function simulateDownload(signal: AbortSignal, onProgress?: (value: number) => void, ms = 1400) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    const started = performance.now();
    const timer = setInterval(() => { const value = Math.min(1, (performance.now() - started) / ms); onProgress?.(value); if (value >= 1) { clearInterval(timer); resolve(); } }, 80);
    signal.addEventListener('abort', () => { clearInterval(timer); reject(aborted()); }, { once: true });
  });
}

/** The larger preview for the anchored/zoomed view, on demand and one at a
 * time (the previous request is cancelled natively). Decoded off screen, so the
 * caller can swap it into the same <img> without a blank frame or reframing.
 * Anchoring is asking to look closer, so this one may download from iCloud;
 * `onProgress` lets the view say so while it happens. */
/** Sharper versions fetched on purpose (anchor/zoom) replace a card's «vista
 * ligera» for the rest of the session; natively, the card size is also fetched
 * once with network so the next launch finds it cached on the iPhone. */
const sharp = new Map<string, string>();
const sharpListeners = new Set<() => void>();
const sharpKey = (asset: Pick<Asset, 'id' | 'modified'>) => `${asset.id}:${asset.modified ?? 0}`;
export const sharpPreview = (asset: Pick<Asset, 'id' | 'modified'>) => sharp.get(sharpKey(asset));
export function subscribeSharp(listener: () => void) { sharpListeners.add(listener); return () => { sharpListeners.delete(listener); }; }
function keepSharp(asset: Asset, src: string) {
  sharp.delete(sharpKey(asset)); sharp.set(sharpKey(asset), src);
  // Only anchored items, but still bounded for very long sessions.
  while (sharp.size > 80) sharp.delete(sharp.keys().next().value!);
  for (const listener of sharpListeners) listener();
}
/** Warm the previews the person is about to see (e.g. while choosing filters):
 * the native disk cache then answers the stack at once. Same network rule as
 * the cards; never more than a handful. */
let warming = 0;
export function prewarm(assets: Asset[]) {
  // One batch at a time, and only two when that may mean iCloud downloads.
  if (warming) return;
  const batch = assets.slice(0, cloudDownloads() ? 2 : 6);
  warming = batch.length;
  for (const asset of batch) void (async () => {
    const local = await thumbnailInfo(asset, cardPixels(asset), false, false);
    if (local.cloud && cloudDownloads()) await cloudPreviews.fetch(asset, 'card');
  })().catch(error => { if (inCloudError(error) && cloudDownloads()) void cloudPreviews.fetch(asset, 'card').catch(() => {}); }).finally(() => { warming--; });
}

/* ---------- iCloud previews: one tracked download per item ---------- */

/** What the iCloud indicator shows, always from a real request:
 * - pending: asked for, no bytes yet (indeterminate);
 * - downloading: PhotoKit reports progress (0–1) while bytes arrive;
 * - ready: the preview is here (`src`); retrying: one automatic retry after a
 *   transient failure; error: it failed (the card offers «Reintentar»);
 * A card that leaves the table drops its job (cancelled natively, no state).
 * A request answered from the iPhone never reports progress and never shows. */
export type CloudStatus = 'pending' | 'downloading' | 'ready' | 'retrying' | 'error';
export type CloudState = { status: CloudStatus; progress?: number; src?: string; zoom: boolean };
type CloudJob = { key: string; asset: Asset; zoom: boolean; priority: boolean; state: CloudState; started: boolean; attempts: number;
  controller: AbortController; promise: Promise<string>; resolve: (src: string) => void; reject: (error: unknown) => void };
const TRANSIENT = new Set(['PREPARATION_TIMEOUT', 'THUMBNAIL_UNAVAILABLE']);

/** Card previews and anchored (zoom) previews that need iCloud, shared by the
 * card, «Anclar», the hold gesture and the read-ahead window:
 * - one job per item: asking again joins it (no second download of the same
 *   item); anchoring while the card preview downloads waits for it and then
 *   asks for the larger size, which PhotoKit answers from what just arrived;
 * - at most two at a time, the card on screen and the anchored one first;
 * - items that leave the table are cancelled natively (`retain`).
 * Originals are never requested: only preview sizes (preview.ts). */
class CloudPreviews {
  private jobs = new Map<string, CloudJob>();
  private listeners = new Map<string, Set<() => void>>();
  private running = 0;
  reset() {
    const jobs = [...this.jobs.values()]; this.jobs.clear();
    for (const job of jobs) { job.controller.abort(); job.reject(aborted()); this.notify(job.key); }
  }

  state(asset: Asset): CloudState | undefined { return this.jobs.get(videoKey(asset))?.state; }
  subscribe(asset: Asset, listener: () => void) {
    const key = videoKey(asset); const set = this.listeners.get(key) ?? new Set();
    set.add(listener); this.listeners.set(key, set);
    return () => { set.delete(listener); if (!set.size) this.listeners.delete(key); };
  }

  /** The card-size preview (`card`) or the anchored size (`zoom`), downloading
   * if needed. Resolves with the file to show. */
  fetch(asset: Asset, purpose: 'card' | 'zoom', priority = false): Promise<string> {
    const key = videoKey(asset); const existing = this.jobs.get(key);
    if (existing && existing.state.status !== 'error') {
      if (purpose === 'zoom' && !existing.zoom) { existing.zoom = true; this.set(existing, { ...existing.state, zoom: true }); if (existing.state.status === 'ready') return this.restart(existing); }
      if (priority && !existing.priority) { existing.priority = true; this.pump(); }
      return existing.promise;
    }
    let resolve!: (src: string) => void, reject!: (error: unknown) => void;
    const promise = new Promise<string>((ok, fail) => { resolve = ok; reject = fail; });
    const job: CloudJob = { key, asset, zoom: purpose === 'zoom', priority, state: { status: 'pending', zoom: purpose === 'zoom' }, started: false, attempts: 0, controller: new AbortController(), promise, resolve, reject };
    this.jobs.set(key, job); this.notify(key); this.pump();
    return promise;
  }

  /** «Reintentar» after an error. */
  retry(asset: Asset, purpose: 'card' | 'zoom' = 'card') { const job = this.jobs.get(videoKey(asset)); if (job?.state.status === 'error') this.jobs.delete(job.key); return this.fetch(asset, job?.zoom ? 'zoom' : purpose, true); }

  /** Cancel what is no longer on the table or in the read-ahead window. */
  retain(keep: Iterable<Asset>) {
    const wanted = new Set([...keep].map(videoKey));
    for (const job of [...this.jobs.values()]) {
      if (wanted.has(job.key) || job.state.status === 'ready') continue;
      job.controller.abort(); this.jobs.delete(job.key);
      job.reject(aborted()); this.notify(job.key);
    }
    // Finished jobs only hold a file reference: keep enough for the ten
    // undoable hands (Photo asks again from the iPhone if one was dropped).
    const done = [...this.jobs.values()].filter(j => j.state.status === 'ready' && !wanted.has(j.key));
    for (const job of done.slice(0, Math.max(0, done.length - 48))) this.jobs.delete(job.key);
  }
  /** The anchored view closed: its download keeps going (the card gets the
   * sharper version) but no longer jumps ahead of the next cards' previews. */
  yieldPriority(asset: Asset) { const job = this.jobs.get(videoKey(asset)); if (job && job.state.status !== 'ready') job.priority = false; }

  private restart(job: CloudJob) {
    // A card preview already here and now the anchored size is wanted: one more
    // local request (the bytes arrived with the card), tracked the same way.
    const next = { ...job, started: false, attempts: 0, controller: new AbortController() } as CloudJob;
    next.promise = new Promise<string>((ok, fail) => { next.resolve = ok; next.reject = fail; });
    next.state = { status: 'pending', zoom: true, src: job.state.src };
    this.jobs.set(job.key, next); this.notify(job.key); this.pump();
    return next.promise;
  }

  private pump() {
    while (this.running < 2) {
      const waiting = [...this.jobs.values()].filter(j => !j.started && (j.state.status === 'pending' || j.state.status === 'retrying'));
      const job = waiting.find(j => j.priority) ?? waiting[0];
      if (!job) return;
      job.started = true; this.running++;
      void this.run(job).finally(() => { this.running--; this.pump(); });
    }
  }

  private async run(job: CloudJob) {
    const { asset, controller } = job;
    const progress = (value: number) => { if (this.jobs.get(job.key) === job && !controller.signal.aborted) this.set(job, { ...job.state, status: 'downloading', progress: Math.max(job.state.progress ?? 0, Math.min(1, value)) }); };
    try {
      let src = '';
      // Anchoring goes straight to the larger size (one download). A card
      // download that the person then anchors finishes first; the larger size
      // follows from the bytes that just arrived.
      let zoom = job.zoom;
      for (;;) {
        const size = zoom ? zoomPixels(asset) : cardPixels(asset);
        if (asset.demo) {
          // Demonstration only: a stand-in «iCloud» item that takes a moment.
          if (asset.cloud && !job.state.src) await simulateDownload(controller.signal, progress, 2200);
          src = (await thumbnailInfo(asset, size, false, true)).src;
        } else src = (await nativeThumbnail(asset, size, zoom ? 'zoom' : 'cloud', controller.signal, true, undefined, progress)).src;
        await decodePoster(src, controller.signal);
        if (this.jobs.get(job.key) !== job) return;
        if (!zoom && job.zoom) { zoom = true; this.set(job, { status: 'pending', zoom: true, src }); continue; }
        this.set(job, { status: 'ready', zoom: job.zoom, src });
        break;
      }
      job.resolve(src);
      if (job.zoom) keepSharp(asset, src);
    } catch (error) {
      if (this.jobs.get(job.key) !== job || controller.signal.aborted) return;
      const code = (error as { code?: string })?.code ?? '';
      if (TRANSIENT.has(code) && job.attempts < 1) {
        job.attempts++; job.started = false; this.set(job, { ...job.state, status: 'retrying', progress: undefined });
        await new Promise(r => setTimeout(r, 1200));
        if (this.jobs.get(job.key) === job) this.pump();
        return;
      }
      this.set(job, { ...job.state, status: 'error', progress: undefined }); job.reject(error);
    }
  }

  private set(job: CloudJob, state: CloudState) { job.state = state; this.notify(job.key); }
  private notify(key: string) { for (const listener of [...(this.listeners.get(key) ?? [])]) listener(); }
}
export const cloudPreviews = new CloudPreviews();
export function resetPreviewPolicy() {
  clearThumbnailReferences(); cloudPreviews.reset(); sharp.clear();
  for (const listener of sharpListeners) listener();
}

/** The larger preview for the anchored/zoomed view, on demand. Decoded off
 * screen, so the caller can swap it into the same <img> without a blank frame
 * or reframing. Anchoring is asking to look closer, so it may download from
 * iCloud; it joins a download already under way for the same item (the card's,
 * or the one started when the person began holding the card). */
export async function loadZoomPreview(asset: Asset, signal: AbortSignal): Promise<string> {
  if (signal.aborted) throw aborted();
  const cancel = () => cloudPreviews.yieldPriority(asset);
  signal.addEventListener('abort', cancel, { once: true });
  try { const src = await cloudPreviews.fetch(asset, 'zoom', true); if (signal.aborted) throw aborted(); return src; }
  finally { signal.removeEventListener('abort', cancel); }
}

/* ---------- Video preparation ---------- */

/** Internal cause; the UI turns it into one plain message and one recovery. */
export type VideoFailure = 'download' | 'permission' | 'unavailable' | 'tooLarge' | 'prepare' | 'playback' | 'cloud';
export type VideoState = { status: 'idle' | 'queued' | 'loading' | 'ready' | 'error'; progress: number; url?: string; failure?: VideoFailure };
type Job = { asset: Asset; requestId: string; cancelled: boolean };
const idle: VideoState = { status: 'idle', progress: 0 };
const videoKey = (asset: Asset) => `${asset.id}:${asset.modified ?? 0}`;
const failureFor = (error: unknown): VideoFailure | 'busy' | 'cancelled' => {
  const code = (error as { code?: string })?.code ?? '';
  const message = error instanceof Error ? error.message : '';
  if (code === 'PREPARATION_BUSY') return 'busy';
  if (code === 'IN_CLOUD') return 'cloud';
  if (code === 'PREPARATION_CANCELLED' || (error as Error)?.name === 'AbortError') return 'cancelled';
  if (code === 'VIDEO_DOWNLOAD_FAILED' || code === 'PREPARATION_TIMEOUT') return 'download';
  if (code === 'VIDEO_TOO_LARGE') return 'tooLarge';
  if (code === 'VIDEO_UNAVAILABLE' || /ya no está disponible/.test(message)) return 'unavailable';
  if (/Permite acceso/.test(message)) return 'permission';
  return 'prepare';
};
export function videoFailureCopy(failure?: VideoFailure): { message: string; action: 'retry' | 'settings' | 'fullscreen' | 'download' | null } {
  switch (failure) {
    case 'cloud': return { message: 'Está en iCloud. Decide sin descargarlo o descárgalo para verlo.', action: 'download' };
    case 'download': return { message: 'No se pudo descargar de iCloud. Revisa tu conexión.', action: 'retry' };
    case 'permission': return { message: 'CocoWash necesita acceso a este vídeo.', action: 'settings' };
    case 'unavailable': return { message: 'Este vídeo ya no está en Fotos.', action: null };
    case 'tooLarge': return { message: 'Es muy largo para verlo aquí.', action: 'fullscreen' };
    case 'playback': return { message: 'No se puede reproducir aquí.', action: 'fullscreen' };
    default: return { message: 'No se pudo preparar el vídeo.', action: 'retry' };
  }
}

/** At most two native preparations: one reserved for the card on top of the
 * stack, one for prefetching the next videos. Busy natives are retried with
 * back-off instead of surfacing as errors, and stale results are discarded. */
export class VideoStore {
  private states = new Map<string, VideoState>();
  private listeners = new Map<string, Set<(state: VideoState) => void>>();
  private queue: { asset: Asset; priority: boolean }[] = [];
  private active = new Map<string, Job>();
  private byRequest = new Map<string, string>();
  private wanted = new Map<string, Asset>();
  private retries = new Map<string, number>();
  /** Videos the person chose to download although «Ahorrar iCloud» is on. */
  private allowed = new Set<string>();
  private progressListener?: Promise<{ remove(): Promise<void> }>;
  private disposed = false;
  private network = cloudDownloads();
  reconcilePolicy() {
    const network = cloudDownloads(); if (network === this.network) return;
    this.network = network;
    for (const asset of this.wanted.values()) {
      const key = videoKey(asset), state = this.get(asset);
      if (network && state.status === 'error' && state.failure === 'cloud') {
        this.set(key, idle); this.enqueue(asset, false);
      } else if (!network && !this.allowed.has(key) && state.status !== 'ready') {
        this.cancel(key); this.queue = this.queue.filter(q => videoKey(q.asset) !== key);
        this.set(key, idle); this.enqueue(asset, false);
      }
    }
    this.pump();
  }

  get(asset: Asset): VideoState { return this.states.get(videoKey(asset)) ?? idle; }

  subscribe(asset: Asset, listener: (state: VideoState) => void) {
    const key = videoKey(asset);
    const set = this.listeners.get(key) ?? new Set();
    set.add(listener); this.listeners.set(key, set);
    listener(this.get(asset));
    return () => { set.delete(listener); if (!set.size) this.listeners.delete(key); };
  }

  /** The rolling review window. Videos leaving it are cancelled and unpinned. */
  want(assets: Asset[]) {
    if (this.disposed) return;
    const next = new Map(assets.filter(a => a.kind === 'video').map(a => [videoKey(a), a] as const));
    const released: string[] = [];
    for (const [key, asset] of this.wanted) if (!next.has(key)) {
      this.cancel(key);
      this.queue = this.queue.filter(q => videoKey(q.asset) !== key);
      // Unpin whatever left, ready or not: a preparation cancelled here may still
      // have been committed (and pinned) natively before the cancel arrived.
      released.push(asset.id);
      this.states.delete(key); this.retries.delete(key);
    }
    this.wanted = next;
    for (const asset of next.values()) if (this.get(asset).status === 'idle') this.enqueue(asset, false);
    if (released.length && isNative) void Library.releasePreparedVideos({ ids: released }).catch(() => {});
    this.pump();
  }

  /** Visible card: jump the queue. */
  ensure(asset: Asset) {
    if (this.disposed || asset.kind !== 'video') return;
    const state = this.get(asset);
    if (state.status === 'ready' || state.status === 'loading') return;
    if (state.status === 'error') return;
    this.queue = this.queue.filter(q => videoKey(q.asset) !== videoKey(asset));
    this.enqueue(asset, true);
    this.pump();
  }

  retry(asset: Asset) {
    const key = videoKey(asset);
    if (this.disposed || this.get(asset).status !== 'error') return;
    this.retries.delete(key); this.set(key, { status: 'idle', progress: 0 });
    this.ensure(asset);
  }

  /** «Descargar y ver»: this one video may come from iCloud now. */
  download(asset: Asset) {
    const key = videoKey(asset);
    if (this.disposed) return;
    this.allowed.add(key); this.retries.delete(key); this.set(key, { status: 'idle', progress: 0 });
    this.ensure(asset);
  }

  dispose() {
    this.disposed = true;
    for (const key of [...this.active.keys()]) this.cancel(key);
    this.queue = []; this.listeners.clear();
    void this.progressListener?.then(l => l.remove()).catch(() => {});
    const ids = [...this.wanted.values()].filter(a => !a.demo).map(a => a.id);
    if (ids.length) void Library.releasePreparedVideos({ ids }).catch(() => {});
  }

  private enqueue(asset: Asset, priority: boolean) {
    const key = videoKey(asset);
    if (this.active.has(key)) return;
    this.set(key, { status: 'queued', progress: 0 });
    if (priority) this.queue.unshift({ asset, priority }); else this.queue.push({ asset, priority });
  }

  private set(key: string, state: VideoState) {
    this.states.set(key, state);
    for (const listener of this.listeners.get(key) ?? []) listener(state);
  }

  private cancel(key: string) {
    const job = this.active.get(key);
    if (!job) return;
    job.cancelled = true; this.active.delete(key); this.byRequest.delete(job.requestId);
    if (!job.asset.demo) void Library.cancelVideoPreparation({ requestId: job.requestId }).catch(() => {});
  }

  private pump() {
    if (this.disposed) return;
    while (this.queue.length && this.active.size < 2) {
      const reserved = this.active.size > 0; // keep one slot for the visible card
      const index = this.queue.findIndex(q => q.priority || !reserved);
      if (index < 0) break;
      const [{ asset }] = this.queue.splice(index, 1);
      void this.start(asset);
    }
  }

  private listen() {
    if (this.progressListener) return;
    this.progressListener = Library.addListener('mediaPreparationProgress', ({ requestId, phase, progress }) => {
      const key = this.byRequest.get(requestId);
      if (!key || this.disposed) return;
      const value = Math.max(0, Math.min(1, phase === 'prepare' ? .85 + progress * .15 : progress * .85));
      const current = this.states.get(key);
      if (current?.status === 'loading' && value > current.progress + .01) this.set(key, { ...current, progress: value });
    });
  }

  private async start(asset: Asset) {
    const key = videoKey(asset);
    const job: Job = { asset, requestId: `video-${Date.now()}-${Math.random().toString(36).slice(2)}`, cancelled: false };
    this.active.set(key, job); this.byRequest.set(job.requestId, key);
    this.set(key, { status: 'loading', progress: 0 });
    try {
      let url: string;
      const network = cloudDownloads() || this.allowed.has(key);
      if (asset.demo) {
        if (asset.cloud && !network) throw Object.assign(new Error('En iCloud'), { code: 'IN_CLOUD' });
        if (asset.cloud) {
          const controller = new AbortController(); const watch = setInterval(() => { if (job.cancelled || this.disposed) controller.abort(); }, 100);
          try { await simulateDownload(controller.signal, value => { const current = this.states.get(key); if (current?.status === 'loading') this.set(key, { ...current, progress: value * .95 }); }, 1800); }
          finally { clearInterval(watch); }
        }
        url = '/assets/demo-video.mp4';
      } else {
        this.listen();
        const result = await Library.prepareVideo({ id: asset.id, requestId: job.requestId, network });
        url = result.url ?? Capacitor.convertFileSrc(result.path);
      }
      if (job.cancelled || this.disposed) return;
      this.set(key, { status: 'ready', progress: 1, url });
    } catch (error) {
      if (job.cancelled || this.disposed) return;
      const failure = failureFor(error);
      const attempts = (this.retries.get(key) ?? 0) + 1;
      if (failure === 'busy' && attempts <= 20) {
        this.retries.set(key, attempts);
        this.set(key, { status: 'queued', progress: 0 });
        setTimeout(() => { if (!this.disposed && (this.wanted.has(key) || this.listeners.has(key)) && this.get(asset).status === 'queued') { this.queue.unshift({ asset, priority: true }); this.pump(); } }, 400 + attempts * 200);
      } else if (failure !== 'cancelled') {
        this.set(key, { status: 'error', progress: 0, failure: failure === 'busy' ? 'prepare' : failure });
      }
    } finally {
      if (this.active.get(key) === job) { this.active.delete(key); this.byRequest.delete(job.requestId); }
      this.pump();
    }
  }
}
