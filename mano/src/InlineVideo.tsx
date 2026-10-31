import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PlayIcon, PauseIcon, CornersOutIcon, ArrowClockwiseIcon, GearSixIcon } from '@phosphor-icons/react';
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

/** One video card, one state at a time: preparing (real progress) → ready
 * (Play) → playing/paused with controls → or a single recoverable error.
 * The element is released when the card leaves; the poster stays underneath. */
export function InlineVideo({ asset, state, retry, fullscreen, openSettings, meta, place, children }: {
  asset: Asset; state: VideoState; retry: () => void; fullscreen: () => void; openSettings: () => void;
  meta: VideoMeta; place?: Place; children: ReactNode;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [frame, setFrame] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(asset.duration || 0);
  const [controls, setControls] = useState(true);
  const [playError, setPlayError] = useState(false);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = state.status === 'ready' ? state.url : undefined;

  // Release decoder/network resources when the card changes or unmounts. The
  // source is (re)assigned here too: a remount reuses the element whose src the
  // previous cleanup removed, and React would not set an unchanged prop again.
  useEffect(() => {
    setStarted(false); setPlaying(false); setFrame(false); setTime(0); setPlayError(false);
    const video = player.current;
    if (video && url && video.getAttribute('src') !== url) { video.src = url; video.load(); }
    return () => { if (video) { video.pause(); video.removeAttribute('src'); video.load(); } };
  }, [asset.id, url]);
  useEffect(() => () => { if (hide.current) clearTimeout(hide.current); }, []);

  const scheduleHide = () => { if (hide.current) clearTimeout(hide.current); hide.current = setTimeout(() => setControls(false), 2600); };
  const reveal = () => { setControls(true); if (playing) scheduleHide(); };
  const play = () => {
    const video = player.current; if (!video) return;
    setPlayError(false);
    if (video.ended) video.currentTime = 0;
    haptic('light');
    void video.play().then(() => { setStarted(true); setControls(true); scheduleHide(); }).catch(() => setPlayError(true));
  };
  const pause = () => { player.current?.pause(); haptic('soft'); setControls(true); if (hide.current) clearTimeout(hide.current); };
  const enterFullscreen = () => {
    const video = player.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitSupportsFullscreen?: boolean }) | null;
    haptic('light');
    // iOS native fullscreen keeps the same element, position and audio.
    if (video && frame && video.webkitSupportsFullscreen && video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return; }
    if (video && frame && video.requestFullscreen) { void video.requestFullscreen().catch(fullscreen); return; }
    fullscreen();
  };
  const seek = (value: number) => { const video = player.current; if (video && Number.isFinite(value)) { video.currentTime = value; setTime(value); } reveal(); };

  const failure = playError ? 'playback' : state.status === 'error' ? state.failure : undefined;
  const copy = failure ? videoFailureCopy(failure) : null;
  const loading = !failure && (state.status === 'queued' || state.status === 'loading' || state.status === 'idle');
  const progress = state.status === 'loading' ? state.progress : 0;
  const percent = Math.round(progress * 100);

  return <div className={`inline-media ${started ? 'is-started' : ''} ${playing ? 'is-playing' : ''} ${frame ? 'has-frame' : ''} ${controls ? 'shows-controls' : ''}`}
    onPointerDown={e => { if (playing) e.stopPropagation(); }}
    onClick={e => { if (started) { e.stopPropagation(); controls && playing ? setControls(false) : reveal(); } }}>
    {children}
    {url && <video data-testid="inline-video" ref={player} src={url} playsInline preload="metadata" aria-label="Vídeo de tu biblioteca"
      onLoadedData={() => setFrame(true)} onLoadedMetadata={e => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setLength(d); }}
      onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); setControls(true); if (hide.current) clearTimeout(hide.current); }} onEnded={() => { setPlaying(false); setControls(true); if (hide.current) clearTimeout(hide.current); }}
      onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onCanPlay={() => setWaiting(false)}
      onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
      onError={() => { setPlaying(false); setPlayError(true); }}/>}
    {(meta.date || meta.time || meta.location || meta.duration) && <VhsOverlay asset={asset} place={place} settings={meta} lifted={started && controls} hideDuration={started && controls}/>}

    <AnimatePresence initial={false}>
      {!started && !failure && <motion.div key="center" className="video-center" onPointerDown={stop} onClick={stop}
        initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: .92 }}
        transition={{ type: 'spring', stiffness: 460, damping: 34 }}>
        {loading ? <Deferred><span className="video-preparing" role="status"><CocoLoader progress={progress} size={56} label={percent ? `Preparando vídeo, ${percent} %` : 'Preparando vídeo'}/>
          <span>{percent ? `Preparando… ${percent} %` : 'Preparando vídeo…'}</span></span></Deferred>
          : <button className="video-play" onClick={play} disabled={!url} aria-label={`Reproducir vídeo de ${clock(length)}`}><PlayIcon weight="fill" size={26}/></button>}
      </motion.div>}
    </AnimatePresence>

    {started && waiting && playing && <span className="video-buffering" aria-hidden="true"><CocoLoader size={44}/></span>}

    <AnimatePresence>
      {started && !failure && controls && <motion.div key="bar" className="video-controls" onPointerDown={stop} onClick={stop}
        initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 8 }}
        transition={{ duration: .18, ease: [.2, .8, .2, 1] }}>
        <button onClick={playing ? pause : play} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? <PauseIcon weight="fill" size={20}/> : <PlayIcon weight="fill" size={20}/>}</button>
        <input type="range" min={0} max={length || 1} step={.05} value={Math.min(time, length || 1)} aria-label="Posición del vídeo" aria-valuetext={`${clock(time)} de ${clock(length)}`}
          style={{ '--fill': `${length ? Math.min(100, time / length * 100) : 0}%` } as CSSProperties} onChange={e => seek(Number(e.currentTarget.value))}/>
        <span className="video-time"><span>{clock(time)}</span> / {clock(length)}</span>
        <button onClick={enterFullscreen} aria-label="Pantalla completa"><CornersOutIcon size={20} weight="bold"/></button>
      </motion.div>}
    </AnimatePresence>

    {copy && <div className="video-error" role="alert" onPointerDown={stop} onClick={stop}>
      <span>{copy.message}</span>
      {copy.action === 'retry' && <button onClick={() => { setPlayError(false); retry(); }}><ArrowClockwiseIcon size={18} weight="bold"/>Reintentar</button>}
      {copy.action === 'fullscreen' && <button onClick={fullscreen}><CornersOutIcon size={18} weight="bold"/>Ver en pantalla completa</button>}
      {copy.action === 'settings' && <button onClick={openSettings}><GearSixIcon size={18} weight="bold"/>Abrir Ajustes</button>}
    </div>}
  </div>;
}
