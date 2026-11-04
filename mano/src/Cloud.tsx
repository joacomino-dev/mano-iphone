import { useCallback, useSyncExternalStore, type SyntheticEvent } from 'react';
import { CloudIcon, CloudArrowDownIcon, CloudSlashIcon, ArrowClockwiseIcon } from '@phosphor-icons/react';
import type { Asset } from './domain';
import { cloudPreviews, type CloudState } from './media';

/** The live iCloud state of one item's preview (media.ts `cloudPreviews`). */
export function useCloud(asset: Asset | undefined): CloudState | undefined {
  const id = asset?.id, modified = asset?.modified;
  const subscribe = useCallback((listener: () => void) => asset ? cloudPreviews.subscribe(asset, listener) : () => {}, [id, modified]);
  return useSyncExternalStore(subscribe, () => asset ? cloudPreviews.state(asset) : undefined);
}

const stop = (e: SyntheticEvent) => e.stopPropagation();
const R = 7.4, C = 2 * Math.PI * R;

/** The cloud mark inside a ring: the ring fills with the real download
 * progress, turns (indeterminate) while PhotoKit has not reported any yet, and
 * is absent when nothing is downloading. Reduce Motion: no turning. */
function CloudRing({ state, size = 20 }: { state?: CloudState; size?: number }) {
  const known = state?.status === 'downloading' && typeof state.progress === 'number';
  const busy = state?.status === 'pending' || state?.status === 'retrying' || state?.status === 'downloading';
  const failed = state?.status === 'error';
  const Icon = failed ? CloudSlashIcon : CloudIcon;
  return <span className={`cloud-ring ${busy ? 'is-busy' : ''} ${known ? 'is-known' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
    {busy && <svg className="cloud-progress-ring" viewBox="0 0 18 18"><circle className="cloud-ring-track" cx="9" cy="9" r={R}/><g className="cloud-ring-spin"><circle className="cloud-ring-arc" cx="9" cy="9" r={R} strokeDasharray={known ? `${C * Math.max(.04, state!.progress!)} ${C}` : `${C * .28} ${C}`}/></g></svg>}
    <Icon size={busy ? size * .6 : size * .8} weight="bold"/>
  </span>;
}

/** One indicator for an item that lives in iCloud — the same one on the card
 * and in the anchored view. It reads only real states: the smaller version
 * already on the iPhone («vista ligera»), a requested download (pending, then
 * real progress), a retry, a failure with «Reintentar». It disappears when the
 * preview has arrived. Progress is not announced on every step: VoiceOver hears
 * the changes of state, and can read the value on the progress bar. */
export function CloudBadge({ state, lite, onRetry, className = '' }: { state?: CloudState; lite: boolean; onRetry?: () => void; className?: string }) {
  const status = state?.status;
  if (status === 'ready') return null;
  if (!status && !lite) return null;
  const percent = status === 'downloading' && typeof state?.progress === 'number' ? Math.round(state.progress * 100) : undefined;
  const label = status === 'error' ? 'No se pudo descargar' : status === 'retrying' ? 'Reintentando' : status === 'downloading' ? `${percent ?? 0} %` : status === 'pending' ? 'iCloud' : 'iCloud · vista ligera';
  const spoken = status === 'error' ? 'No se pudo descargar de iCloud' : status === 'retrying' ? 'Reintentando la descarga de iCloud' : status ? 'Descargando de iCloud' : 'Vista ligera; el original está en iCloud';
  return <span className={`cloud-chip ${status ? `is-${status}` : 'is-lite'} ${className}`}>
    <span role="progressbar" aria-label="Descarga de iCloud" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={spoken}><CloudRing state={state}/></span>
    <span className="cloud-chip-label" aria-hidden="true">{label}</span>
    <span className="sr-only" role="status">{spoken}</span>
    {status === 'error' && onRetry && <button onPointerDown={stop} onClick={e => { stop(e); onRetry(); }}><ArrowClockwiseIcon size={14} weight="bold"/>Reintentar</button>}
  </span>;
}

/** A card with nothing of it on the iPhone yet: the same indicator, larger,
 * and — when nothing downloads by itself («Ahorrar iCloud») — the one button
 * that fetches just this preview. */
export function CloudPlaceholder({ state, download, retry, quiet }: { state?: CloudState; download: () => void; retry: () => void; quiet?: boolean }) {
  if (quiet) return <div className="photo-loading is-cloud"/>;
  const status = state?.status;
  const percent = status === 'downloading' && typeof state?.progress === 'number' ? Math.round(state.progress * 100) : undefined;
  return <div className="photo-loading is-cloud">
    <CloudRing state={state} size={40}/>
    <span role="status">{status === 'downloading' ? `Descargando de iCloud · ${percent ?? 0} %` : status === 'pending' ? 'Pidiendo a iCloud…' : status === 'retrying' ? 'Reintentando…' : status === 'error' ? 'No se pudo descargar' : 'En iCloud'}</span>
    {!status && <button onPointerDown={stop} onClick={e => { stop(e); download(); }}><CloudArrowDownIcon size={16} weight="bold"/>Descargar vista previa</button>}
    {status === 'error' && <button onPointerDown={stop} onClick={e => { stop(e); retry(); }}><ArrowClockwiseIcon size={16} weight="bold"/>Reintentar</button>}
  </div>;
}
