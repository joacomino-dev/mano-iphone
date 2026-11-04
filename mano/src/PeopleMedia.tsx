import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { thumbnail } from './library';
import type { Asset } from './domain';
import { RequestQueue } from './requests';
import { protectedMode, type BreakupMode } from './people';

export const PeopleBridge = registerPlugin<{
  command(options: Record<string, unknown>): Promise<unknown>;
  addListener(event: 'libraryChanged', callback: () => void): Promise<{ remove(): Promise<void> }>;
}>('People');
export const PeopleProtection = createContext<{ person?: string; mode?: BreakupMode; revision: number }>({ revision: 0 });

const redactions = new RequestQueue<string>(1,16);

/** The unredacted URL never enters the DOM in protected mode. A stale result
 * cannot cross an asset/person/mode/index boundary, even for a single render. */
export function usePeopleProtection() { const { person, mode } = useContext(PeopleProtection); return protectedMode(person, mode); }

export function usePeopleImage(asset: Asset) {
  const { person, mode, revision } = useContext(PeopleProtection);
  const protectedPhoto = protectedMode(person, mode);
  const key = `${asset.id}:${asset.modified ?? 0}:${person}:${mode}:${revision}`;
  const [result, setResult] = useState<{ key: string; src: string }>();
  useEffect(() => {
    if (!protectedPhoto || mode !== 'face') return;
    const controller = new AbortController();
    void redactions.request(key, async () => {
      const value = await PeopleBridge.command({ action: 'redact', id: asset.id, person });
      const path = (value as { path?: unknown }).path;
      if (typeof path !== 'string') throw new Error('Protected preview unavailable');
      return Capacitor.convertFileSrc(path);
    }, controller.signal).then(src => {
      if (!controller.signal.aborted) setResult({ key, src });
    }).catch(() => { /* fail closed: never fall back to an original */ });
    return () => { controller.abort(); };
  }, [key, protectedPhoto]);
  return { protectedPhoto, src: result?.key === key ? result.src : undefined, key };
}

export function PeopleImage({ asset, allowReveal = true }: { asset: Asset; allowReveal?: boolean }) {
  const { protectedPhoto, src, key } = usePeopleImage(asset);
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
  return <div className="photo-loading people-covered"><span>Fotografía oculta</span>{allowReveal && <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); void show(); }}>Revelar durante 3 segundos</button>}</div>;
}
