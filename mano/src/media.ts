import { Capacitor } from '@capacitor/core';
import type { Asset } from './domain';
import { Library, thumbnail } from './library';

export type PreparedMedia = { poster: string; video?: string };
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
 * another component's thumbnail or release an unbounded background download. */
export async function prepareReviewAsset(asset: Asset, signal: AbortSignal): Promise<PreparedMedia> {
  if (signal.aborted) throw aborted();
  if (asset.demo) {
    const poster = await thumbnail(asset);
    await decodePoster(poster, signal);
    return { poster, video: asset.kind === 'video' ? '/assets/demo-video.mp4' : undefined };
  }
  const requestId = `review-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const cancel = () => {
    void Library.cancelThumbnailPreparation({ requestId }).catch(() => {});
    if (asset.kind === 'video') void Library.cancelVideoPreparation({ requestId }).catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    const [image, video] = await Promise.all([
      Library.thumbnail({ id: asset.id, size: 900, requestId }),
      asset.kind === 'video' ? Library.prepareVideo({ id: asset.id, requestId }) : Promise.resolve(undefined),
    ]);
    if (signal.aborted) throw aborted();
    const poster = Capacitor.convertFileSrc(image.path);
    await decodePoster(poster, signal);
    return { poster, video: video ? Capacitor.convertFileSrc(video.path) : undefined };
  } catch (error) {
    cancel();
    throw error;
  } finally { signal.removeEventListener('abort', cancel); }
}
