import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode, type SyntheticEvent } from 'react';
import { useIsPresent, AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PlayIcon, PauseIcon, CornersOutIcon, ArrowClockwiseIcon, GearSixIcon, SpeakerHighIcon, SpeakerSlashIcon, CloudArrowDownIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import type { Asset } from './domain';
import type { Place } from './library';
import { videoFailureCopy, type VideoState } from './media';
import { formatBytes, type VideoMeta } from './meta';
import { CocoLoader, Deferred } from './Loader';
import { VhsOverlay } from './Vhs';
import { haptic } from './haptics';
import { locale, t } from './i18n';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (seconds: number) => { const t = Math.max(0, Math.floor(seconds || 0)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60); return h ? `${h}:${pad(m)}:${pad(t % 60)}` : `${m}:${pad(t % 60)}`; };
const stop = (e: SyntheticEvent) => e.stopPropagation();

/** Where each video is, shared by every element that shows it — the card, the
 * held view and the anchored view — so moving between them never restarts it:
 * the next one seeks to the same moment and keeps the person's pause. Memory
 * only, a few dozen entries. */
const playheads = new Map<string, { time: number; paused: boolean }>();
const headKey = (asset: Asset) => `${asset.id}:${asset.modified ?? 0}`;
function remember(key: string, time: number, paused: boolean) {
  if (!Number.isFinite(time)) return;
  playheads.delete(key); playheads.set(key, { time, paused });
  while (playheads.size > 40) playheads.delete(playheads.keys().next().value!);
}
export type VideoControl = { toggle: () => void };
const interrupted = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';
const useDocumentVisible = () => {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => { const update = () => setVisible(document.visibilityState !== 'hidden'); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  return visible;
};

/** One video, two modes.
 * - card: plays by itself, muted and looping, only while it is the card on top
 *   and nothing covers it. The card keeps its swipe, hold and tap gestures.
 *   A real playback refusal offers a retry.
 * - full: the anchored view opened on purpose — sound, timeline and fullscreen.
 * - peek: the held (not yet anchored) view — plays on, muted like the card, with
 *   nothing over it; anchoring turns the same element into `full`, so it never
 *   restarts. Every mode shares the playhead (`playheads`).
 * A quick tap on the card toggles pause/play (`control`), with a brief glyph.
 * The element is released when the card leaves; the poster stays underneath.
 * A video only in iCloud (with «Ahorrar iCloud») is not downloaded by itself:
 * its poster, weight and VHS letters stay, and «Descargar y ver» asks for it.
 * The card carries two quiet toggles: sound (kept for the session) and the VHS
 * letters (saved with Ajustes). */
export function InlineVideo({ asset, state, active = true, mode = 'card', retry, download, fullscreen, openSettings, meta, place, sound = false, onSound, onOsd, control, tools, children }: {
  asset: Asset; state: VideoState; active?: boolean; mode?: 'card' | 'peek' | 'full'; retry: () => void; download: () => void; fullscreen: () => void; openSettings: () => void;
  meta?: VideoMeta; place?: Place; sound?: boolean; onSound?: () => void; onOsd?: () => void; control?: MutableRefObject<VideoControl | null>;
  /** Extra card tool (Compartir) drawn in the same row as sound and VHS. */
  tools?: ReactNode; children: ReactNode;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const present = useIsPresent();
  const visible = useDocumentVisible();
  const full = mode === 'full', card = mode === 'card';
  const key = headKey(asset);
  // The person's own pause, shared with the other views of this video.
  const [userPaused, setUserPaused] = useState(() => playheads.get(key)?.paused ?? false);
  const [glyph, setGlyph] = useState<{ kind: 'play' | 'pause'; n: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [frame, setFrame] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(asset.duration || 0);
  const [muted, setMuted] = useState(!sound);
  const [blocked, setBlocked] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [fetching, setFetching] = useState(false);
  const url = state.status === 'ready' ? state.url : undefined;

  // Release decoder/network resources when the card changes or unmounts. The
  // source is (re)assigned here too: a remount reuses the element whose src the
  // previous cleanup removed, and React would not set an unchanged prop again.
  useLayoutEffect(() => {
    setPlaying(false); setFrame(false); setTime(0); setPlayError(false); setBlocked(false);
    setUserPaused(playheads.get(key)?.paused ?? false);
    if (url) setFetching(false);
    const video = player.current;
    if (video && url && video.getAttribute('src') !== url) { video.src = url; video.load(); }
    return () => { if (video) { if (video.currentTime > 0) remember(key, video.currentTime, playheads.get(key)?.paused ?? false); video.pause(); video.removeAttribute('src'); video.load(); } };
  }, [asset.id, url]);

  const playAttempt = useRef(0);
  const start = (withSound: boolean) => {
    const video = player.current; if (!video || !active || !visible || !present) return;
    const attempt = ++playAttempt.current;
    setPlayError(false);
    if (video.ended) video.currentTime = 0;
    video.muted = !withSound; setMuted(!withSound);
    // Source changes can interrupt play(); canplay will retry the current resource.
    void video.play().then(() => { if (attempt === playAttempt.current) setBlocked(false); }).catch((e: unknown) => {
      if (attempt !== playAttempt.current || interrupted(e)) return;
      // Sound refused: retry silent once; silent refused: show the chip.
      if (withSound) { video.muted = true; setMuted(true); void video.play().catch(err => { if (attempt === playAttempt.current && !interrupted(err)) setBlocked(true); }); }
      else setBlocked(true);
    });
  };
  // Only the visible surface owns playback, including during exit animations.
  const ownsPlayback = !!url && visible && active && present;
  const ownedPlayback = useRef(false);
  useLayoutEffect(() => {
    const video = player.current; if (!video || !url) return;
    const takingOwnership = ownsPlayback && !ownedPlayback.current;
    ownedPlayback.current = ownsPlayback;
    if (takingOwnership) {
      const sharedPause = playheads.get(key)?.paused ?? false;
      if (sharedPause !== userPaused) {
        setUserPaused(sharedPause);
        return;
      }
    }
    if (ownsPlayback && !userPaused) {
      // Coming back from another view of this video: continue where it was, and
      // keep a pause the person made there.
      const head = playheads.get(key);
      if (head && video.readyState >= 1 && Math.abs(video.currentTime - head.time) > .25 && head.time < (video.duration || Infinity) - .25) video.currentTime = head.time;
      start(sound);
    } else { ++playAttempt.current; video.pause(); }
    return () => { ++playAttempt.current; video.pause(); };
    // Sound follows the person's choice in every view: anchoring keeps it as it was.
  }, [ownsPlayback, userPaused, url, sound, full]);
  // Quick tap on the card: pause or play, with a short glyph and a tick.
  const showGlyph = (kind: 'play' | 'pause') => setGlyph(g => ({ kind, n: (g?.n ?? 0) + 1 }));
  useEffect(() => { if (!glyph) return; const t = setTimeout(() => setGlyph(null), 650); return () => clearTimeout(t); }, [glyph]);
  const toggle = () => {
    const video = player.current; if (!video || !url) return;
    haptic('selection');
    if (!video.paused) { pause(); showGlyph('pause'); }
    else { choose(); showGlyph('play'); }
  };
  useEffect(() => { if (!control || !card) return; const own = { toggle }; control.current = own; return () => { if (control.current === own) control.current = null; }; });

  const choose = () => { const video = player.current; if (!video) return; haptic('light'); remember(key, video.currentTime, false); setUserPaused(false); start(sound); };
  const pause = () => { const video = player.current; if (!video) return; ++playAttempt.current; remember(key, video.currentTime, true); video.pause(); setUserPaused(true); haptic('soft'); };
  const toggleSound = () => {
    const next = !sound;
    if (url && !userPaused) start(next);
    else setMuted(!next);
    onSound?.();
    haptic('selection');
  };
  const enterFullscreen = () => {
    const video = player.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitSupportsFullscreen?: boolean }) | null;
    haptic('light');
    // iOS native fullscreen keeps the same element, position and audio.
    if (video && frame && video.webkitSupportsFullscreen && video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return; }
    if (video && frame && video.requestFullscreen) { void video.requestFullscreen().catch(fullscreen); return; }
    fullscreen();
  };
  const seek = (value: number) => { const video = player.current; if (video && Number.isFinite(value)) { video.currentTime = value; setTime(value); } };

  // The download label belongs to the request the person made; a failure ends it.
  useEffect(() => { if (state.status === 'error') setFetching(false); }, [state.status]);
  const failure = playError ? 'playback' : state.status === 'error' ? state.failure : undefined;
  const copy = failure ? videoFailureCopy(failure) : null;
  const loading = !failure && (state.status === 'queued' || state.status === 'loading' || state.status === 'idle');
  const progress = state.status === 'loading' ? state.progress : 0;
  const percent = Math.round(progress * 100);
  const shown = playing || (frame && time > 0);
  const chip = !failure && !loading && !playing && blocked;

  return <div className={`inline-media ${shown ? 'is-started' : ''} ${playing ? 'is-playing' : ''} ${frame ? 'has-frame' : ''}`}>
    {children}
    {url && <video data-testid="inline-video" ref={player} src={url} playsInline muted={muted} loop={!full} preload={card ? 'metadata' : 'auto'} aria-label={t('Vídeo de tu biblioteca')}
      onLoadedData={() => setFrame(true)}
      onLoadedMetadata={e => { const v = e.currentTarget, d = v.duration; if (Number.isFinite(d) && d > 0) setLength(d);
        // Same moment as the view it came from (card ↔ held ↔ anchored).
        const head = playheads.get(key); if (head && head.time > .05 && (!Number.isFinite(d) || head.time < d - .25)) { v.currentTime = head.time; setTime(head.time); } }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)}
      onCanPlay={e => { setWaiting(false); const v = e.currentTarget; if (ownsPlayback && !userPaused && !blocked && v.paused && !v.ended) start(sound); }}
      onTimeUpdate={e => { const t = e.currentTarget.currentTime; if (ownsPlayback) remember(key, t, playheads.get(key)?.paused ?? false); if (full || !time) setTime(t); }}
      onError={() => { setPlaying(false); setPlayError(true); }}/>}
    {card && meta && (meta.date || meta.time || meta.location || meta.duration || meta.size) && <VhsOverlay asset={asset} place={place} settings={meta}/>}
    {card && (onSound || onOsd || tools) && <div className="video-toggles">
      {/* The icon follows what really plays: iOS may refuse sound and fall back
          to silent. A tap asks for the opposite inside the gesture itself. */}
      {onSound && <button onPointerDown={stop} onClick={e => { e.stopPropagation(); toggleSound(); }} aria-pressed={!muted} aria-label={muted ? t('Activar sonido') : t('Silenciar')}>{muted ? <SpeakerSlashIcon size={18} weight="bold"/> : <SpeakerHighIcon size={18} weight="bold"/>}</button>}
      {onOsd && <button onPointerDown={stop} onClick={e => { e.stopPropagation(); haptic('selection'); onOsd(); }} aria-pressed={meta?.osd !== false} aria-label={meta?.osd !== false ? t('Ocultar letras VHS') : t('Mostrar letras VHS')}>{meta?.osd !== false ? <EyeIcon size={18} weight="bold"/> : <EyeSlashIcon size={18} weight="bold"/>}</button>}
      {tools}
    </div>}

    <AnimatePresence>{glyph && <motion.span key={glyph.n} className="video-glyph" aria-hidden="true"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: .82 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.08 }} transition={{ duration: .18 }}>
      {glyph.kind === 'pause' ? <PauseIcon weight="fill" size={26}/> : <PlayIcon weight="fill" size={26}/>}</motion.span>}</AnimatePresence>
    <AnimatePresence initial={false}>
      {mode !== 'peek' && (loading || chip) && <motion.div key="center" className="video-center"
        initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: .92 }}
        transition={{ type: 'spring', stiffness: 460, damping: 34 }}>
        {loading ? <Deferred><span className="video-preparing" role="status"><CocoLoader progress={progress} size={56} label={fetching ? t('Descargando de iCloud: {percent} %', { percent }) : percent ? t('Preparando vídeo: {percent} %', { percent }) : t('Preparando vídeo')}/>
          <span>{fetching ? t('Descargando de iCloud: {percent} %', { percent }) : percent ? t('Preparando… {percent} %', { percent }) : t('Preparando vídeo…')}</span></span></Deferred>
          : <button className="video-chip" onClick={choose} aria-label={t('Reintentar la reproducción del vídeo de {length}', { length: clock(length) })}><PlayIcon weight="fill" size={18}/>{t('Reintentar reproducción')}</button>}
      </motion.div>}
    </AnimatePresence>

    {waiting && playing && <span className="video-buffering" aria-hidden="true"><CocoLoader size={44}/></span>}

    {full && !failure && url && <div className="video-controls" onPointerDown={stop} onClick={stop}>
      <button onClick={playing ? pause : choose} aria-label={playing ? t('Pausar') : t('Reproducir')}>{playing ? <PauseIcon weight="fill" size={20}/> : <PlayIcon weight="fill" size={20}/>}</button>
      <input type="range" min={0} max={length || 1} step={.05} value={Math.min(time, length || 1)} aria-label={t('Posición del vídeo')} aria-valuetext={t('{time} de {length}', { time: clock(time), length: clock(length) })}
        style={{ '--fill': `${length ? Math.min(100, time / length * 100) : 0}%` } as CSSProperties} onChange={e => seek(Number(e.currentTarget.value))}/>
      <span className="video-time"><span>{clock(time)}</span> / {clock(length)}</span>
      <button onClick={toggleSound} aria-label={muted ? t('Activar sonido') : t('Silenciar')}>{muted ? <SpeakerSlashIcon size={20} weight="bold"/> : <SpeakerHighIcon size={20} weight="bold"/>}</button>
      <button onClick={enterFullscreen} aria-label={t('Pantalla completa')}><CornersOutIcon size={20} weight="bold"/></button>
    </div>}

    {copy && mode !== 'peek' && <div className={`video-error ${copy.action === 'download' ? 'is-cloud' : ''}`} role={copy.action === 'download' ? 'status' : 'alert'}>
      <span>{t(copy.message)}</span>
      {copy.action === 'download' && <button onPointerDown={stop} onClick={e => { e.stopPropagation(); haptic('light'); setFetching(true); download(); }}><CloudArrowDownIcon size={18} weight="bold"/>{formatBytes(asset.bytes, locale) ? t('Descargar y ver ({size})', { size: formatBytes(asset.bytes, locale)! }) : t('Descargar y ver')}</button>}
      {copy.action === 'retry' && <button onClick={() => { setPlayError(false); retry(); }}><ArrowClockwiseIcon size={18} weight="bold"/>{t('Reintentar')}</button>}
      {copy.action === 'fullscreen' && <button onClick={fullscreen}><CornersOutIcon size={18} weight="bold"/>{t('Ver en pantalla completa')}</button>}
      {copy.action === 'settings' && <button onClick={openSettings}><GearSixIcon size={18} weight="bold"/>{t('Abrir Ajustes')}</button>}
    </div>}
  </div>;
}
