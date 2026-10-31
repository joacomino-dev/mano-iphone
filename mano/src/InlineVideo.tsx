import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PlayIcon, PauseIcon, CornersOutIcon, ArrowClockwiseIcon, GearSixIcon, SpeakerHighIcon, SpeakerSlashIcon } from '@phosphor-icons/react';
import type { Asset } from './domain';
import type { Place } from './library';
import { videoFailureCopy, type VideoState } from './media';
import type { VideoMeta } from './meta';
import { CocoLoader, Deferred } from './Loader';
import { VhsOverlay } from './Vhs';
import { haptic } from './haptics';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (seconds: number) => { const t = Math.max(0, Math.floor(seconds || 0)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60); return h ? `${h}:${pad(m)}:${pad(t % 60)}` : `${m}:${pad(t % 60)}`; };
const stop = (e: SyntheticEvent) => e.stopPropagation();
const useDocumentVisible = () => {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => { const update = () => setVisible(document.visibilityState !== 'hidden'); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  return visible;
};

/** One video, two modes.
 * - card: plays by itself, muted and looping, only while it is the card on top
 *   and nothing covers it. No timeline or controls: the card keeps every photo
 *   gesture (swipes, hold, tap). If iOS refuses to start, or Reduce Motion asks
 *   for no autoplay, one explicit «Reproducir» chip appears instead.
 * - full: the anchored view opened on purpose — sound, timeline and fullscreen.
 * The element is released when the card leaves; the poster stays underneath. */
export function InlineVideo({ asset, state, active = true, mode = 'card', retry, fullscreen, openSettings, meta, place, children }: {
  asset: Asset; state: VideoState; active?: boolean; mode?: 'card' | 'full'; retry: () => void; fullscreen: () => void; openSettings: () => void;
  meta?: VideoMeta; place?: Place; children: ReactNode;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const visible = useDocumentVisible();
  const full = mode === 'full';
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [frame, setFrame] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(asset.duration || 0);
  const [muted, setMuted] = useState(!full);
  const [blocked, setBlocked] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [playError, setPlayError] = useState(false);
  const url = state.status === 'ready' ? state.url : undefined;

  // Release decoder/network resources when the card changes or unmounts. The
  // source is (re)assigned here too: a remount reuses the element whose src the
  // previous cleanup removed, and React would not set an unchanged prop again.
  useEffect(() => {
    setPlaying(false); setFrame(false); setTime(0); setPlayError(false); setBlocked(false); setChosen(false);
    const video = player.current;
    if (video && url && video.getAttribute('src') !== url) { video.src = url; video.load(); }
    return () => { if (video) { video.pause(); video.removeAttribute('src'); video.load(); } };
  }, [asset.id, url]);

  const start = (withSound: boolean) => {
    const video = player.current; if (!video) return;
    setPlayError(false);
    if (video.ended) video.currentTime = 0;
    video.muted = !withSound; setMuted(!withSound);
    void video.play().then(() => setBlocked(false)).catch(() => {
      // Sound refused: retry silent once (full mode); silent refused: show the chip.
      if (withSound) { video.muted = true; setMuted(true); void video.play().catch(() => setBlocked(true)); }
      else setBlocked(true);
    });
  };
  // Card: play while on top and uncovered; Reduce Motion waits for a tap.
  const wantsPlay = !!url && visible && active && (full || !reduced || chosen);
  useEffect(() => {
    const video = player.current; if (!video || !url) return;
    if (wantsPlay) start(full); else if (!video.paused) video.pause();
  }, [wantsPlay, url]);

  const choose = () => { haptic('light'); setChosen(true); start(full); };
  const pause = () => { player.current?.pause(); haptic('soft'); };
  const toggleSound = () => { const video = player.current; if (!video) return; video.muted = !video.muted; setMuted(video.muted); haptic('selection'); };
  const enterFullscreen = () => {
    const video = player.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitSupportsFullscreen?: boolean }) | null;
    haptic('light');
    // iOS native fullscreen keeps the same element, position and audio.
    if (video && frame && video.webkitSupportsFullscreen && video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return; }
    if (video && frame && video.requestFullscreen) { void video.requestFullscreen().catch(fullscreen); return; }
    fullscreen();
  };
  const seek = (value: number) => { const video = player.current; if (video && Number.isFinite(value)) { video.currentTime = value; setTime(value); } };

  const failure = playError ? 'playback' : state.status === 'error' ? state.failure : undefined;
  const copy = failure ? videoFailureCopy(failure) : null;
  const loading = !failure && (state.status === 'queued' || state.status === 'loading' || state.status === 'idle');
  const progress = state.status === 'loading' ? state.progress : 0;
  const percent = Math.round(progress * 100);
  const shown = playing || (frame && time > 0);
  const chip = !failure && !loading && !playing && (blocked || (!full && reduced && !chosen));

  return <div className={`inline-media ${shown ? 'is-started' : ''} ${playing ? 'is-playing' : ''} ${frame ? 'has-frame' : ''}`}>
    {children}
    {url && <video data-testid="inline-video" ref={player} src={url} playsInline muted={muted} loop={!full} preload={full ? 'auto' : 'metadata'} aria-label="Vídeo de tu biblioteca"
      onLoadedData={() => setFrame(true)} onLoadedMetadata={e => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setLength(d); }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onCanPlay={() => setWaiting(false)}
      onTimeUpdate={full ? e => setTime(e.currentTarget.currentTime) : e => { if (!time) setTime(e.currentTarget.currentTime); }}
      onError={() => { setPlaying(false); setPlayError(true); }}/>}
    {!full && meta && (meta.date || meta.time || meta.location || meta.duration) && <VhsOverlay asset={asset} place={place} settings={meta}/>}

    <AnimatePresence initial={false}>
      {(loading || chip) && <motion.div key="center" className="video-center"
        initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: .92 }}
        transition={{ type: 'spring', stiffness: 460, damping: 34 }}>
        {loading ? <Deferred><span className="video-preparing" role="status"><CocoLoader progress={progress} size={56} label={percent ? `Preparando vídeo, ${percent} %` : 'Preparando vídeo'}/>
          <span>{percent ? `Preparando… ${percent} %` : 'Preparando vídeo…'}</span></span></Deferred>
          : <button className="video-chip" onClick={choose} aria-label={`${blocked ? 'Toca para reproducir' : 'Reproducir'} vídeo de ${clock(length)}`}><PlayIcon weight="fill" size={18}/>{blocked ? 'Toca para reproducir' : 'Reproducir'}</button>}
      </motion.div>}
    </AnimatePresence>

    {waiting && playing && <span className="video-buffering" aria-hidden="true"><CocoLoader size={44}/></span>}

    {full && !failure && url && <div className="video-controls" onPointerDown={stop} onClick={stop}>
      <button onClick={playing ? pause : choose} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? <PauseIcon weight="fill" size={20}/> : <PlayIcon weight="fill" size={20}/>}</button>
      <input type="range" min={0} max={length || 1} step={.05} value={Math.min(time, length || 1)} aria-label="Posición del vídeo" aria-valuetext={`${clock(time)} de ${clock(length)}`}
        style={{ '--fill': `${length ? Math.min(100, time / length * 100) : 0}%` } as CSSProperties} onChange={e => seek(Number(e.currentTarget.value))}/>
      <span className="video-time"><span>{clock(time)}</span> / {clock(length)}</span>
      <button onClick={toggleSound} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>{muted ? <SpeakerSlashIcon size={20} weight="bold"/> : <SpeakerHighIcon size={20} weight="bold"/>}</button>
      <button onClick={enterFullscreen} aria-label="Pantalla completa"><CornersOutIcon size={20} weight="bold"/></button>
    </div>}

    {copy && <div className="video-error" role="alert">
      <span>{copy.message}</span>
      {copy.action === 'retry' && <button onClick={() => { setPlayError(false); retry(); }}><ArrowClockwiseIcon size={18} weight="bold"/>Reintentar</button>}
      {copy.action === 'fullscreen' && <button onClick={fullscreen}><CornersOutIcon size={18} weight="bold"/>Ver en pantalla completa</button>}
      {copy.action === 'settings' && <button onClick={openSettings}><GearSixIcon size={18} weight="bold"/>Abrir Ajustes</button>}
    </div>}
  </div>;
}
