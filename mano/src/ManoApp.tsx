import { FinishButton } from './FinishButton';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type PointerEvent, type MouseEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useMotionValue, useTransform, animate, type MotionValue } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import { ExportIcon, FolderOpenIcon, FolderSimplePlusIcon, CaretRightIcon, ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, StackIcon, TrashIcon, CheckIcon, XIcon, PlayIcon, SlidersHorizontalIcon, ArrowClockwiseIcon, ImageBrokenIcon, PlusIcon, PushPinIcon, InfoIcon, CloudIcon, CloudArrowDownIcon, SparkleIcon } from '@phosphor-icons/react';
import { BottomSheet, KeyboardInput, useKeyboard } from './mobile';
import { ReviewGrid } from './ReviewGrid';
import { decide, undo, restore, eligible, eligibleFrom, orderAssets, readState, reconcileLibrary, libraryFingerprint, filterScope, LEVELS, initialFilter, initialState, type Action, type Asset, type Decision, type Filter, type RecordState } from './domain';
import { NO_HAND, playable, lockedHand, dealHand, afterDecision, cycleHand, restoreHand, upcomingFrom, type HandLock } from './sequence';
import { Library, isNative, demoAssets, thumbnailInfo, inCloudError, type Album, type PhotoPermission } from './library';
import { useLibraryIndex, enrich } from './indexer';
import { AssetPreloader } from './preload';
import { prepareReviewAsset, VideoStore, prewarm, sharpPreview, subscribeSharp, cloudPreviews, resetPreviewPolicy, type PreparedMedia, type VideoState } from './media';
import { CloudBadge, CloudPlaceholder, useCloud } from './Cloud';
import { InlineVideo, type VideoControl } from './InlineVideo';
import { Filters } from './Filters';
import { Inspector, type InspectOrigin } from './Inspector';
import { readSession, SessionWriter, DEMO_SESSION_KEY, LIBRARY_SESSION_KEY, type ActiveSession } from './session';
import { readDisplay, saveDisplay, polaroidCaption, formatBytes, ONBOARDING_KEY, type DisplaySettings, type PhotoMeta } from './meta';
import { usePlace, prefetchPlaces } from './place';
import { haptic, setHapticsEnabled } from './haptics';
import { AnimatedNumber, CocoLoader, Deferred } from './Loader';
import { Onboarding } from './Onboarding';
import { Splash } from './Splash';
import { AccessScreen, PreparingScreen, LoadErrorScreen, SessionDone, EMPTY_STATS, readStats, readLifetime, saveLifetime, type RoundStats } from './Screens';
import { AdSlot, PurchaseOptions, useMonetization } from './Monetization';
import { readTestMode, setTestMode } from './testMode';
import { DisplaySettingsPanel } from './DisplaySettings';
import { InspectorBoundary } from './Boundary';
import { installErrorReporting } from './diagnostics';
import { Stamp, DecisionStamp, DecisionIcon, ROMAN, type StampKind } from './Stamp';
import { DecisionBar } from './DecisionBar';
import { Wordmark, PileProgress } from './Chrome';
import { Character } from './Characters';
import { assignToAlbum, afterAlbum } from './album';
import { cardBox, cardPixels, thumbPixels, setPreviewSizing, cloudDownloads, previewPolicyKey, subscribePreviewPolicy } from './preview';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
// Presentation only: a decided card leaves toward the side of its decision.
// Any other removal (filters, undo, session end) simply fades.
const leaveEase = [.32, .72, .36, 1] as const;
/** Cards prepared ahead of the one on screen (front + next), about six. */
const PRELOAD_AHEAD=6;
/** Videos look further ahead than posters: copying or exporting a video takes
 * far longer than a poster, so it starts earlier (the earlier 10-item window;
 * one slot stays reserved for the card on screen, two preparations at most). */
const VIDEO_AHEAD=10;
function cardExit(id: string, decision: Decision | undefined, reduced: boolean | null) {
  const decided = !!decision?.ids.includes(id);
  if (reduced || !decided) return { opacity: 0, pointerEvents: 'none' as const, transition: { duration: reduced ? 0 : .16 } };
  // Keep flies right; discard slides left and greys out toward the review tray;
  // favourite rises; «Más tarde» drops to the bottom of the pile. The stamp overlay (DecisionStamp) rides along.
  const flight = decision!.action === 'keep' ? { x: 440, rotate: 12 } : decision!.action === 'discard' ? { x: -440, rotate: -12, filter: 'saturate(.3)' } : decision!.action === 'later' || decision!.action === 'unfavorite' ? { y: 520, rotate: 4, scale: .96 } : { y: -560, scale: .92 };
  return { ...flight, opacity: 0, pointerEvents: 'none' as const, transition: { duration: .34, ease: leaveEase } };
}
function savedGroups(items: Asset[]) {
  // Videos are never stacked (domain.handOf): they carry no group.
  try { const groups = JSON.parse(localStorage.getItem('mano-similarity-v1') || '{}') as Record<string,string>; return items.map(a=>({...a,group:a.kind==='video'?undefined:groups[a.id]})); } catch { return items; }
}
/** One card picture, in this order of preference: the sharper version fetched
 * on purpose (Anclar), a preview that just downloaded from iCloud, the poster
 * prepared ahead by the read-ahead window, or — for items outside the window
 * (review grid) — its own local request. It never asks PhotoKit for something
 * the window is already preparing, and never downloads by itself: downloads go
 * through `cloudPreviews`, which the iCloud indicator follows.
 * `quiet`: the owner (a video card) shows the one error state; this only
 * renders the poster or a neutral placeholder, so messages never stack. */
function Photo(props: { asset: Asset; small?: boolean; pool?: AssetPreloader<PreparedMedia>|null; quiet?: boolean }) {
  return <UnprotectedPhoto {...props}/>;
}
function UnprotectedPhoto({ asset, small=false, pool, quiet=false }: { asset: Asset; small?: boolean; pool?: AssetPreloader<PreparedMedia>|null; quiet?: boolean }) {
  const policy = useSyncExternalStore(subscribePreviewPolicy, previewPolicyKey);
  const [own, setOwn] = useState<{src:string;cloud:boolean;missing:boolean}|null>(null); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useSyncExternalStore(useCallback((listener:()=>void)=>pool?pool.subscribeItem(asset,listener):()=>{},[pool,asset.id,asset.modified]), ()=>pool?.version(asset)??'');
  const entry = retry===0 ? pool?.peek(asset) : undefined;
  const waiting = entry?.status==='queued'||entry?.status==='loading';
  const ready = entry?.value;
  const cloud = useCloud(small ? undefined : asset);
  // Anchored once and downloaded: that sharper version stays on the card.
  const upgraded = useSyncExternalStore(subscribeSharp, () => sharpPreview(asset));
  const needOwn = !ready && !waiting;
  useEffect(() => { if (!needOwn) return; let alive = true; const controller=new AbortController(); setError(false);
    thumbnailInfo(asset, small?thumbPixels():cardPixels(asset), retry>0, false, controller.signal, undefined, true)
      .then(t => { if (!alive) return; setOwn({src:t.src,cloud:t.cloud,missing:false}); if (t.cloud&&!small&&cloudDownloads()) void cloudPreviews.fetch(asset,'card').catch(()=>{}); })
      .catch(e => { if (!alive) return; if (inCloudError(e)) { setOwn({src:'',cloud:true,missing:true}); if (!small&&cloudDownloads()) void cloudPreviews.fetch(asset,'card').catch(()=>{}); } else setError(true); });
    return () => { alive = false; controller.abort(); }; }, [asset.id, asset.modified, retry, small, needOwn, policy]);
  const local = ready ?? (own ? { poster: own.src, cloud: own.cloud, missing: own.missing } : undefined);
  // «Descargar siempre»: a lite card whose download job was dropped (e.g. back
  // through undo) asks again; the full preview is already on the iPhone by then.
  useEffect(() => { if (!small && local?.cloud && !cloud && cloudDownloads()) void cloudPreviews.fetch(asset,'card').catch(()=>{}); }, [small, !!local?.cloud, !!cloud, asset.id, policy]);
  const src = (retry===0 ? upgraded ?? (cloud?.src||undefined) : undefined) ?? (local?.poster||undefined);
  const alt = asset.kind === 'video' ? 'Vista previa de vídeo' : 'Foto del carrete';
  const download = () => { haptic('light'); void cloudPreviews.fetch(asset,'card',true).catch(()=>{}); };
  const retryCloud = () => { haptic('light'); void cloudPreviews.retry(asset).catch(()=>{}); };
  // A cached file may have been pruned natively (preview cache limit): ask once
  // for a fresh one before showing the error.
  if (src&&!error) return <><img onError={()=>retry===0?setRetry(1):setError(true)} src={src} alt={alt} draggable={false}/>
    {!small&&!quiet&&!upgraded&&<CloudBadge state={cloud} lite={!!local?.cloud&&!cloud?.src} onRetry={retryCloud}/>}</>;
  if (local?.missing&&!error) return small ? <div className="photo-loading is-cloud"><CloudIcon size={22}/></div> : <CloudPlaceholder state={cloud} download={download} retry={retryCloud} quiet={quiet}/>;
  return <div className={`photo-loading ${error?'has-error':''}`}>{error ? quiet ? null : <><ImageBrokenIcon size={26}/><span>No se pudo cargar</span>{!small&&<button onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setRetry(v=>v+1);}}><ArrowClockwiseIcon size={16} weight="bold"/>Reintentar</button>}</> : quiet ? null : <Deferred><CocoLoader size={small?28:40}/></Deferred>}</div>;
}
/** Polaroid margin: two fixed slots, place left and date right. A missing value
 * leaves its slot empty; a place still being resolved reserves its width. */
