import { Capacitor } from '@capacitor/core';
import type { Asset } from './domain';
import { Library, thumbnail } from './library';

/** Poster only. Videos prepare separately (VideoStore) so a slow or failed
 * video download can never take its poster down with it, and vice versa. */
export type PreparedMedia = { poster: string };
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
 * another component's thumbnail. */
export async function prepareReviewAsset(asset: Asset, signal: AbortSignal): Promise<PreparedMedia> {
  if (signal.aborted) throw aborted();
  if (asset.demo) {
    const poster = await thumbnail(asset);
    await decodePoster(poster, signal);
    return { poster };
  }
  const requestId = `review-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const cancel = () => { void Library.cancelThumbnailPreparation({ requestId }).catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    const image = await Library.thumbnail({ id: asset.id, size: 900, requestId });
    if (signal.aborted) throw aborted();
    const poster = Capacitor.convertFileSrc(image.path);
    await decodePoster(poster, signal);
    return { poster };
  } catch (error) {
    cancel();
    throw error;
  } finally { signal.removeEventListener('abort', cancel); }
}

/* ---------- Video preparation ---------- */

/** Internal cause; the UI turns it into one plain message and one recovery. */
export type VideoFailure = 'download' | 'permission' | 'unavailable' | 'tooLarge' | 'prepare' | 'playback';
export type VideoState = { status: 'idle' | 'queued' | 'loading' | 'ready' | 'error'; progress: number; url?: string; failure?: VideoFailure };
type Job = { asset: Asset; requestId: string; cancelled: boolean };
const idle: VideoState = { status: 'idle', progress: 0 };
const videoKey = (asset: Asset) => `${asset.id}:${asset.modified ?? 0}`;
const failureFor = (error: unknown): VideoFailure | 'busy' | 'cancelled' => {
  const code = (error as { code?: string })?.code ?? '';
  const message = error instanceof Error ? error.message : '';
  if (code === 'PREPARATION_BUSY') return 'busy';
  if (code === 'PREPARATION_CANCELLED' || (error as Error)?.name === 'AbortError') return 'cancelled';
  if (code === 'VIDEO_DOWNLOAD_FAILED' || code === 'PREPARATION_TIMEOUT') return 'download';
  if (code === 'VIDEO_TOO_LARGE') return 'tooLarge';
  if (code === 'VIDEO_UNAVAILABLE' || /ya no está disponible/.test(message)) return 'unavailable';
  if (/Permite acceso/.test(message)) return 'permission';
  return 'prepare';
};
export function videoFailureCopy(failure?: VideoFailure): { message: string; action: 'retry' | 'settings' | 'fullscreen' | null } {
  switch (failure) {
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
  private progressListener?: Promise<{ remove(): Promise<void> }>;
  private disposed = false;

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
      if (this.states.get(key)?.status === 'ready') released.push(asset.id);
      this.states.delete(key); this.retries.delete(key);
    }
    this.wanted = next;
    for (const asset of next.values()) if (this.get(asset).status === 'idle') this.enqueue(asset, false);
    if (released.length && !assets[0]?.demo) void Library.releasePreparedVideos({ ids: released }).catch(() => {});
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

  /** A loaded file the WebView could not decode: let the user try fullscreen. */
  markPlaybackFailed(asset: Asset) { this.set(videoKey(asset), { status: 'error', progress: 0, failure: 'playback' }); }

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
      if (asset.demo) url = '/assets/demo-video.mp4';
      else {
        this.listen();
        const result = await Library.prepareVideo({ id: asset.id, requestId: job.requestId });
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
