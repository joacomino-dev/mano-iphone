import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { thumbnail } from './library';
import type { Asset } from './domain';
import { RequestQueue } from './requests';
import { cardPixels, previewPolicyKey, subscribePreviewPolicy } from './preview';
import { useSyncExternalStore } from 'react';
import { protectedMode, type BreakupMode } from './people';

export const PeopleBridge = registerPlugin<{
  command(options: Record<string, unknown>): Promise<unknown>;
  addListener(event: 'libraryChanged', callback: () => void): Promise<{ remove(): Promise<void> }>;
}>('People');
export const PeopleProtection = createContext<{ person?: string; mode?: BreakupMode; revision: number }>({ revision: 0 });

const redactions = new RequestQueue<string>(1,16);
export const clearPeoplePreviews = () => redactions.clear();

/** The unredacted URL never enters the DOM in protected mode. A stale result
 * cannot cross an asset/person/mode/index boundary, even for a single render. */
export function usePeopleProtection() { const { person, mode } = useContext(PeopleProtection); return protectedMode(person, mode); }

export function usePeopleImage(asset: Asset, size = cardPixels(asset)) {
  const { person, mode, revision } = useContext(PeopleProtection);
  const protectedPhoto = protectedMode(person, mode);
  const policy = useSyncExternalStore(subscribePreviewPolicy, previewPolicyKey);
  const [attempt, setAttempt] = useState(0);
  const key = `${asset.id}:${asset.modified ?? 0}:${person}:${mode}:${revision}:${size}:${policy}:${attempt}`;
  const [result, setResult] = useState<{ key: string; src: string }>();
  useEffect(() => {
    if (!protectedPhoto || mode !== 'face') return;
    const controller = new AbortController();
    void redactions.request(key, async () => {
      const value = await PeopleBridge.command({ action: 'redact', id: asset.id, person, size });
      const path = (value as { path?: unknown }).path;
      if (typeof path !== 'string') throw new Error('Protected preview unavailable');
      const url = Capacitor.convertFileSrc(path);
      return `${url}${url.includes('?')?'&':'?'}redacted=${attempt}`;
    }, controller.signal).then(src => {
      if (!controller.signal.aborted) setResult({ key, src });
    }).catch(() => { /* fail closed: never fall back to an original */ });
    return () => { controller.abort(); };
  }, [key, protectedPhoto]);
  return { protectedPhoto, src: result?.key === key ? result.src : undefined, key, retry:()=>setAttempt(n=>n+1) };
}

export function PeopleImage({ asset, allowReveal = true, size }: { asset: Asset; allowReveal?: boolean; size?: number }) {
  const { protectedPhoto, src, key, retry } = usePeopleImage(asset,size);
  const [reveal, setReveal] = useState<{ key: string; src: string }>();
  const [failed, setFailed] = useState('');
  const revealEpoch = useRef(0), revealRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const hide = () => { revealEpoch.current++; revealRequest.current?.abort(); setReveal(undefined); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('blur', hide);
    return () => { hide(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', hide); };
  }, [key]);
  useEffect(() => { if (!reveal) return; const timer = setTimeout(() => setReveal(undefined), 3000); return () => clearTimeout(timer); }, [reveal]);
  // Explicit temporary reveal is the only path that asks for an ordinary URL.
  const show = async () => {
    const epoch = ++revealEpoch.current; revealRequest.current?.abort();
    const controller = new AbortController(); revealRequest.current = controller;
    try { const url = await thumbnail(asset, 1000, false, false, controller.signal);
      if (!controller.signal.aborted && epoch === revealEpoch.current && !document.hidden) setReveal({ key, src: url });
    } catch { /* remain covered */ }
  };
  const shown = reveal?.key === key ? reveal.src : src;
  if (!protectedPhoto) return null;
  if (shown && failed !== shown) return <img src={shown} alt={reveal?.key === key ? 'Foto revelada temporalmente' : 'Rostro censurado'} draggable={false} decoding="async" onError={() => setFailed(shown)}/>;
  return <div className="photo-loading people-covered"><span>Fotografía oculta</span>{failed&&<button onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();retry();}}>Reintentar censura</button>}{allowReveal && <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); void show(); }}>Revelar durante 3 segundos</button>}</div>;
}