function PolaroidCaption({ asset, settings, place, pending }: { asset: Asset; settings: PhotoMeta; place?: { locality?: string; country?: string }; pending: boolean }) {
  const caption = polaroidCaption(asset, place, settings, typeof navigator !== 'undefined' ? navigator.language || 'es' : 'es');
  if (caption.empty && !pending) return null;
  return <span className="polaroid-caption">
    {caption.where ? <motion.span className="caption-where" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.2}}>{caption.where}</motion.span> : <span className={`caption-where ${pending?'is-pending':''}`} aria-hidden="true"/>}
    {caption.when&&<span className="caption-when">{caption.when}</span>}
  </span>;
}
/** Kept before: the turquoise seal carries its level (times kept) as a numeral.
 * Stamped across the card's lower-right edge, off the subject; a tap hides all
 * seals (Ajustes › Sellos brings them back). */
function CardShare({ asset, sharing, share }: { asset: Asset; sharing: boolean; share: (asset: Asset) => Promise<void> }) {
  return <button className="card-share" aria-label={sharing ? 'Preparando archivo para compartir' : 'Compartir'}
    aria-disabled={sharing} onPointerDown={e => e.stopPropagation()} onClick={e => {
      e.stopPropagation();
      if (!sharing) void share(asset);
    }}>{sharing ? <CocoLoader size={20}/> : <ExportIcon size={20} weight="bold"/>}</button>;
}

function Seal({ level, hide }: { level: number; hide: () => void }) {
  return <button className="seal" aria-label={`Conservada, sello ${ROMAN[level-1]} de ${LEVELS.length}. Ocultar los sellos`} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();hide();}}><Stamp kind="keep" level={level}/></button>;
}
function Sheet({ open, close, title, description, children, error, returnTo }: { open: boolean; close: () => void; title: string; description: string; children: ReactNode; error?: string; returnTo: string }) {
  const bodyRef=useRef<HTMLDivElement>(null); const previousDialog=useRef<Element|null>(null);
  const restoreFocus=()=>document.getElementById(returnTo)?.focus({preventScroll:true});
  useEffect(()=>{
    if(isNative)return;
    if(open){previousDialog.current=bodyRef.current?.closest('[role="dialog"]')??null;return;}
    const dialog=previousDialog.current;if(!dialog)return;
    if(!dialog.isConnected){restoreFocus();return;}
    // Restore when the protected sheet's exit animation actually unmounts it.
    const observer=new MutationObserver(()=>{if(!dialog.isConnected){observer.disconnect();restoreFocus();}});
    observer.observe(dialog.parentElement??document.body,{childList:true});
    return()=>observer.disconnect();
  },[open,returnTo]);
  const content=<div className="mano-sheet-body" ref={bodyRef}>{error&&<p className="sheet-error" role="alert">{error}</p>}{children}</div>;
  if (!isNative) return <BottomSheet open={open} onOpenChange={v=>!v&&close()} title={title} description={description} snap={.85}>{content}</BottomSheet>;
  return <Dialog.Root open={open} onOpenChange={v=>!v&&close()}><Dialog.Portal><Dialog.Overlay className="native-shade"/><Dialog.Content className="native-sheet" aria-describedby={undefined} onCloseAutoFocus={e=>{e.preventDefault();restoreFocus();}}><header><div><Dialog.Title asChild><h2>{title}</h2></Dialog.Title><p>{description}</p></div><Dialog.Close asChild><button aria-label="Cerrar"><XIcon size={22}/></button></Dialog.Close></header>{content}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
function AlbumInput({value,change}:{value:string;change:(value:string)=>void}) {
  return isNative?<input value={value} onChange={e=>change(e.target.value)} maxLength={100} placeholder="Por ejemplo, Verano"/>:<PreviewAlbumInput value={value} change={change}/>;
}
function PreviewAlbumInput({value,change}:{value:string;change:(value:string)=>void}) {
  const keyboard=useKeyboard();return <KeyboardInput value={value} onChange={e=>change(e.target.value)} onBlur={()=>keyboard.hide()} maxLength={100} placeholder="Por ejemplo, Verano"/>;
}
/** A short notice that appears exactly where the name is: the wordmark fades
 * out (it stays in place, so the cell, the header height and the buttons never
 * move) and the notice fades in over the room between Filtros and Terminar
 * (`--notice-room`, measured by useNoticeRoom). At most two lines; VoiceOver
 * hears the full text through the app's status region. Errors never use this
 * slot (ErrorAlert). Reduce Motion: a plain swap. */
type Notice={id:number;text:string};
function BrandStatus({notice}:{notice:Notice|null}) {
 const reduced=useReducedMotion();const timing=reduced?{duration:0}:{duration:.2,ease:[.2,.8,.2,1] as const};
 return <div className={`brand-status ${notice?'has-message':''}`}>
  <motion.span className="brand-wordmark" aria-hidden="true" initial={false} animate={{opacity:notice?0:1,scale:notice&&!reduced?.94:1}} transition={timing}><Wordmark/></motion.span>
  <span className="sr-only">CocoWash</span>
  <AnimatePresence initial={false}>{notice&&<motion.span key={notice.id} className="brand-notice" aria-hidden="true" initial={{opacity:0,scale:reduced?1:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:reduced?1:.98}} transition={timing}><span>{notice.text}</span></motion.span>}</AnimatePresence>
 </div>;
}
/** Measures the room a notice may use in the header: centred on the screen like
 * the name, as wide as the gap left by the wider of the two side buttons. */
function useNoticeRoom() {
  const observer=useRef<ResizeObserver|null>(null);
  return useCallback((header:HTMLElement|null)=>{observer.current?.disconnect();observer.current=null;if(!header)return;
    const measure=()=>{const box=header.getBoundingClientRect();const k=box.width/Math.max(1,header.offsetWidth)||1;const [left,,right]=[...header.children] as HTMLElement[];
      const l=left?(left.getBoundingClientRect().right-box.left)/k:0;const r=right&&!right.classList.contains('header-spacer')?(box.right-right.getBoundingClientRect().left)/k:l;
      header.style.setProperty('--notice-room',`${Math.floor(Math.max(96,header.offsetWidth-2*(Math.max(l,r)+10)))}px`);};
    measure();const o=new ResizeObserver(measure);o.observe(header);for(const child of header.children)o.observe(child);observer.current=o;},[]);
}
/** Errors and refusals that need the person: full text, persistent until
 * closed, never squeezed into the name's slot. */
function ErrorAlert({message,clear}:{message:string;clear:()=>void}) {
  return <div className="session-alert" role="alert"><span className="notice-dot" aria-hidden="true"/><span>{message}</span><button onClick={clear} aria-label="Cerrar aviso"><XIcon size={16} weight="bold"/></button></div>;
}
/** The finger's offset on a card, written straight to motion values on every
 * pointer move: dragging never re-renders the app (only the zone it arms does). */
type Offset = { x: MotionValue<number>; y: MotionValue<number> };
const CARD_SPRING = { type: 'spring', stiffness: 380, damping: 34 } as const;
/** One card of the hand. Its place in the stack springs when it changes; the
 * finger moves it 1:1; a decided card leaves from where it was released (its
 * exit animates these same values), any other card springs back. */
function HandCard({ id, index, follow, reduced, register, children, style, ...props }: { id: string; index: number; follow: boolean; reduced: boolean; register: (id: string, offset: Offset) => () => void; children: ReactNode; style: CSSProperties } & Omit<Parameters<typeof motion.article>[0], 'style' | 'children'>) {
  const front = index === 0;
  const baseX = front ? 0 : index % 2 ? 8 : -8, baseY = -index * 6, angle = front ? 0 : index % 2 ? 3 + index : -3 - index;
  const ox = useMotionValue(0), oy = useMotionValue(0);
  const x = useMotionValue(baseX), y = useMotionValue(reduced ? baseY : baseY + 16), rotate = useMotionValue(angle);
  const pose = useRef({ x: baseX, y: baseY, r: angle, front, follow });
  pose.current = { x: baseX, y: baseY, r: angle, front, follow };
  useEffect(() => register(id, { x: ox, y: oy }), [id]);
  useEffect(() => {
    const sync = () => { const p = pose.current; if (!p.follow) return; x.stop(); y.stop(); rotate.stop();
      x.set(p.x + ox.get()); y.set(p.y + oy.get() * .55); rotate.set(p.r + (p.front ? ox.get() * .035 : 0)); };
    const a = ox.on('change', sync), b = oy.on('change', sync);
    return () => { a(); b(); };
  }, []);
  useEffect(() => {
    const dx = follow ? ox.get() : 0, dy = follow ? oy.get() : 0;
    const target = { x: baseX + dx, y: baseY + dy * .55, r: angle + (front ? dx * .035 : 0) };
    if (reduced) { x.set(target.x); y.set(target.y); rotate.set(target.r); return; }
    const runs = [animate(x, target.x, CARD_SPRING), animate(y, target.y, CARD_SPRING), animate(rotate, target.r, CARD_SPRING)];
    return () => runs.forEach(run => run.stop());
  }, [baseX, baseY, angle, front, follow, reduced]);
  return <motion.article {...props} style={{ ...style, x, y, rotate }}>{children}</motion.article>;
}
/** Live state of one video's preparation; the card on top jumps the queue. */
function useVideoStore(get: () => VideoStore, asset: Asset | undefined): VideoState {
  const [state, setState] = useState<VideoState>({ status: 'idle', progress: 0 });
  useEffect(() => {
    if (!asset || asset.kind !== 'video') { setState({ status: 'idle', progress: 0 }); return; }
    const store = get(); const unsubscribe = store.subscribe(asset, setState); store.ensure(asset);
    return unsubscribe;
  }, [asset?.id, asset?.modified, asset?.kind]);
  return state;
}
export function ManoApp() {
  // «Modo de prueba» runs the phone demo on the iPhone, ads included (testMode.ts).
  const [testMode]=useState(()=>isNative&&readTestMode());
  const demo = !isNative||testMode; const key = demo ? 'mano-demo-v1' : 'mano-library-v1';
  const sessionKey=demo?DEMO_SESSION_KEY:LIBRARY_SESSION_KEY;
  const [saved]=useState(()=>readSession(sessionKey));const resumeContext=useRef(saved?.active?saved.context:undefined);
  const [state,setState] = useState<RecordState>(()=>saved?.record??readState(key));
  const [sessionOpen,setSessionOpen]=useState(saved?.active??false);
  // The hand on the table, locked until the person acts on it (sequence.ts).
  const [lock,setLock]=useState<HandLock>(()=>saved?.active?restoreHand(saved.context,[]):NO_HAND);
  const [newAlbum,setNewAlbum]=useState('');const [creatingAlbum,setCreatingAlbum]=useState(false);
  const [pinnedInspect,setPinnedInspect]=useState(false);const [overHook,setOverHook]=useState(false);const hookHover=useRef(false);const inspectOrigin=useRef<InspectOrigin|undefined>(undefined);
  // Holding a card: where the finger is (peek) and how close it is to the dock (0–1). Motion values: no re-render per move.
  const peekX=useMotionValue(0),peekY=useMotionValue(0),anchor=useMotionValue(0);
  const [display,setDisplay]=useState<DisplaySettings>(()=>readDisplay());
  // Launch mark (Splash.tsx): shown once per launch while the app loads underneath.
  const [splash,setSplash]=useState(true);
  const [onboarded,setOnboarded]=useState(()=>{try{return localStorage.getItem(ONBOARDING_KEY)==='done';}catch{return false;}});
  const [permission,setPermission]=useState<PhotoPermission|'unknown'>(demo?'authorized':'unknown');
  const [loadError,setLoadError]=useState('');const [showDone,setShowDone]=useState(false);const [sheetTab,setSheetTab]=useState<'filters'|'settings'|'support'>('filters');
  const [stats,setStats]=useState<RoundStats>(readStats);const lifetimeKey=demo?'cocowash-demo-freed-v1':'cocowash-freed-v1';const [lifetime,setLifetime]=useState(()=>readLifetime(lifetimeKey));const [decidedHere,setDecidedHere]=useState<Set<string>>(()=>new Set());
  const videos=useRef<VideoStore|null>(null);const getVideos=()=>videos.current??(videos.current=new VideoStore());
  const [stageSize,setStageSize]=useState({width:340,height:440});const stageObserver=useRef<ResizeObserver|null>(null);
  // Callback ref: the stage remounts whenever another screen (onboarding, access,
  // end of round) replaced it, and must be measured again each time it returns.
  const stage=useCallback((element:HTMLElement|null)=>{stageObserver.current?.disconnect();stageObserver.current=null;if(!element)return;const observer=new ResizeObserver(([entry])=>{const size={width:entry.contentRect.width,height:entry.contentRect.height};stageMeasured.current=true;rootObserver.current?.disconnect();setPreviewSizing({stage:size});setStageSize(size);});observer.observe(element);stageObserver.current=observer;},[]);
  // Until the stack is on screen (onboarding, preparing), estimate its size from
  // the app frame so the first previews are requested at the right sharpness.
  const stageMeasured=useRef(false);const rootObserver=useRef<ResizeObserver|null>(null);
  const root=useCallback((element:HTMLElement|null)=>{rootObserver.current?.disconnect();rootObserver.current=null;if(!element||stageMeasured.current)return;const estimate=()=>setPreviewSizing({stage:{width:Math.max(200,element.clientWidth-32),height:Math.max(240,element.clientHeight-330)}});estimate();rootObserver.current=new ResizeObserver(estimate);rootObserver.current.observe(element);},[]);
  const [rawAssets,setAssets] = useState<Asset[]>(demo?demoAssets:[]);
  const [filter,setFilter] = useState<Filter>(saved?.filter??initialFilter);

  const [session,setSession] = useState(false); const [selected,setSelected] = useState<string[]>(saved?.active?saved.context.selected:[]);
  const [sheet,setSheet] = useState<'filters'|'review'|'albums'|null>(null); const [albums,setAlbums] = useState<Album[]>([]);
  const [loading,setLoading] = useState(false); const [busy,setBusy] = useState(false); const [connected,setConnected] = useState(demo); const [limited,setLimited] = useState(false);
  const [notice,setNoticeState] = useState<Notice|null>(null); const [error,setError] = useState('');
  const noticeId=useRef(0);
  /** One notice at a time: a new one replaces the current (crossfade); the
   * same text again only restarts its time. '\n' breaks the two lines. */
  const setNotice=useCallback((text:string)=>{if(!text){setNoticeState(null);return;}setNoticeState(previous=>previous?.text===text?{...previous}:{id:++noticeId.current,text});setSpoken(text.replace(/\n/g,' '));},[]); const [inspect,setInspect] = useState<Asset|null>(null);
  const [analyzing,setAnalyzing] = useState(false); const [progress,setProgress] = useState({done:0,total:0});
  const reduced = useReducedMotion(); const seed = useRef(saved?.seed??Math.floor(Math.random()*100000)); const [seedVersion,setSeedVersion]=useState(0);
  const gesture = useRef<{x:number;y:number;t0:number;held:boolean;timer:ReturnType<typeof setTimeout>|null;id:string;review:boolean;element?:Element;asset?:Asset;pinch?:number;zone?:StampKind|'';followers:string[]}|null>(null);
  const pointers = useRef(new Map<number,{x:number;y:number}>());
  // Decision feedback without interruptions: a stamp over the stack and a
  // VoiceOver-only announcement (no visible notice after each swipe).
  const [flash,setFlash]=useState<{kind:StampKind;key:number}|null>(null);const [spoken,setSpoken]=useState('');
  // Swipes: the finger writes each card's offset directly (HandCard); React only
  // hears which zone (keep/discard/favorite/later) the card is armed for.
  const [zone,setZone]=useState<StampKind|''>('');const stampOpacity=useMotionValue(0);
  const offsets=useRef(new Map<string,Offset>());
  const register=useCallback((id:string,offset:Offset)=>{offsets.current.set(id,offset);return()=>{if(offsets.current.get(id)===offset)offsets.current.delete(id);};},[]);
  const springBack=(ids:readonly string[])=>{for(const id of ids){const o=offsets.current.get(id);if(!o)continue;if(reduced){o.x.set(0);o.y.set(0);}else{animate(o.x,0,CARD_SPRING);animate(o.y,0,CARD_SPRING);}}};
  const resetPeek=()=>{peekX.set(0);peekY.set(0);anchor.set(0);};
  const analysisStarted=useRef('');
  const [warming,setWarming]=useState(false);
  const warmingNow=useRef(false);
  const deferredGroups=useRef<Map<string,string>|null>(null);
  const preloader=useRef<AssetPreloader<PreparedMedia>|null>(null);
  const preloadWindow=useRef<Asset[]>([]);
  const sessionNumber=useRef(0);
  const warmWait=useRef<(()=>void)|null>(null);
  const getPreloader=()=>preloader.current??(preloader.current=new AssetPreloader(prepareReviewAsset));
  const prepareWindow=(items:Asset[],sessionKey:string,videoItems?:Asset[])=>{
    getPreloader().update(items,sessionKey);getVideos().want(videoItems??items,items[0]);
    preloadWindow.current=items;
    // iCloud downloads live only while their card is in this window (warm-up
    // included) or anchored; leaving the session ([]) cancels them all natively.
    cloudPreviews.retain(inspected.current?[...items,inspected.current]:items);
  };
  const inspected=useRef<Asset|null>(null);
  // Cards read their own preload entry (Photo); the app does not re-render on
  // every preparation step.
  useEffect(()=>{
    const pool=getPreloader();
    return()=>{sessionNumber.current++;pool.dispose();preloader.current=null;warmWait.current?.();videos.current?.dispose();videos.current=null;preloadWindow.current=[];};
  },[]);
  /** The session opens as soon as the front card can be shown (or failed and
   * shows its own error): the rest of its group and the next cards keep
   * preparing behind it. */
  const waitPrepared=(pool:AssetPreloader<PreparedMedia>,front:string|undefined)=>new Promise<void>(resolve=>{
    let unsubscribe=()=>{};let done=false;
    const finish=()=>{if(done)return;done=true;unsubscribe();warmWait.current=null;resolve();};
    unsubscribe=pool.subscribe(snapshot=>{const wanted=snapshot.items.find(i=>i.id===front);if(!front||snapshot.completed===snapshot.total||wanted?.status==='ready'||wanted?.status==='error')queueMicrotask(finish);});warmWait.current=finish;
  });
  const cancelWarmup=()=>{sessionNumber.current++;warmingNow.current=false;prepareWindow([],String(sessionNumber.current));warmWait.current?.();setWarming(false);setLoading(false);const groups=deferredGroups.current;if(groups){deferredGroups.current=null;setAssets(prev=>prev.map(a=>({...a,group:groups.get(a.id)})));}};
  useEffect(()=>{document.title='CocoWash · Lo que importa, se queda';installErrorReporting();},[]);
  const appliedPolicy=useRef('');
  useEffect(()=>{saveDisplay(display);setHapticsEnabled(display.haptics);setPreviewSizing({quality:display.quality,cloud:display.cloud,scale:typeof window!=='undefined'?window.devicePixelRatio||2:2});
    const key=previewPolicyKey();if(appliedPolicy.current&&appliedPolicy.current!==key){resetPreviewPolicy();preloader.current?.invalidate();videos.current?.reconcilePolicy();}appliedPolicy.current=key;},[display]);
  useEffect(()=>{try{localStorage.setItem('cocowash-round-v1',JSON.stringify(stats));}catch{/* summary is optional */}},[stats]);
  // Long enough to read once, never lingering: 2.5–4.5 s by length.
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNoticeState(null),Math.min(4500,Math.max(2500,1600+notice.text.length*45)));return()=>clearTimeout(t);},[notice]);
  useEffect(()=>()=>{if(gesture.current?.timer)clearTimeout(gesture.current.timer);},[]);
  const initialLibrary=useRef<ReturnType<typeof Library.assets>|null>(null);
  const loadLibrary=useCallback(()=>{if(demo)return;let alive=true;setLoadError('');const request=initialLibrary.current??(initialLibrary.current=Library.permissionStatus().then(({status})=>{setPermission(status as PhotoPermission);return ['authorized','limited'].includes(status)?Library.assets():{assets:[] as Asset[],status};}));
    request.then(result=>{if(alive&&['authorized','limited'].includes(result.status)){setAssets(savedGroups(result.assets));setLimited(result.status==='limited');setConnected(true);setState(s=>reconcileLibrary(s,result.assets));}}).catch(e=>{initialLibrary.current=null;if(alive)setLoadError(e instanceof Error?e.message:'Inténtalo de nuevo en un momento.');});return()=>{alive=false;};},[]);
  useEffect(()=>loadLibrary(),[]);
  // Returning from Ajustes: pick up a newly granted (or revoked) permission.
  useEffect(()=>{if(demo)return;const recheck=()=>{if(document.visibilityState!=='visible')return;void Library.permissionStatus().then(({status})=>{setPermission(status as PhotoPermission);setLimited(status==='limited');if(['authorized','limited'].includes(status)&&!connected){initialLibrary.current=null;loadLibrary();}}).catch(()=>{});};document.addEventListener('visibilitychange',recheck);return()=>document.removeEventListener('visibilitychange',recheck);},[connected]);
  // Weight and clean-up signals measured in the background (indexer.ts); the
  // pile, counters and filters all read the enriched list.
  // Recomputed only when the set of items or their edits change (groups or
  // weights arriving keep the same list order, ids and edit dates).
  const fingerprintOf=useRef<{list:Asset[];value:string}|null>(null);
  const fingerprint=useMemo(()=>{const previous=fingerprintOf.current;
    if(previous&&previous.list.length===rawAssets.length&&previous.list.every((a,i)=>a.id===rawAssets[i].id&&a.modified===rawAssets[i].modified)){fingerprintOf.current={list:rawAssets,value:previous.value};return previous.value;}
    const value=libraryFingerprint(rawAssets);fingerprintOf.current={list:rawAssets,value};return value;},[rawAssets]);
  const index=useLibraryIndex(rawAssets,fingerprint,!demo&&connected,analyzing||warming||loading);
  const assets=useMemo(()=>enrich(rawAssets,index),[rawAssets,index.version]);
  /** «Favoritas» set: the heart takes items out of Favorites; they cannot be queued for deletion. */
  const favView=filter.smart==='favorites';
  // One canonical sequence: sorted once per library/order/seed; each decision
  // only re-filters it (linear), so the pile never re-sorts per swipe.
  const ordered=useMemo(()=>orderAssets(assets,filter.order,seed.current),[assets,filter.order,seedVersion]);
  const queue=useMemo(()=>eligibleFrom(ordered,state,filter,Date.now()),[ordered,state,filter]);
  // Geek is a display preference: toggling it must not reset bundles or anchors.
  const filterKey=JSON.stringify({...filter,geek:undefined});
  const byId=useMemo(()=>new Map(assets.map(a=>[a.id,a] as const)),[assets]);
  const isPlayable=useMemo(()=>{const allowed=playable(state,favView);return (a:Asset|undefined):a is Asset=>allowed(a);},[state,favView]);
  // The hand on the table stays put (sequence.ts): background work — similar
  // groups, weights, a preview finishing first, a library refresh — never swaps
  // it. When it is done, the next hand is dealt from the front of the pile and
  // locked; the clearly best shot of a group goes in front, decided once then.
  const shownHand=useMemo(()=>lockedHand(lock,byId,isPlayable),[lock,byId,isPlayable]);
  const dealt=useMemo(()=>shownHand.length?NO_HAND:dealHand(queue,state.later),[shownHand.length,queue,state.later]);
  const hand=useMemo(()=>shownHand.length?shownHand:lockedHand(dealt,byId,isPlayable),[shownHand,dealt,byId,isPlayable]);
  const handLock=shownHand.length?lock:dealt;
  const best=handLock.best&&hand.length>1&&hand.some(a=>a.id===handLock.best)?handLock.best:undefined;
  const windowHandKey=hand.map(a=>`${a.id}:${a.modified??0}`).join('|');
  useEffect(()=>{if(session&&!shownHand.length&&dealt.ids.length)setLock(dealt);},[session,shownHand.length,dealt]);
  const bundleKey=hand.length>1?hand[0].group??null:null;

  useEffect(()=>{if(!session)return;const frame=requestAnimationFrame(()=>document.getElementById('session-heading')?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame);},[session]);
  useEffect(()=>{const g=gesture.current;if(g&&!g.review&&!hand.some(a=>a.id===g.id)){if(g.timer)clearTimeout(g.timer);gesture.current=null;pointers.current.clear();}},[windowHandKey]);
  // Read-ahead: the hand on the table plus the next cards as they will be dealt.
  const upcoming=useMemo(()=>upcomingFrom(queue,hand,state.later,Math.max(PRELOAD_AHEAD,hand.length+2)),[queue,windowHandKey,state.later]);
  const upcomingKey=upcoming.map(a=>`${a.id}:${a.modified??0}`).join('|');
  const videoAhead=useMemo(()=>upcomingFrom(queue,hand,state.later,Math.max(VIDEO_AHEAD,hand.length+2)).filter(a=>a.kind==='video'),[queue,windowHandKey,state.later]);
  const videoKey=videoAhead.map(a=>`${a.id}:${a.modified??0}`).join('|');
  useEffect(()=>{if(session&&!warming)prepareWindow(upcoming,String(sessionNumber.current),videoAhead);},[session,warming,upcomingKey,videoKey]);
  useEffect(()=>{inspected.current=inspect;cloudPreviews.retain(inspect?[...preloadWindow.current,inspect]:preloadWindow.current);},[inspect?.id]);
  // What a decision records to be undone exactly: the hand as shown, front first.
  const context={handIds:hand.map(a=>a.id),rotated:[] as string[],selected:[...selected],group:bundleKey??undefined,filter,...(best?{best}:{})};
  const envelope:ActiveSession={version:1,active:sessionOpen,seed:seed.current,filter,context:session?context:resumeContext.current??context,updatedAt:Date.now(),record:state};
  const latest=useRef(envelope);latest.current=envelope;
  const [writer]=useState(()=>new SessionWriter());
  // Saving: the record and the session envelope are written together, at most
  // once every 350 ms while the person sorts (not once per swipe: each write
  // serialises the whole record), and at once when the app is hidden or closed.
  const dirty=useRef(false);const flushTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const flush=useCallback((checkpoint=false)=>{if(flushTimer.current){clearTimeout(flushTimer.current);flushTimer.current=null;}if(!dirty.current)return;
    if(writer.save(sessionKey,latest.current,undefined,checkpoint?key:undefined))dirty.current=false;
    else setError('No se pudo guardar el progreso. Libera espacio antes de continuar.');},[key,sessionKey,writer]);
  useEffect(()=>{dirty.current=true;if(!flushTimer.current)flushTimer.current=setTimeout(flush,350);},[state,sessionOpen,filter,windowHandKey,selected,session]);
  useEffect(()=>{const persist=()=>{dirty.current=true;flush(true);};document.addEventListener('visibilitychange',persist);window.addEventListener('pagehide',persist);return()=>{persist();document.removeEventListener('visibilitychange',persist);window.removeEventListener('pagehide',persist);};},[flush]);
  const openFilters=()=>{money.clear();setError('');setSheet('filters');};
  const active=hand[0]; const targetIds=selected.filter(id=>hand.some(a=>a.id===id)); const targets=targetIds.length?targetIds:active?[active.id]:[];
  // Ads (Monetization.tsx): only while cleaning, never over a sheet, the inspector or the splash.
  const money=useMonetization(isNative,session&&!!active&&!sheet&&!inspect&&!splash,testMode);
  const deckAd=money.placement==='deck'&&!sheet&&!inspect&&!splash;
  // «Elegir las demás»: everything but the best shot, ready for «Eliminar».
  const others=(best?hand.filter(a=>a.id!==best):hand).map(a=>a.id);const allPicked=others.length>0&&targetIds.length===others.length&&others.every(id=>targetIds.includes(id));
  const reviewAssets=useMemo(()=>{const pending=new Set(state.pending);return assets.filter(a=>pending.has(a.id));},[assets,state.pending]);
  // What «Eliminar N» would free; partial while weights are still being measured.
  const reviewBytes=useMemo(()=>({bytes:reviewAssets.reduce((n,a)=>n+(a.bytes??0),0),partial:reviewAssets.some(a=>!a.bytes)}),[reviewAssets]);
  // Weights exist only for originals on this iPhone: with any unknown, the figure
  // is a lower bound («al menos») and the button does not state it.
  const freeLabel=formatBytes(reviewBytes.bytes)??'';
  const messageError=(e:unknown)=>setError(e instanceof Error?e.message:'No se pudo completar la acción. Inténtalo de nuevo.');
  const connect=useCallback(async()=>{setLoading(true);setError('');try{
    const access=await Library.authorize();setPermission(access.status as PhotoPermission);if(!['authorized','limited'].includes(access.status))return false;
    const result=await Library.assets();setAssets(savedGroups(result.assets));setState(s=>reconcileLibrary(s,result.assets));setLimited(result.status==='limited');setConnected(true);analysisStarted.current='';setPermission(result.status as PhotoPermission);return savedGroups(result.assets);
  }catch(e){messageError(e);return false;}finally{setLoading(false);}},[]);
  const beginSession=async()=>{
    if(loading||warming)return;
    let available=connected?assets:await connect();if(available===false)return;available=enrich(available,index);
    const record=connected?state:reconcileLibrary(state,available);
    money.clear();const number=++sessionNumber.current;if(!sessionOpen){setVideoSound(false);seed.current=Math.floor(Math.random()*100000);setSeedVersion(v=>v+1);setLock(NO_HAND);setSelected([]);setState(s=>({...s,history:[]}));setStats(EMPTY_STATS);}setShowDone(false);
    warmingNow.current=true;setWarming(true);setError('');setNotice('');
    // The similar-photo search keeps running (utility priority natively): stopping
    // it here threw away its work and restarted it from zero after every warm-up.
    do {
      const groups=deferredGroups.current;if(groups){deferredGroups.current=null;available=available.map(a=>({...a,group:groups.get(a.id)}));setAssets(available);}
      // Resume: the locked hand comes back as it was; otherwise the first hand.
      const source=new Map(available.map(a=>[a.id,a] as const));const pile=eligible(available,record,filter,Date.now(),seed.current);
      const resumed=sessionOpen?lockedHand(lock,source,playable(record,favView)):[];
      const first=resumed.length?resumed:lockedHand(dealHand(pile,record.later),source,playable(record,favView));
      prepareWindow(upcomingFrom(pile,first,record.later,Math.max(PRELOAD_AHEAD,first.length+2)),String(number),upcomingFrom(pile,first,record.later,Math.max(VIDEO_AHEAD,first.length+2)).filter(a=>a.kind==='video'));
      await waitPrepared(getPreloader(),first[0]?.id);if(number!==sessionNumber.current)return;
    } while(deferredGroups.current);
    warmingNow.current=false;setWarming(false);setSession(true);resumeContext.current=undefined;setSessionOpen(true);
  };
  // «Terminar»: with items marked to delete, «Una última mirada» opens over the
  // session (closing it goes back to the cards); the round ends with «Eliminar».
  // With nothing to delete it ends here.
  const closeSession=()=>{money.finish();const review=state.pending.length>0;resumeContext.current=undefined;cancelWarmup();cancel();setSheet(review?'review':null);setSession(false);setSessionOpen(false);setSelected([]);setLock(NO_HAND);setState(s=>({...s,history:[]}));setShowDone(true);haptic(review?'light':'success');};
  /** The decision itself (shared by swipes, buttons and album saves): one
   * undoable history entry, stats, and the move to the next card. */
  const SPOKEN={keep:'Conservada',discard:'Para eliminar; se borra solo al confirmar',favorite:'Favorita',later:'Para más tarde: vuelve al final',unfavorite:'Quitada de Favoritas: vuelve a la pila'} as const;
  const [videoSound,setVideoSound]=useState(false);
  const shareBusy=useRef(false);
  const [sharing,setSharing]=useState(false);
  const shareActive=async (asset:Asset)=>{
    if(shareBusy.current)return;
    shareBusy.current=true;setSharing(true);setSpoken('Preparando archivo para compartir');
    try {
      await Library.share({id:asset.id});
    } catch {
      setNotice('No se pudo compartir el archivo. Comprueba la conexión e inténtalo de nuevo.');
    } finally { shareBusy.current=false;setSharing(false); }
  };
  // The front video card: a quick tap pauses/plays it; holding it hands its frame to the held view.
  const videoControl=useRef<VideoControl|null>(null);const heldVideo=useRef<HTMLVideoElement|null>(null);
  const hideSeals=()=>{setDisplay(d=>({...d,photo:{...d.photo,seal:false}}));haptic('selection');setNotice('Sellos ocultos\nVuelven en Ajustes');};
  const record=(action:Action,ids:string[],apply=(s:RecordState)=>decide(s,ids,action,Date.now(),context))=>{
    // The rest of the hand stays exactly as shown; an empty hand deals the next.
    setState(apply);setLock(afterDecision(hand,ids,best));setPinnedInspect(false);setInspect(null);setSelected([]);
    if(action!=='unfavorite'){setStats(previous=>({...previous,[action]:previous[action]+ids.length}));setFlash({kind:action,key:Date.now()});}setDecidedHere(previous=>new Set([...previous,...ids]));money.review(ids);
    setSpoken(`${SPOKEN[action]}${ids.length>1?`: ${ids.length}`:''}`);
  };
  /** Resolves true when the decision was recorded. */
  const act=async(requested:Action,ids=targets):Promise<boolean>=>{if(busy||!ids.length)return false;
    // In «Favoritas» the heart (and the swipe up) takes items out of Favorites,
    // and nothing there can be queued for deletion.
    const action:Action=favView&&requested==='favorite'?'unfavorite':requested;
    if(favView&&action==='discard'){haptic('warning');setNotice('Las favoritas\nno se eliminan');return false;}
    setBusy(true);setError('');haptic(action==='favorite'||action==='unfavorite'?'medium':action==='later'?'soft':'light');try{
    if((action==='favorite'||action==='unfavorite')&&!demo)await Library.favorite({ids,value:action==='favorite'});
    record(action,ids);return true;
  }catch(e){haptic('error');messageError(e);return false;}finally{setBusy(false);}};
  const undoLast=async()=>{if(busy)return;const last=state.history.at(-1);if(!last)return;setBusy(true);try{
    let missing=0;let missingIds:string[]=[];
    if((last.action==='favorite'||last.action==='unfavorite')&&!demo){const result=await Library.favorite({ids:last.ids,value:last.action==='unfavorite',ignoreMissing:true});missing=result.missing.length;missingIds=result.missing;}
    const undone=last.action;haptic('soft');if(undone!=='unfavorite')setStats(previous=>({...previous,[undone]:Math.max(0,previous[undone]-last.ids.length)}));
    // Back to the very hand the decision was made on, in the order it was shown.
    setState(undo);const previous=last.context;setLock(restoreHand(previous,last.ids));setSelected(previous?.selected??[]);if(previous?.filter)setFilter(previous.filter);if(missing)setNotice(missing===last.ids.length?'Ya no está\nen Fotos':'Algunas ya no\nestán en Fotos');setSpoken('Última decisión deshecha');
    // No library reload here (it re-read every asset over the bridge while the
    // buttons waited): Photos already confirmed the change; items it reported
    // missing leave the pile locally.
    if(missingIds.length){const gone=new Set(missingIds);setAssets(prev=>prev.filter(a=>!gone.has(a.id)));}
  }catch(e){messageError(e);}finally{setBusy(false);}};
  const cycle=()=>{if(active&&hand.length>1){const refocus=document.activeElement?.classList.contains('photo-card');setLock(cycleHand(hand,best));if(refocus)requestAnimationFrame(()=>document.querySelector<HTMLElement>('.photo-card.front')?.focus({preventScroll:true}));}};
  const select=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const windowOf=(element:Element)=>(element.querySelector('.photo-window')??element).getBoundingClientRect();
  const openPinned=(asset:Asset,element:Element)=>{heldVideo.current=element.querySelector('video');inspectOrigin.current=windowOf(element);resetPeek();setPinnedInspect(true);setInspect(asset);haptic('rigid');};
  const closeInspect=()=>{setPinnedInspect(false);setInspect(null);haptic('soft');};
  /** Proximity (0–1) to the single bottom dock; armed within 64 px after a
   * deliberate downward drag. Also checked on release, where the last move may
   * not have landed exactly on the dock. */
  const anchorAt=(clientX:number,clientY:number,dragY:number)=>{const box=document.querySelector('[data-inspection-hook]')?.getBoundingClientRect();if(!box)return false;
    const distance=Math.hypot(Math.max(box.left-clientX,0,clientX-box.right),Math.max(box.top-clientY,0,clientY-box.bottom));
    anchor.set(dragY>16?Math.max(0,Math.min(1,1-Math.max(0,distance-64)/200)):0);return dragY>64&&distance<=64;};
  // In «Favoritas» a drag left arms nothing: favourites are never queued for deletion.
  const zoneOf=(x:number,y:number):StampKind|''=>x>45?'keep':x< -45?(favView?'':'discard'):y< -45?'favorite':y>45?'later':'';
  // Gesture timing uses each event's own timeStamp (when the finger acted), not
  // when a busy main thread got round to the handler or a timer: under load
  // queued moves can run before a 380 ms timer, and a re-render between two taps
  // can push handler time past the double-tap window.
  const HOLD_MS=380;
  const hold=(g:NonNullable<typeof gesture.current>)=>{if(g.held)return;if(g.timer){clearTimeout(g.timer);g.timer=null;}g.held=true;haptic(g.review?'selection':'medium');
    if(!g.review&&g.element&&g.asset){springBack(g.followers);setZone('');heldVideo.current=g.element.querySelector('video');inspectOrigin.current=windowOf(g.element);resetPeek();setPinnedInspect(false);hookHover.current=false;setOverHook(false);setInspect(g.asset);
      // Holding a photo that lives in iCloud is a reason to fetch the larger
      // preview now: «Anclar» then joins this download instead of starting one.
      if(g.asset.kind!=='video'&&preloader.current?.peek(g.asset)?.value?.cloud)void cloudPreviews.fetch(g.asset,'zoom').catch(()=>{});}};
  const start=(e:PointerEvent,asset:Asset,review=false)=>{if(busy||(e.target as HTMLElement).closest('button'))return;
    // A finger lifted while its card unmounted never reached end(): drop stale ids.
    if(!gesture.current)pointers.current.clear();
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const current=gesture.current;
    // Second finger on the top card: a pinch-out opens the anchored, zoomable view.
    if(current&&!current.review&&!current.held&&pointers.current.size===2){if(current.timer)clearTimeout(current.timer);current.timer=null;const [a,b]=[...pointers.current.values()];current.pinch=Math.hypot(b.x-a.x,b.y-a.y);springBack(current.followers);setZone('');e.currentTarget.setPointerCapture(e.pointerId);return;}
    e.currentTarget.setPointerCapture(e.pointerId);
    // The card under the finger and any selected cards of the hand move together.
    const followers=review?[]:[...new Set([...(hand[0]?.id===asset.id?[asset.id]:[]),...targetIds])];
    const g:NonNullable<typeof gesture.current>={x:e.clientX,y:e.clientY,t0:e.timeStamp,held:false,timer:null,id:asset.id,review,element:e.currentTarget,asset,followers};
    g.timer=setTimeout(()=>{g.timer=null;hold(g);},HOLD_MS);gesture.current=g;};
  const move=(e:PointerEvent)=>{const g=gesture.current;if(!g)return;if(pointers.current.has(e.pointerId))pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(g.pinch){const [a,b]=[...pointers.current.values()];if(a&&b&&Math.hypot(b.x-a.x,b.y-a.y)/g.pinch>1.25){const asset=hand.find(h=>h.id===g.id);gesture.current=null;if(asset)openPinned(asset,e.currentTarget);}return;}
    const x=e.clientX-g.x,y=e.clientY-g.y;
    if(!g.held&&Math.hypot(x,y)>10&&g.timer){
      // The finger stayed within slop for the whole hold time: it is a hold, even
      // if the timer has not run yet. Otherwise this is the start of a swipe.
      if(e.timeStamp-g.t0>=HOLD_MS)hold(g);else{clearTimeout(g.timer);g.timer=null;}
    }
    if(g.held&&!g.review){
      // One dock at the bottom. Proximity fills it progressively; it arms only
      // after a deliberate downward drag that reaches it (fewer accidents).
      peekX.set(x);peekY.set(y);const armed=anchorAt(e.clientX,e.clientY,y);
      if(armed!==hookHover.current){hookHover.current=armed;setOverHook(armed);if(armed)haptic('selection');}
    }else if(g.review&&g.held){(g.element as HTMLElement).style.transform=`translateX(${Math.max(0,x)}px)`;}
    else if(!g.review&&!g.held){for(const id of g.followers){const o=offsets.current.get(id);o?.x.set(x);o?.y.set(y);}stampOpacity.set(Math.min(1,.4+Math.max(Math.abs(x),Math.abs(y))/120));
      const next=zoneOf(x,y);if(next!==(g.zone??'')){g.zone=next;setZone(next);if(next)haptic('selection');}}};
  const end=(e:PointerEvent)=>{pointers.current.delete(e.pointerId);const g=gesture.current;if(!g)return;if(g.pinch){if(!pointers.current.size){gesture.current=null;}return;}if(g.timer)clearTimeout(g.timer);const x=e.clientX-g.x,y=e.clientY-g.y;
    if(g.held&&!g.review&&!hookHover.current)hookHover.current=anchorAt(e.clientX,e.clientY,y);
    // Only touch state that changed: a plain tap must not re-render the whole app.
    // Only touch state that changed: a plain tap must not re-render the whole app.
    gesture.current=null;if(g.zone)setZone('');resetPeek();if(g.held&&!g.review&&hookHover.current){setPinnedInspect(true);haptic('rigid');}else if(g.held){setPinnedInspect(false);setInspect(null);}
    if(hookHover.current){hookHover.current=false;setOverHook(false);}
    if(g.review){if(g.element)(g.element as HTMLElement).style.transform='';if(g.held&&x>65){setState(s=>restore(s,g.id));setSpoken('Elemento recuperado');haptic('light');}return;}if(g.held)return;
    const decision:Action|null=Math.abs(x)>65&&Math.abs(x)>Math.abs(y)?(x>0?'keep':'discard'):y< -70&&Math.abs(y)>Math.abs(x)?'favorite':y>70&&Math.abs(y)>Math.abs(x)?'later':null;
    if(decision){
      // Decided cards leave from where the finger let go; the others spring back
      // (also the decided ones if the decision did not happen).
      const decided=targets;springBack(g.followers.filter(id=>!decided.includes(id)));
      void act(decision,decided).then(done=>{if(!done)springBack(decided);});return;
    }
    springBack(g.followers);
    // A tap advances at once: no double-tap window to wait out. Looking closer is
    // a pinch, a hold dragged to the dock, or the focusable «Anclar» button.
    // On a video card the tap pauses or plays it (videos never come in groups).
    if(Math.hypot(x,y)<10){if(hand[0]?.id===g.id){if(hand[0].kind==='video')videoControl.current?.toggle();else if(hand.length>1)cycle();}else select(g.id);}};
  const cancel=()=>{const g=gesture.current;if(g?.timer)clearTimeout(g.timer);if(g){springBack(g.followers);if(g.review&&g.element)(g.element as HTMLElement).style.transform='';}gesture.current=null;pointers.current.clear();setPinnedInspect(false);setInspect(null);setZone('');resetPeek();hookHover.current=false;setOverHook(false);};
  const analyze=async(manual=false)=>{if(analyzing)return;setAnalyzing(true);if(manual)setError('');let listener:{remove():Promise<void>}|undefined;try{
    if(demo){if(manual)setNotice('Grupos de\ndemostración');return;}listener=await Library.addListener('analysisProgress',setProgress);
    // Photos only: videos are never stacked, so they are not compared either.
    const result=await Library.analyze({ids:assets.filter(a=>a.kind!=='video').map(a=>a.id),threshold:.28});const groups=new Map(result.groups.flatMap((ids,i)=>ids.map(id=>[id,`vision-${i}`] as const)));
    localStorage.setItem('mano-similarity-v1',JSON.stringify(Object.fromEntries(groups)));
    if(!result.skipped&&!result.cancelled)localStorage.setItem('mano-analysis-complete-v1',fingerprint);else localStorage.removeItem('mano-analysis-complete-v1');
    if(warmingNow.current)deferredGroups.current=groups;else setAssets(prev=>prev.map(a=>({...a,group:groups.get(a.id)})));if(manual)setNotice(result.cancelled?'Búsqueda\ndetenida':result.groups.length?`${result.groups.length} grupos\nde parecidas`:'Sin fotos\nparecidas');
  }catch(e){if(manual)messageError(e);}finally{try{await listener?.remove();}finally{setAnalyzing(false);}}};
  useEffect(()=>{if(!demo&&connected&&!loading&&!warming&&!analyzing&&assets.length&&analysisStarted.current!==fingerprint&&localStorage.getItem('mano-analysis-complete-v1')!==fingerprint){analysisStarted.current=fingerprint;void analyze();}},[connected,fingerprint,loading,warming,analyzing]);
  const stopAnalysis=async()=>{try{await Library.cancelAnalysis();}catch(e){messageError(e);}};
  /** Album = assign, then keep and advance (undoable like a swipe). If Fotos
   * fails, nothing is kept and the card stays. */
  const saveToAlbum=async(write:()=>Promise<{title:string;added?:number}>)=>{const ids=targets;if(busy||!ids.length)return false;setBusy(true);setError('');
    const outcome=await assignToAlbum(write,ids);
    if(outcome.ok){record('keep',ids,s=>afterAlbum(s,ids,outcome,Date.now(),context));setSheet(null);haptic('success');setNotice(`Guardada en\n«${outcome.title}»`);}
    else{haptic('error');messageError(outcome.error);}
    setBusy(false);return outcome.ok;};
  const createAlbum=async()=>{const title=newAlbum.trim();if(!title)return;const ok=await saveToAlbum(async()=>{const result=demo?{album:{id:`demo-${Date.now()}`,title},added:targets.length}:await Library.createAlbum({title,ids:targets});setAlbums(a=>[result.album,...a]);return {title:result.album.title,added:result.added};});if(ok){setNewAlbum('');setCreatingAlbum(false);}};
  const openAlbums=async()=>{if(!targets.length)return;setSheet('albums');setCreatingAlbum(false);setNewAlbum('');setError('');try{setAlbums(demo&&albums.length?albums:demo?[{id:'viajes',title:'Viajes'},{id:'recuerdos',title:'Recuerdos'},{id:'familia',title:'Familia'}]:(await Library.albums()).albums);}catch(e){messageError(e);}};
  const addAlbum=(album:Album)=>void saveToAlbum(async()=>{if(!demo)await Library.addToAlbum({ids:targets,albumId:album.id});return {title:album.title};});
  const commitDelete=async()=>{if(busy)return;setBusy(true);setError('');const ids=reviewAssets.map(a=>a.id);try{
    const result=demo?{deleted:ids}:await Library.deleteAssets({ids});
    // The reward: what this deletion frees (measured weights; «al menos» when some
    // were unknown), counted for the round and for CocoWash as a whole.
    const gone=reviewAssets.filter(a=>result.deleted.includes(a.id));const bytes=gone.reduce((n,a)=>n+(a.bytes??0),0);const videos=gone.filter(a=>a.kind==='video').length;
    setStats(p=>({...p,freed:p.freed+bytes,freedPhotos:p.freedPhotos+gone.length-videos,freedVideos:p.freedVideos+videos,freedPartial:p.freedPartial||gone.some(a=>!a.bytes)}));
    setLifetime(p=>{const next={bytes:p.bytes+bytes,items:p.items+gone.length};saveLifetime(lifetimeKey,next);return next;});
    setState(s=>({...s,pending:s.pending.filter(id=>!result.deleted.includes(id)),removed:[...new Set([...s.removed,...result.deleted])],history:[]}));
    money.finish();cancelWarmup();setLock(NO_HAND);setSessionOpen(false);setSheet(null);setSession(false);setShowDone(true);haptic('success');if(demo)setNotice('Borrado simulado\nTus fotos, intactas');else setSpoken(`${result.deleted.length} enviadas a Eliminado recientemente`);
  }catch(e){messageError(e);}finally{setBusy(false);}};
  const play=async(asset:Asset)=>{if(demo){setNotice(testMode?'Modo de prueba\nsin pantalla completa':'Pantalla completa\nsolo en el iPhone');return;}try{await Library.preview({id:asset.id});}catch(e){messageError(e);}};
  const requestAccess=async():Promise<PhotoPermission>=>{if(demo)return 'authorized';try{const {status}=await Library.authorize();setPermission(status as PhotoPermission);if(['authorized','limited'].includes(status)){initialLibrary.current=null;loadLibrary();}return status as PhotoPermission;}catch{return 'denied';}};
  const finishOnboarding=(status:PhotoPermission)=>{try{localStorage.setItem(ONBOARDING_KEY,'done');}catch{/* shown again next launch */}setOnboarded(true);haptic(['authorized','limited'].includes(status)?'success':'warning');};
  const openSettings=()=>{void Library.openSettings().catch(()=>setError('Abre Ajustes › CocoWash › Fotos para permitir el acceso.'));};
  const manageLimited=async()=>{if(demo)return;try{const result=await Library.manageLimitedAccess();if(result.changed)await connect();}catch(e){messageError(e);}};
  const allowed=permission==='authorized'||permission==='limited';
  // No landing page: once onboarded and allowed, the session (or its resume) starts by itself.
  useEffect(()=>{if(onboarded&&allowed&&connected&&!session&&!showDone&&!warming&&!loading&&!loadError)void beginSession();},[onboarded,allowed,connected,session,showDone,warming,loading,loadError]);
  useEffect(()=>{setDecidedHere(new Set());},[filterKey]);
  const frontVideo=useVideoStore(getVideos,active);
  const placeWanted=(a:Asset)=>a.kind==='video'?display.video.location:display.photo.location;
  const frontPlace=usePlace(active,!!active&&placeWanted(active));
  // Resolve the next places in the window ahead of time, one request at a time
  // behind the card on screen (native pacing and per-id cache unchanged).
  useEffect(()=>{if(session)prefetchPlaces(upcoming.filter(a=>a.hasLocation&&placeWanted(a)));},[session,upcomingKey,display.photo.location,display.video.location]);
  const scope=useMemo(()=>filterScope(assets,state,filter,Date.now(),decidedHere,queue.length),[assets,state,filter,decidedHere,queue.length]);
  const currentColor=zone;
  const lastDecision=state.history.at(-1);
  const noticeRoom=useNoticeRoom();
  const filtersButton=<button id="filter-trigger" className="header-action header-filters" onClick={openFilters}><SlidersHorizontalIcon size={18}/><span>Filtros</span></button>;
  const brand=<h1 id="session-heading" tabIndex={-1} className="header-brand"><BrandStatus notice={notice}/></h1>;
  const alert=error&&!sheet?<ErrorAlert message={error} clear={()=>setError('')}/>:null;
  // 9.8: the round summary is a closing moment — no way into Filtros from here, only «Seguir revisando».
  const doneHeader=<><header ref={noticeRoom} className="archive-header"><span className="header-spacer" aria-hidden="true"/>{brand}<span className="header-spacer" aria-hidden="true"/></header>{alert}</>;
  const pending=state.pending.length;
  let screen:ReactNode;
  if(!onboarded)screen=<Onboarding requestAccess={requestAccess} finish={finishOnboarding} granted={permission==='authorized'||permission==='limited'}/>;
  else if(permission==='unknown')screen=loadError?<LoadErrorScreen message={loadError} retry={()=>{initialLibrary.current=null;loadLibrary();}}/>:<PreparingScreen/>;
  else if(!allowed)screen=<AccessScreen status={permission} request={()=>void requestAccess()} openSettings={openSettings}/>;
  else if(loadError)screen=<LoadErrorScreen message={loadError} retry={()=>{initialLibrary.current=null;loadLibrary();}}/>;
  else if(!session)screen=showDone&&sheet==='review'?<div className="session-content">{doneHeader}<main className="status-screen is-quiet"><Character pose="memo-cards" height={120} motion="still"/><p className="status-line">Una última mirada antes de terminar.</p></main></div>:showDone?<div className="session-content">{doneHeader}<SessionDone stats={stats} pending={pending} pendingBytes={reviewBytes.bytes} pendingPartial={reviewBytes.partial} lifetime={lifetime.bytes} again={()=>{money.clear();setShowDone(false);setNotice('');}} review={()=>{money.clear();setError('');setSheet('review');}} monetization={money.available&&money.placement==='finish'&&<div className="finish-monetization"><AdSlot where="finish" money={money}/></div>}/></div>:<PreparingScreen cancel={()=>{cancelWarmup();setShowDone(true);}}/>;
  else screen=<div className="session-content" inert={pinnedInspect}>
    {/* «Terminar» ends the round: the summary keeps pending discards and offers the review. */}
    <header ref={noticeRoom} className="archive-header is-session">{filtersButton}{brand}<FinishButton pending={pending} busy={busy} announce={setSpoken} finish={()=>{cancel();setError('');setSheet('review');haptic('light');}}/></header>
    {/* Second row: how far through the filtered pile (same calculation as before). */}
    <div className="archive-progress">{testMode&&<button className="access-indicator test-mode" onClick={()=>{setSheetTab('settings');setSheet('filters');}}>Modo de prueba</button>}{limited&&<button className="access-indicator" onClick={()=>void manageLimited()}><InfoIcon size={14} weight="bold"/>Acceso limitado</button>}<PileProgress reviewed={scope.reviewed} total={scope.total} count={<><AnimatedNumber value={scope.reviewed}/><span className="pile-slash">/</span><AnimatedNumber value={scope.total} className="is-total"/></>}/></div>
    <section ref={stage} className={`hand-space ${currentColor}`} aria-label="Pila de recuerdos">{alert}
      {deckAd?<motion.div key="deck-ad" className="ad-stage" initial={reduced?false:{opacity:0,y:16,scale:.96}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.3,ease:[.2,.8,.2,1]}}><AdSlot where="deck" money={money}/></motion.div>:!connected?<div className="empty-state"><Character pose="coqui-wave" height={140} className="empty-character"/><h2>Tu carrete, en tus manos.</h2><p>Revisa, conserva y ordena tus recuerdos. Nada se borra sin tu confirmación.</p><button className="primary-empty" onClick={connect} disabled={loading}>{loading?'Abriendo Fotos…':'Abrir mi biblioteca'}</button><small>Todo se analiza en tu iPhone.</small></div>:!active?<div className="empty-state"><Character pose={scope.total?'memo-calm':'memo-wonder'} height={120} className="empty-character" motion="sway"/><h2>{favView&&!scope.total?'Aún no hay favoritas.':scope.total?'Todo en su sitio.':'Nada con estos filtros.'}</h2><p>{favView&&!scope.total?'Toca el corazón o desliza hacia arriba para guardar una.':pending?'Lo marcado para eliminar te espera al pulsar Terminar.':scope.total?'No quedan fotos pendientes con estos filtros.':'Prueba con otras fechas o con todo el contenido.'}</p><button className="primary-empty" onClick={()=>{setSheetTab('filters');setSheet('filters');}}>Cambiar filtros</button>{!demo&&<button className="text-button" onClick={connect}>Actualizar biblioteca</button>}</div>:<div className="polaroid-stack" data-testid="photo-hand">
        <AnimatePresence>{bundleKey&&<motion.div className="bundle-arrival" key={bundleKey} initial={reduced?false:{opacity:0,scale:.94,y:-6}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}} transition={{duration:.24,ease:[.2,.8,.2,1]}} role="status"><StackIcon size={15} weight="bold"/><span aria-hidden="true">{targetIds.length ? `${targetIds.length} de ${hand.length}` : `${hand.length} fotos`}</span><span className="sr-only">{targetIds.length ? `${targetIds.length} de ${hand.length} fotos seleccionadas` : `${hand.length} fotos`}</span></motion.div>}</AnimatePresence>
        {bundleKey&&!reduced&&<motion.div key={`flash-${bundleKey}`} className="bundle-flash" initial={{opacity:0}} animate={{opacity:[0,.14,0]}} transition={{duration:.5}}/>}
        <AnimatePresence custom={lastDecision}>{[...hand].reverse().map(asset=>{const tape=asset.kind==='video';const {cardWidth,cardHeight}=cardBox(stageSize,asset);const index=hand.indexOf(asset),picked=targetIds.includes(asset.id);
          const kindLabel=asset.kind==='video'?'Vídeo':asset.kind==='live'?'Live Photo':'Foto';const lifting=index===0&&!!inspect&&inspect.id===asset.id;
          return <HandCard key={asset.id} id={asset.id} index={index} follow={index===0||picked} reduced={!!reduced} register={register} inert={index!==0} data-testid={`card-${asset.id}`} className={`photo-card ${tape?'tape':'paper'} ${index===0?'front':''} ${picked?'picked':''} ${lifting?'is-lifted':''}`} style={{zIndex:20-index,width:cardWidth,height:cardHeight,left:`calc(50% - ${cardWidth/2}px)`,top:`calc(50% - ${cardHeight/2}px)`} as CSSProperties}
            initial={reduced?false:{opacity:0,scale:.97}} animate={{opacity:1,scale:1-index*.018}}
            variants={{leave:(decision?:Decision)=>cardExit(asset.id,decision,reduced)}} exit="leave"
            transition={reduced?{duration:0}:CARD_SPRING}
            onPointerDown={e=>start(e,asset)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel}
            tabIndex={index===0?0:-1} aria-hidden={index!==0} aria-label={`${kindLabel} ${index+1} de ${hand.length}${picked?', seleccionada':''}${tape?'. Toca o pulsa Intro para pausar o reproducir.':hand.length>1?'. Intro para ver la siguiente; espacio para seleccionar.':''}`} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key===' '){e.preventDefault();select(asset.id);}if(e.key==='Enter'){e.preventDefault();index===0?(tape?videoControl.current?.toggle():cycle()):select(asset.id);}}}>
            <div className="photo-window">{tape&&index===0?<InlineVideo key={asset.id} tools={isNative&&!demo?<CardShare asset={asset} sharing={sharing} share={shareActive}/>:undefined} asset={asset} state={frontVideo} active={!inspect&&!sheet&&!sharing} retry={()=>getVideos().retry(asset)} download={()=>getVideos().download(asset)} fullscreen={()=>void play(asset)} openSettings={openSettings} meta={display.video} place={frontPlace} sound={videoSound} onSound={()=>setVideoSound(v=>!v)} onOsd={()=>setDisplay(d=>({...d,video:{...d.video,osd:!d.video.osd}}))} control={videoControl}><Photo asset={asset} quiet pool={preloader.current}/></InlineVideo>:<Photo asset={asset} quiet={tape} pool={preloader.current}/>}</div>
            {index===0&&!tape&&<PolaroidCaption asset={asset} settings={display.photo} place={frontPlace} pending={display.photo.location&&!!asset.hasLocation&&frontPlace===undefined}/>}
            {hand.length>1&&<button tabIndex={index===0?0:-1} className={`pick-toggle ${picked?'selected':''}`} aria-label={`${picked?'Deseleccionar':'Seleccionar'} ${kindLabel.toLowerCase()} ${index+1}`} aria-pressed={picked} onPointerDown={e=>e.stopPropagation()} onClick={()=>{haptic('selection');select(asset.id);}}><CheckIcon size={16} weight="bold"/></button>}
            {index===0&&!tape&&isNative&&!demo&&<CardShare asset={asset} sharing={sharing} share={shareActive}/>}
            {index===0&&<button className="zoom-access" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();openPinned(asset,e.currentTarget.closest('article')!);}}><PushPinIcon size={16} weight="bold"/>Anclar</button>}
            {index===0&&filter.geek&&<button className="geek-access" aria-label="Ver datos del archivo" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();openPinned(asset,e.currentTarget.closest('article')!);}}><InfoIcon size={18} weight="bold"/></button>}
            {index===0&&asset.id===best&&<span className="best-chip"><SparkleIcon size={13} weight="fill"/>Mejor toma</span>}
            {display.photo.seal&&state.marks[asset.id]&&<Seal level={state.marks[asset.id].level} hide={hideSeals}/>}{asset.kind==='live'&&<button className="media-play" onPointerDown={e=>e.stopPropagation()} onClick={()=>play(asset)} aria-label="Reproducir Live Photo"><PlayIcon weight="fill" size={14}/>LIVE</button>}
          </HandCard>;
        })}</AnimatePresence>
        {currentColor&&!(favView&&currentColor==='favorite')&&<motion.span className={`drag-stamp ${currentColor}`} style={{opacity:stampOpacity}}><Stamp kind={currentColor} word/></motion.span>}
        {flash&&<DecisionStamp key={flash.key} kind={flash.kind} reduced={!!reduced} done={()=>setFlash(f=>f?.key===flash.key?null:f)}/>}
      </div>}
    </section>
    <div className="bundle-controls" inert={deckAd}>{hand.length>1&&!deckAd?<div className="segmented"><button onClick={()=>{haptic('selection');setSelected(allPicked?[]:others);}}>{allPicked?'Quitar selección':best?'Elegir las demás':'Elegir todas'}</button><button onClick={cycle} aria-label="Ver la siguiente foto del grupo"><ArrowClockwiseIcon size={16}/>Siguiente</button></div>:null}</div>
    {/* Eliminar (←) · the heart, protagonist · Conservar (→): three buttons drawn
        as one set (DecisionBar). The piece on the side the card is dragged
        toward rises. In «Favoritas» the heart is on and takes items out. */}
    <DecisionBar count={targets.length} disabled={deckAd||!active||busy} favoriteOn={favView} armed={currentColor}
      onDiscard={()=>void act('discard')} onFavorite={()=>void act('favorite')} onKeep={()=>void act('keep')}/>
    <footer className="archive-tools" inert={deckAd}><button onClick={undoLast} disabled={busy||!state.history.length} aria-label={state.history.length?'Deshacer la última decisión':'Nada que deshacer'}><span className="tool-icon"><ArrowUUpLeftIcon size={24}/></span><span className="tool-label">Deshacer</span></button><button className="later" aria-label={targets.length>1?`Dejar ${targets.length} para más tarde`:'Dejar para más tarde'} disabled={!active||busy} onClick={()=>act('later')}><span className="tool-icon"><DecisionIcon kind="later" size={24}/></span><span className="tool-label">Más tarde</span></button><button id="album-trigger" onClick={openAlbums} disabled={!active||busy}><span className="tool-icon"><FolderSimplePlusIcon size={24}/></span><span className="tool-label">Álbum</span></button></footer>
    </div>;
  const libraryActions=<>
    <button className="sheet-action secondary" onClick={()=>void analyze(true)} disabled={analyzing}>{analyzing?<><CocoLoader size={22} progress={progress.total?progress.done/progress.total:undefined}/>Buscando parecidas…</>:'Buscar fotos parecidas'}</button>
    {analyzing&&<button className="sheet-action quiet" onClick={stopAnalysis}>Detener búsqueda</button>}
    {!demo&&<button className="sheet-action secondary" onClick={connect}>Actualizar biblioteca</button>}
    {limited&&<button className="sheet-action secondary" onClick={()=>void manageLimited()}>Elegir más fotos</button>}
    <p className="sheet-fine">Todo se analiza en tu iPhone. Las fotos de iCloud pueden necesitar conexión.</p>
  </>;
  const recoverAll=()=>{setState(s=>({...s,pending:[],history:s.history.filter(d=>d.action!=='discard')}));setSpoken('Todo recuperado');haptic('soft');};
  const recoverReview=useCallback((id:string)=>{setState(s=>restore(s,id));setSpoken('Elemento recuperado');},[]);
  // Long press never opens the system menu or loupe; text fields keep theirs.
  const blockMenu=(e:MouseEvent)=>{if(!(e.target as HTMLElement).closest('input,textarea'))e.preventDefault();};
  return <div ref={root} className={`mano-app ${isNative?'on-device':''} ${session?'in-session':'on-screen'}`} onContextMenu={blockMenu}>
    {screen}
    <p className="sr-only" role="status" aria-live="polite">{spoken}</p>
    {splash&&<Splash done={()=>setSplash(false)}/>}
    <AnimatePresence>{inspect&&<InspectorBoundary key={inspect.id} close={closeInspect}><Inspector asset={inspect} src={sharpPreview(inspect)??(preloader.current?.get(inspect)?.poster||undefined)} cloud={!!preloader.current?.peek(inspect)?.value?.cloud} pinned={pinnedInspect} origin={inspectOrigin.current} peek={{x:peekX,y:peekY}} anchor={anchor} armed={overHook} geek={!!filter.geek} close={closeInspect} pin={()=>{setPinnedInspect(true);haptic('rigid');}}
      video={inspect.kind==='video'&&inspect.id===active?.id?{state:frontVideo,retry:()=>getVideos().retry(inspect),download:()=>getVideos().download(inspect),fullscreen:()=>void play(inspect),openSettings,sound:videoSound,onSound:()=>setVideoSound(v=>!v),freeze:heldVideo.current}:undefined}/></InspectorBoundary>}</AnimatePresence>
    <Sheet open={sheet==='filters'} close={()=>setSheet(null)} title="Filtros y ajustes" description={sheetTab==='filters'?'Elige qué fotos entran en la pila.':sheetTab==='support'?'CocoWash es gratis; aquí decides cómo apoyarla.':'Elige cómo se ven tus recuerdos.'} error={error} returnTo="filter-trigger">
      <div className="sheet-tabs" role="group" aria-label="Sección"><button aria-pressed={sheetTab==='filters'} onClick={()=>{haptic('selection');setSheetTab('filters');}}>Filtros</button><button aria-pressed={sheetTab==='settings'} onClick={()=>{haptic('selection');setSheetTab('settings');}}>Ajustes</button>{money.available&&<button aria-pressed={sheetTab==='support'} onClick={()=>{haptic('selection');setSheetTab('support');}}>Apoyo</button>}</div>
      <div hidden={sheetTab!=='filters'}>
        <Filters filter={filter} assets={assets} state={state} preview={draft=>prewarm(eligible(assets,state,draft,Date.now(),seed.current))} index={{sized:index.sized,total:rawAssets.length,analyzed:index.analyzed,photos:index.photos,measuring:index.measuring,analyzing:index.analyzing}} apply={value=>{resumeContext.current=undefined;setFilter(f=>({...value,geek:f.geek}));setSelected([]);setLock(NO_HAND);setSheet(null);haptic('light');setSpoken('Filtros aplicados');}}/>
        {demo&&<button className="sheet-action secondary" onClick={()=>{setState(initialState());setStats(EMPTY_STATS);setSessionOpen(false);setSession(false);setShowDone(false);setLock(NO_HAND);setFilter(initialFilter);setSelected([]);setSheet(null);setSpoken('Demostración reiniciada');}}>Reiniciar demostración</button>}
      </div>
      <div hidden={sheetTab!=='settings'}><DisplaySettingsPanel display={display} change={setDisplay} geek={!!filter.geek} setGeek={value=>setFilter(f=>({...f,geek:value}))} library={libraryActions} replayIntro={()=>{setSheet(null);setOnboarded(false);haptic('selection');}} testing={isNative?{on:testMode,set:on=>setTestMode(on)}:undefined}/></div>
      {money.available&&<div hidden={sheetTab!=='support'}>{sheet==='filters'&&sheetTab==='support'&&<PurchaseOptions money={money}/>}</div>}
    </Sheet>
    <Sheet open={sheet==='albums'} close={()=>setSheet(null)} title="Guardar en un álbum" description="Se conserva y pasa a la siguiente. También sigue en tu carrete." error={error} returnTo="album-trigger"><p className="sheet-intro"><strong>{targets.length}</strong> seleccionada{targets.length>1?'s':''}</p><button className="album-row album-new" onClick={()=>setCreatingAlbum(v=>!v)} disabled={busy}><span className="row-icon"><PlusIcon size={20} weight="bold"/></span>Crear álbum nuevo</button>{creatingAlbum&&<div className="new-album"><label className="field">Nombre del álbum<AlbumInput value={newAlbum} change={setNewAlbum}/></label><button className="sheet-action" onClick={createAlbum} disabled={busy||!newAlbum.trim()}>Crear y añadir {targets.length} elemento{targets.length===1?'':'s'}</button></div>}{albums.map(a=><button className="album-row" key={a.id} onClick={()=>addAlbum(a)} disabled={busy}><span className="row-icon"><FolderOpenIcon size={20}/></span>{a.title}<CaretRightIcon size={16} weight="bold"/></button>)}</Sheet>
    <Sheet open={sheet==='review'} close={()=>setSheet(null)} title="Una última mirada" description="Recupera lo que quieras conservar antes de eliminar." error={error} returnTo={session?'review-trigger':'filter-trigger'}><p className="sheet-intro">{reviewAssets.length?<><strong>{reviewAssets.length} para eliminar</strong>{freeLabel&&<> · liberarías {reviewBytes.partial?'al menos ':''}<strong>{freeLabel}</strong></>}. Aún no se ha borrado nada.</>:'No hay nada marcado para eliminar.'}</p>
      {reviewAssets.length>0&&<><ReviewGrid assets={reviewAssets} open={sheet==='review'} recover={recoverReview}/>
        <div className="review-primary"><button className="sheet-action secondary recover-all" disabled={busy} onClick={recoverAll}><ArrowCounterClockwiseIcon size={20}/>{reviewAssets.length===1?'Recuperar':`Recuperar todo (${reviewAssets.length})`}</button><button className="sheet-action danger" onClick={commitDelete} disabled={busy} aria-busy={busy}><TrashIcon size={20}/>{busy?'Esperando a Fotos…':`Eliminar ${reviewAssets.length}${freeLabel&&!reviewBytes.partial?` · ${freeLabel}`:''}`}</button><p className="sheet-fine">Fotos te pedirá confirmación; lo eliminado queda 30 días en «Eliminado recientemente», también en iCloud.</p></div></>}
    </Sheet>
  </div>;
}
