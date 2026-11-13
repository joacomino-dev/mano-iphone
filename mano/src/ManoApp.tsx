import { FinishButton } from './FinishButton';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type PointerEvent, type MouseEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useMotionValue, useTransform, animate, type MotionValue } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import { ExportIcon, CaretLeftIcon, FolderOpenIcon, FolderSimplePlusIcon, CaretRightIcon, CaretDownIcon, ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, StackIcon, TrashIcon, CheckIcon, XIcon, PlayIcon, SlidersHorizontalIcon, ArrowClockwiseIcon, ImageBrokenIcon, PlusIcon, PushPinIcon, InfoIcon, CloudIcon, SparkleIcon } from '@phosphor-icons/react';
import { BottomSheet, KeyboardInput, useKeyboard } from './mobile';
import { ReviewGrid } from './ReviewGrid';
import { decide, undo, restore, eligible, eligibleFrom, orderAssets, readState, reconcileLibrary, libraryFingerprint, filterScope, LEVELS, initialFilter, initialState, effectiveFilter, type Action, type Asset, type Decision, type Filter, type RecordState } from './domain';
import { NO_HAND, playable, lockedHand, dealHand, afterDecision, cycleHand, restoreHand, upcomingFrom, type HandLock } from './sequence';
import { Library, isNative, demoAssets, demoRound, thumbnailInfo, inCloudError, type Album, type PhotoPermission } from './library';
import { useLibraryIndex, enrich } from './indexer';
import { SimilarityCoverage, unchangedPhotos } from './similarity-state';
import { AssetPreloader } from './preload';
import { prepareReviewAsset, VideoStore, prewarm, sharpPreview, subscribeSharp, cloudPreviews, resetPreviewPolicy, type PreparedMedia, type VideoState } from './media';
import { CloudBadge, CloudPlaceholder, useCloud } from './Cloud';
import { InlineVideo, type VideoControl } from './InlineVideo';
import { Filters } from './Filters';
import type { InspectOrigin } from './Inspector';
import { DisplaySettingsPanel, Onboarding, Inspector, LibraryGrid, preloadScreensWhenIdle } from './LazyScreens';
import type { CardShot, Hold, ToolSpots } from './LibraryGrid';
import { readSession, SessionWriter, DEMO_SESSION_KEY, LIBRARY_SESSION_KEY, type ActiveSession } from './session';
import { activeJournal, STORAGE_FAILURE, type NativeIntent } from './durableSession';
import { readDisplay, saveDisplay, polaroidCaption, formatBytes, ONBOARDING_KEY, STAMP_WORDS_UNTIL, type DisplaySettings, type PhotoMeta } from './meta';
import { usePlace, prefetchPlaces } from './place';
import { haptic, setHapticsEnabled } from './haptics';
import { AnimatedNumber, CocoLoader, Deferred } from './Loader';
import { Splash } from './Splash';
import { AccessScreen, PreparingScreen, LoadErrorScreen, SessionDone, EMPTY_STATS, readStats, type RoundStats } from './Screens';
import { AdRoom, AdSlot, PurchaseOptions, useMonetization } from './Monetization';
import { readTestMode, setTestMode, readTestRounds, saveTestRounds, readAdsOff, saveAdsOff } from './testMode';
import { useSheetDrag } from './sheetDrag';
import { useAndroidBack } from './androidBack';
import { setFavorite, flushFavorites, withPendingFavorites } from './favoriteQueue';
import { onAndroid } from './locales/android';
import { DEVELOPER } from './channel';
import { formatNumber, locale, parts, t, tn } from './i18n';
/** Photos' own confirmation answered «No permitir» (PhotoLibrary.swift CANCELLED). */
const cancelled=(e:unknown)=>(e as {code?:string})?.code==='CANCELLED';
import { InspectorBoundary } from './Boundary';
import { installErrorReporting } from './diagnostics';
import { Stamp, DecisionStamp, DecisionIcon, withStars, type StampKind } from './Stamp';
import { DecisionBar } from './DecisionBar';
import { Wordmark, PileProgress, FilterSwitch } from './Chrome';
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
  const alt = asset.kind === 'video' ? t('Vista previa de vídeo') : t('Foto del carrete');
  const download = () => { haptic('light'); void cloudPreviews.fetch(asset,'card',true).catch(()=>{}); };
  const retryCloud = () => { haptic('light'); void cloudPreviews.retry(asset).catch(()=>{}); };
  // A cached file may have been pruned natively (preview cache limit): ask once
  // for a fresh one before showing the error.
  if (src&&!error) return <><img onError={()=>retry===0?setRetry(1):setError(true)} src={src} alt={alt} draggable={false}/>
    {!small&&!quiet&&!upgraded&&<CloudBadge state={cloud} lite={!!local?.cloud&&!cloud?.src} onRetry={retryCloud}/>}</>;
  if (local?.missing&&!error) return small ? <div className="photo-loading is-cloud"><CloudIcon size={22}/></div> : <CloudPlaceholder state={cloud} download={download} retry={retryCloud} quiet={quiet}/>;
  return <div className={`photo-loading ${error?'has-error':''}`}>{error ? quiet ? null : <><ImageBrokenIcon size={26}/><span>{t('No se pudo cargar')}</span>{!small&&<button onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setRetry(v=>v+1);}}><ArrowClockwiseIcon size={16} weight="bold"/>{t('Reintentar')}</button>}</> : quiet ? null : <Deferred><CocoLoader size={small?28:40}/></Deferred>}</div>;
}
/** Polaroid margin: two fixed slots, place left and date right. A missing value
 * leaves its slot empty; a place still being resolved reserves its width. */
function PolaroidCaption({ asset, settings, place, pending }: { asset: Asset; settings: PhotoMeta; place?: { locality?: string; country?: string }; pending: boolean }) {
  const caption = polaroidCaption(asset, place, settings, locale);
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
  return <button className="card-share" aria-label={sharing ? t('Preparando archivo para compartir') : t('Compartir')}
    aria-disabled={sharing} onPointerDown={e => e.stopPropagation()} onClick={e => {
      e.stopPropagation();
      if (!sharing) void share(asset);
    }}>{sharing ? <CocoLoader size={20}/> : <ExportIcon size={20} weight="bold"/>}</button>;
}

function Seal({ level, hide }: { level: number; hide: () => void }) {
  return <button className="seal" aria-label={withStars(stars=>t('Conservada, sello {level} de {total}. Ocultar los sellos',{level:stars,total:'★'.repeat(LEVELS.length-1)}),level)} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();hide();}}><Stamp kind="keep" level={level}/></button>;
}
function Sheet({ open, close, title, description, children, error, returnTo, footer }: { open: boolean; close: () => void; title: string; description: string; children: ReactNode; error?: string; returnTo: string; footer?: ReactNode }) {
  const bodyRef=useRef<HTMLDivElement>(null); const previousDialog=useRef<Element|null>(null);
  const [sheetNode,setSheetNode]=useState<HTMLDivElement|null>(null); useSheetDrag(sheetNode,open&&isNative,close); useAndroidBack(open,close);
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
  const content=<div className="mano-sheet-body" ref={bodyRef}>{error&&<p className="sheet-error" role="alert">{error}</p>}{children}{!isNative&&footer}</div>;
  if (!isNative) return <BottomSheet open={open} onOpenChange={v=>!v&&close()} title={title} description={description} snap={.85}>{content}</BottomSheet>;
  return <Dialog.Root open={open} onOpenChange={v=>!v&&close()}><Dialog.Portal><Dialog.Overlay className="native-shade"/><Dialog.Content ref={setSheetNode} className="native-sheet" aria-describedby={undefined} onCloseAutoFocus={e=>{e.preventDefault();restoreFocus();}}><span className="sheet-grabber" aria-hidden="true"/><header><div><Dialog.Title asChild><h2>{title}</h2></Dialog.Title><p>{description}</p></div><Dialog.Close asChild><button aria-label={t('Cerrar')}><XIcon size={22}/></button></Dialog.Close></header>{content}{footer&&<div className="sheet-footer">{footer}</div>}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
function AlbumInput({value,change}:{value:string;change:(value:string)=>void}) {
  return isNative?<input value={value} onInput={e=>change(e.currentTarget.value)} onChange={e=>change(e.target.value)} maxLength={100} placeholder={t('Por ejemplo, Verano')}/>:<PreviewAlbumInput value={value} change={change}/>;
}
function PreviewAlbumInput({value,change}:{value:string;change:(value:string)=>void}) {
  const keyboard=useKeyboard();return <KeyboardInput value={value} onChange={e=>change(e.target.value)} onBlur={()=>keyboard.hide()} maxLength={100} placeholder={t('Por ejemplo, Verano')}/>;
}
/** The name in the header never changes (user, 2026-11-13: notices are forbidden
 * there). Notices appear in one place and one style for every screen: CenterNotice. */
type Notice={id:number;text:string};
function BrandStatus(_:{notice:Notice|null}) {
 return <div className="brand-status"><span className="brand-wordmark" aria-hidden="true"><Wordmark/></span><span className="sr-only">CocoWash</span></div>;
}
/** One notice style, centred on the screen above the pile, the Fototeca and the
 * anchored view; it leaves on its own. VoiceOver hears it through the status region.
 * Errors never use it (ErrorAlert). Reduce Motion: a plain fade. */
function CenterNotice({notice}:{notice:Notice|null}) {
 const reduced=useReducedMotion();
 return <div className="center-notice-layer" aria-hidden="true"><AnimatePresence initial={false}>{notice&&<motion.div key={notice.id} className="center-notice"
  initial={{opacity:0,scale:reduced?1:.94,y:reduced?0:6}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:reduced?1:.97}}
  transition={reduced?{duration:.12}:{type:'spring',stiffness:520,damping:34}}><span>{notice.text}</span></motion.div>}</AnimatePresence></div>;
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
/** «Una última mirada»: a quiet cue at the bottom of the sheet until the
 * actions at the end of the list come into view. */
function ScrollCue({ until }: { until: { current: HTMLElement | null } }) {
  const [reached, setReached] = useState(false);
  useEffect(() => { const element = until.current; if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setReached(entry.isIntersecting), { threshold: .15 });
    observer.observe(element); return () => observer.disconnect(); }, [until]);
  return <div className={`scroll-cue ${reached ? 'is-done' : ''}`} aria-hidden="true"><CaretDownIcon size={16} weight="bold"/>{t('Desliza para ver todo lo que vas a eliminar')}</div>;
}
/** Errors and refusals that need the person: full text, persistent until
 * closed, never squeezed into the name's slot. */
function ErrorAlert({message,clear}:{message:string;clear:()=>void}) {
  return <div className="session-alert" role="alert"><span className="notice-dot" aria-hidden="true"/><span>{message}</span><button onClick={clear} aria-label={t('Cerrar aviso')}><XIcon size={16} weight="bold"/></button></div>;
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
    if (!asset || (asset.kind !== 'video'&&(asset.kind!=='live'||onAndroid()))) { setState({ status: 'idle', progress: 0 }); return; }
    const store = get(); const unsubscribe = store.subscribe(asset, setState); if(asset.kind==='video')store.ensure(asset);
    return unsubscribe;
  }, [asset?.id, asset?.modified, asset?.kind]);
  return state;
}
export function ManoApp() {
  // «Modo de prueba» runs the phone demo on the iPhone, ads included (testMode.ts).
  const [testMode]=useState(()=>isNative&&DEVELOPER&&readTestMode());
  // «Modo developer › Anuncios»: off previews the app without ads (testMode.ts).
  const [adsOff,setAdsOff]=useState(()=>isNative&&readAdsOff());
  const demo = !isNative||testMode; const key = demo ? 'mano-demo-v1' : 'mano-library-v1';
  const sessionKey=demo?DEMO_SESSION_KEY:LIBRARY_SESSION_KEY;
  const journal=activeJournal(sessionKey);
  const [saved]=useState(()=>journal?.session??readSession(sessionKey));const resumeContext=useRef(saved?.active?saved.context:undefined);
  const [state,applyState] = useState<RecordState>(()=>saved?.record??readState(key));
  const recordNow=useRef(state);
  const setState=useCallback((value:RecordState|((s:RecordState)=>RecordState))=>{recordNow.current=typeof value==='function'?value(recordNow.current):value;applyState(recordNow.current);},[]);
  const operationBusy=useRef(false);const loadedVersion=useRef<number|undefined>(undefined);const deferredLibrary=useRef<Asset[]|null>(null);
  const reconcileFresh=useCallback((fresh:Asset[])=>{if(operationBusy.current)deferredLibrary.current=fresh;else setState(s=>reconcileLibrary(s,withPendingFavorites(fresh)));
    // An intent left by an earlier run (closed during a Photos operation) is settled
    // by this fresh enumeration, which is what Photos holds now. Silent; the
    // interrupted operation is never repeated automatically.
    if(!operationBusy.current&&journal?.snapshot.intent)void journal.intent().catch(()=>{});},[journal]);
  const [sessionOpen,setSessionOpen]=useState(saved?.active??false);
  // The hand on the table, locked until the person acts on it (sequence.ts).
  const [lock,setLock]=useState<HandLock>(()=>saved?.active?restoreHand(saved.context,[]):NO_HAND);
  const [newAlbum,setNewAlbum]=useState('');const [creatingAlbum,setCreatingAlbum]=useState(false);
  const [pinnedInspect,setPinnedInspect]=useState(false);const [overHook,setOverHook]=useState(false);const hookHover=useRef(false);const inspectOrigin=useRef<InspectOrigin|undefined>(undefined);
  // Holding a card: where the finger is (peek) and how close it is to the dock (0–1). Motion values: no re-render per move.
  const peekX=useMotionValue(0),peekY=useMotionValue(0),anchor=useMotionValue(0);
  const [display,setDisplay]=useState<DisplaySettings>(()=>readDisplay());
  useEffect(preloadScreensWhenIdle, []);
  // Launch mark (Splash.tsx): shown once per launch while the app loads underneath.
  const [splash,setSplash]=useState(true);
  const [onboarded,setOnboarded]=useState(()=>{try{return localStorage.getItem(ONBOARDING_KEY)==='done';}catch{return false;}});
  const [permission,setPermission]=useState<PhotoPermission|'unknown'>(demo?'authorized':'unknown');
  const [loadError,setLoadError]=useState('');const [showDone,setShowDone]=useState(false);const [sheetTab,setSheetTab]=useState<'filters'|'settings'|'support'>('filters');
  const [stats,setStats]=useState<RoundStats>(readStats);const [decidedHere,setDecidedHere]=useState<Set<string>>(()=>new Set());
  const videos=useRef<VideoStore|null>(null);const getVideos=()=>videos.current??(videos.current=new VideoStore());
  const [liveRequested,setLiveRequested]=useState<string|null>(null);
  const motionAsset=(asset:Asset):Asset=>asset.kind==='live'?{...asset,kind:'video'}:asset;
  const [stageSize,setStageSize]=useState({width:340,height:440});const stageObserver=useRef<ResizeObserver|null>(null);
  // Callback ref: the stage remounts whenever another screen (onboarding, access,
  // end of round) replaced it, and must be measured again each time it returns.
  const stage=useCallback((element:HTMLElement|null)=>{stageObserver.current?.disconnect();stageObserver.current=null;if(!element)return;const observer=new ResizeObserver(([entry])=>{const size={width:entry.contentRect.width,height:entry.contentRect.height};stageMeasured.current=true;rootObserver.current?.disconnect();setPreviewSizing({stage:size});setStageSize(size);});observer.observe(element);stageObserver.current=observer;},[]);
  // Until the stack is on screen (onboarding, preparing), estimate its size from
  // the app frame so the first previews are requested at the right sharpness.
  const stageMeasured=useRef(false);const rootObserver=useRef<ResizeObserver|null>(null);
  const root=useCallback((element:HTMLElement|null)=>{rootObserver.current?.disconnect();rootObserver.current=null;if(!element||stageMeasured.current)return;const estimate=()=>setPreviewSizing({stage:{width:Math.max(200,element.clientWidth-32),height:Math.max(240,element.clientHeight-330)}});estimate();rootObserver.current=new ResizeObserver(estimate);rootObserver.current.observe(element);},[]);
  // «Modo de prueba» reloads every round already dealt (testMode.ts), then keeps adding rounds.
  const demoRounds=useRef(testMode?readTestRounds():0);
  const [rawAssets,setAssets] = useState<Asset[]>(()=>demo?Array.from({length:demoRounds.current+1},(_,round)=>demoRound(round)).flat():[]);
  // `filterSetting`: what the person chose (kept, persisted); `filter`: what the pile uses —
  // the same, or with the Filtros switch off the whole library in time order (domain.effectiveFilter).
  const [filterSetting,setFilter] = useState<Filter>(saved?.filter??initialFilter);
  const filter=useMemo(()=>effectiveFilter(filterSetting),[filterSetting]);

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
  const gesture = useRef<{x:number;y:number;t0:number;held:boolean;timer:ReturnType<typeof setTimeout>|null;id:string;review:boolean;element?:Element;asset?:Asset;pinch?:number;grid?:boolean;zone?:StampKind|'';followers:string[]}|null>(null);
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
  const [analysisCoverage]=useState(()=>new SimilarityCoverage());
  const analysisMarkerRead=useRef(false);
  const analysisRunning=useRef(false);const analysisEpoch=useRef(0);
  const latestLibrary=useRef(rawAssets);latestLibrary.current=rawAssets;
  const latestConnected=useRef(connected);latestConnected.current=connected;
  const [warming,setWarming]=useState(false);
  const warmingNow=useRef(false);
  const deferredGroups=useRef<Map<string,string>|null>(null);
  const preloader=useRef<AssetPreloader<PreparedMedia>|null>(null);
  const preloadWindow=useRef<Asset[]>([]);
  const sessionNumber=useRef(0);
  const warmWait=useRef<(()=>void)|null>(null);
  const getPreloader=()=>preloader.current??(preloader.current=new AssetPreloader(prepareReviewAsset));
  const prepareWindow=(items:Asset[],sessionKey:string,videoItems?:Asset[])=>{
    getPreloader().update(items,sessionKey);getVideos().want(videoItems??items,items[0]?.id===liveRequested?motionAsset(items[0]):items[0]);
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
  const cancelWarmup=()=>{setLiveRequested(null);sessionNumber.current++;warmingNow.current=false;prepareWindow([],String(sessionNumber.current));warmWait.current?.();setWarming(false);setLoading(false);const groups=deferredGroups.current;if(groups){deferredGroups.current=null;setAssets(prev=>prev.map(a=>({...a,group:groups.get(a.id)})));}};
  useEffect(()=>{document.title=`CocoWash: ${t('Lo que importa, se queda')}`;installErrorReporting();},[]);
  const appliedPolicy=useRef('');
  useEffect(()=>{saveDisplay(display);setHapticsEnabled(display.haptics);setPreviewSizing({plain:!display.photo.polaroid,quality:display.quality,cloud:display.cloud,scale:typeof window!=='undefined'?window.devicePixelRatio||2:2});
    const key=previewPolicyKey();if(appliedPolicy.current&&appliedPolicy.current!==key){resetPreviewPolicy();preloader.current?.invalidate();videos.current?.reconcilePolicy();}appliedPolicy.current=key;},[display]);
  useEffect(()=>{try{localStorage.setItem('cocowash-round-v1',JSON.stringify(stats));}catch{/* summary is optional */}},[stats]);
  // Long enough to read once, never lingering: 2.5–4.5 s by length.
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNoticeState(null),Math.min(4500,Math.max(2500,1600+notice.text.length*45)));return()=>clearTimeout(t);},[notice]);
  useEffect(()=>()=>{if(gesture.current?.timer)clearTimeout(gesture.current.timer);},[]);
  const initialLibrary=useRef<ReturnType<typeof Library.assets>|null>(null);
  const libraryRevision=useRef(0);
  // A mutation invalidates asset snapshots, never the latest permission answer.
  const permissionRevision=useRef(0);
  const invalidateLibrary=useCallback(()=>{initialLibrary.current=null;deferredLibrary.current=null;setLoading(false);return ++libraryRevision.current;},[]);
  const clearLibraryAccess=useCallback(()=>{analysisEpoch.current++;analysisCoverage.clear();if(analysisRunning.current)void Library.cancelAnalysis().catch(()=>{});cancelWarmup();setConnected(false);setAssets([]);setInspect(null);setPinnedInspect(false);setSelected([]);setSheet(null);},[]);
  const loadLibrary=useCallback(()=>{if(demo)return;let alive=true;const revision=libraryRevision.current;setLoadError('');const request=initialLibrary.current??(initialLibrary.current=Library.permissionStatus().then(({status})=>{if(revision!==libraryRevision.current)return {assets:[] as Asset[],status};setPermission(status as PhotoPermission);return ['authorized','limited'].includes(status)?Library.assets():{assets:[] as Asset[],status};}));
    request.then(result=>{if(!alive||revision!==libraryRevision.current)return;setPermission(result.status as PhotoPermission);setLimited(result.status==='limited');if(['authorized','limited'].includes(result.status)){loadedVersion.current=typeof (result as {version?:number}).version==='number'?(result as {version?:number}).version:undefined;setAssets(savedGroups(result.assets));setConnected(true);reconcileFresh(result.assets);setInspect(a=>a&&result.assets.some(fresh=>fresh.id===a.id)?a:null);}else clearLibraryAccess();}).catch(e=>{if(revision!==libraryRevision.current)return;initialLibrary.current=null;if(alive)setLoadError(e instanceof Error?t(e.message):t('Inténtalo de nuevo en un momento.'));});return()=>{alive=false;};},[clearLibraryAccess]);
  useEffect(()=>loadLibrary(),[]);
  // Returning to the app only asks for the permission and Photos' change counter
  // (both cheap). The whole library is enumerated again only when the permission
  // changed, Photos reported a change since the last enumeration (or cannot say,
  // e.g. Android), access is limited (a small set) or nothing is loaded yet. Re-reading every photo on every return (since the RC) made each
  // resume do full-library work and the phone slower each time (user, 2026-11-08);
  // build 43 did not. Decisions, the locked hand and the older-request guard stay.
  const resumeStatus=useRef('');useEffect(()=>{resumeStatus.current=permission;},[permission]);
  const connectedNow=useRef(false);connectedNow.current=connected;
  useEffect(()=>{if(demo)return;const recheck=()=>{if(document.visibilityState!=='visible')return;const permission=++permissionRevision.current;void Library.permissionStatus().then(({status})=>{if(permission!==permissionRevision.current)return;const changed=status!==resumeStatus.current;setPermission(status as PhotoPermission);setLimited(status==='limited');if(['authorized','limited'].includes(status)){const reload=()=>{invalidateLibrary();loadLibrary();};if(changed||status==='limited'||!connectedNow.current)reload();else void Library.libraryVersion().then(({version})=>{if(permission===permissionRevision.current&&(typeof version!=='number'||version!==loadedVersion.current))reload();}).catch(()=>{if(permission===permissionRevision.current)reload();});}else clearLibraryAccess();}).catch(e=>{if(permission!==permissionRevision.current)return;setInspect(null);setSheet(null);setLoadError(e instanceof Error?t(e.message):t('Inténtalo de nuevo en un momento.'));});};document.addEventListener('visibilitychange',recheck);return()=>document.removeEventListener('visibilitychange',recheck);},[loadLibrary,clearLibraryAccess,invalidateLibrary]);
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
  const [gridOpen,setGridOpen]=useState(false);const [gridAds,setGridAds]=useState(false);
  // The grid is a mode below the header and progress row (user, 2026-11-13): those never move.
  const [gridTop,setGridTop]=useState(0);
  // Card ↔ grid follows the fingers (user, 2026-11-13): 0 is the card, 1 the grid. A pinch
  // scrubs it both ways without lifting; letting go springs to the nearer end, carried by
  // the fingers' speed. One spring for every way in and out.
  const gridProgress=useMotionValue(0),gridDetent=useRef(false),gridCard=useRef<CardShot|undefined>(undefined);
  const gridFingers=useMotionValue<Hold|null>(null),gridTools=useRef<ToolSpots>({});
  // «Más tarde» (and the hand's group controls) fade early: they have no place in the grid.
  const laterFade=useTransform(gridProgress,[0,.3],[1,0]);
  // Fully in: the pile underneath leaves the accessibility tree and the tab order.
  const [gridIn,setGridIn]=useState(false);
  // The tile's thumbnail for a photo opened from the grid: its image from the first frame.
  const gridPoster=useRef<{id?:string;src:string}|null>(null);
  const handFade=useTransform(gridProgress,[0,.5],[1,0]),exitRoom=useTransform(gridProgress,[0,1],[0,44]),exitShow=useTransform(gridProgress,[.2,.75],[0,1]),exitScale=useTransform(gridProgress,[.2,.75],[.5,1]);
  // Selected in the grid, kept while moving between modes; a decision on the cards ends it.
  const [gridSelection,setGridSelection]=useState<ReadonlySet<string>>(new Set());const gridOpenNow=useRef(false);gridOpenNow.current=gridOpen;
  const reducedMotionNow=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cardTarget=():CardShot|undefined=>{const w=document.querySelector('.photo-card.front .photo-window');if(!w)return undefined;const img=w.querySelector('img'),video=w.querySelector('video');return {rect:w.getBoundingClientRect(),src:img?.currentSrc||img?.src||video?.poster||''};};
  const gridUnmount=()=>{gridProgress.stop();gridProgress.set(0);gridFingers.set(null);gridDetent.current=false;setGridIn(false);setGridOpen(false);setGridAds(false);money.release('grid');};
  const gridScrub=(value:number)=>{gridProgress.stop();gridProgress.set(value);if(value<1)setGridIn(false);const over=value>.5;if(over!==gridDetent.current){gridDetent.current=over;haptic('selection');}};
  const gridSettle=(to:0|1,velocity=0)=>{gridDetent.current=to===1;if(!to)setGridIn(false);
    if(reducedMotionNow()){gridProgress.set(to);if(to)setGridIn(true);else gridUnmount();return;}
    void animate(gridProgress,to,{type:'spring',stiffness:260,damping:30,mass:1,velocity,restDelta:.001,restSpeed:.01}).then(()=>{if(!to&&gridOpenNow.current&&gridProgress.get()<.001)gridUnmount();if(to&&gridProgress.get()>.999)setGridIn(true);});};
  // Let go: the nearer end, unless the fingers were clearly moving one way.
  const gridRelease=()=>{const value=gridProgress.get(),speed=gridProgress.getVelocity();gridSettle(speed>.8?1:speed<-.8?0:value>.5?1:0,speed);};
  const gridExit=()=>{haptic('light');gridSettle(0);};
  // The grid's selection can go to an album through the same sheet as the card in hand.
  const [albumIds,setAlbumIds]=useState<string[]|null>(null);const [gridAlbumDone,setGridAlbumDone]=useState(0);
  // Photos anchored together from the grid: shown large one at a time, rotated with ‹ › (user, 2026-11-12).
  const [inspectSet,setInspectSet]=useState<Asset[]|null>(null);const gridEnter=useRef<DOMRect|undefined>(undefined);
  // Opened from the Fototeca: swiping the anchored photo decides it; a tap rotates the set.
  const [inspectFromGrid,setInspectFromGrid]=useState(false);
  // Stamp words help while the four gestures are new; then the stamp says it alone.
  const decidedCount=Object.keys(state.marks).length+state.pending.length+state.favorites.length+state.later.length+state.removed.length;
  const stampWordsAuto=decidedCount<STAMP_WORDS_UNTIL,stampWords=display.stampWords??stampWordsAuto;
  // Any filter that narrows the pile (order only sorts it; geek is a dev tool).
  const narrowed=filter.seal!=='all'||filter.media!=='all'||filter.includeWaiting||(filter.dateRange??'all')!=='all'||(filter.smart??'all')!=='all';
  // The empty pile's way out: same path as «Aplicar filtros», back to the defaults,
  // so a fresh hand is dealt at once.
  const resetFilters=()=>{resumeContext.current=undefined;setFilter(f=>({...initialFilter,geek:f.geek}));setSelected([]);setLock(NO_HAND);haptic('light');setSpoken(t('Filtros restablecidos'));};
  // One canonical sequence: sorted once per library/order/seed; each decision
  // only re-filters it (linear), so the pile never re-sorts per swipe.
  const ordered=useMemo(()=>orderAssets(assets,filter.order,seed.current,filter.startAt),[assets,filter.order,filter.startAt,seedVersion]);
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
  const videoAhead=useMemo(()=>upcomingFrom(queue,hand,state.later,Math.max(VIDEO_AHEAD,hand.length+2)).filter(a=>a.kind==='video'||(a.kind==='live'&&!onAndroid()&&a.id===liveRequested)).map(motionAsset),[queue,windowHandKey,state.later,liveRequested]);
  const videoKey=videoAhead.map(a=>`${a.id}:${a.modified??0}`).join('|');
  useEffect(()=>{if(session&&!warming)prepareWindow(upcoming,String(sessionNumber.current),videoAhead);},[session,warming,upcomingKey,videoKey]);
  useEffect(()=>{inspected.current=inspect;cloudPreviews.retain(inspect?[...preloadWindow.current,inspect]:preloadWindow.current);},[inspect?.id]);
  // What a decision records to be undone exactly: the hand as shown, front first.
  const context={handIds:hand.map(a=>a.id),rotated:[] as string[],selected:[...selected],group:bundleKey??undefined,filter,...(best?{best}:{})};
  const envelope:ActiveSession={version:1,active:sessionOpen,seed:seed.current,filter:filterSetting,context:session?context:resumeContext.current??context,updatedAt:Date.now(),record:state};
  const latest=useRef(envelope);latest.current=envelope;
  const [writer]=useState(()=>new SessionWriter());
  // Only presentation context is batched. A decision is committed before its UI acknowledgement.
  const dirty=useRef(false);const flushTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const flush=useCallback(async(checkpoint=false)=>{
    if(flushTimer.current){clearTimeout(flushTimer.current);flushTimer.current=null;}
    if(!dirty.current||operationBusy.current)return;
    const snapshot=latest.current;dirty.current=false;
    try { if(journal)await journal.save(snapshot);else if(!writer.save(sessionKey,snapshot,undefined,checkpoint?key:undefined))throw new Error(STORAGE_FAILURE); }
    // Silent: the journal already retries; a failed legacy write is retried on the next change.
    catch {dirty.current=true;}
  },[key,sessionKey,writer,journal]);
  useEffect(()=>{dirty.current=true;if(!flushTimer.current)flushTimer.current=setTimeout(()=>void flush(),350);},[state,sessionOpen,filterSetting,windowHandKey,selected,session]);
  useEffect(()=>{const persist=()=>{dirty.current=true;void flush(true);};document.addEventListener('visibilitychange',persist);window.addEventListener('pagehide',persist);return()=>{persist();document.removeEventListener('visibilitychange',persist);window.removeEventListener('pagehide',persist);};},[flush]);
  const startOperation=()=>{if(operationBusy.current)return false;operationBusy.current=true;setBusy(true);setError('');return true;};
  const endOperation=()=>{operationBusy.current=false;setBusy(false);const fresh=deferredLibrary.current;deferredLibrary.current=null;if(fresh)reconcileFresh(fresh);};
  const persistRecord=async(next:RecordState,patch:Partial<ActiveSession>={},favorite?:{ids:string[];value:boolean},clearIntent=false)=>{
    const nextEnvelope={...latest.current,...patch,record:next,updatedAt:Date.now()};
    if(journal)await journal.save(nextEnvelope,{favorite,clearIntent});
    else if(!writer.save(sessionKey,nextEnvelope,undefined,key))dirty.current=true; // kept in memory; retried silently
    latest.current=nextEnvelope;dirty.current=false;setState(next);
  };
  const beforeNative=async(kind:NativeIntent['kind'],ids:string[])=>{await journal?.intent({kind,ids:[...ids],started:Date.now()});};
  const nativeFailed=async(e:unknown)=>{if(e instanceof Error&&e.message===STORAGE_FAILURE)return;try{await journal?.intent();}catch{/* journal retries silently */}messageError(e);};
  const openFilters=()=>{money.clear();setError('');setSheet('filters');};
  const active=hand[0]; const targetIds=selected.filter(id=>hand.some(a=>a.id===id)); const targets=targetIds.length?targetIds:active?[active.id]:[];const albumTargets=albumIds??targets;
  // Ads (Monetization.tsx): only while cleaning, never over a sheet, the inspector or the splash.
  const money=useMonetization(isNative,session&&!!active&&!sheet&&!inspect&&!splash,testMode,showDone||sheet==='review',DEVELOPER&&adsOff);
  const deckAd=money.placement==='deck'&&!sheet&&!inspect&&!splash;
  // «Elegir las demás»: everything but the best shot, ready for «Eliminar».
  const others=(best?hand.filter(a=>a.id!==best):hand).map(a=>a.id);const allPicked=others.length>0&&targetIds.length===others.length&&others.every(id=>targetIds.includes(id));
  const reviewAssets=useMemo(()=>{const pending=new Set(state.pending);return assets.filter(a=>pending.has(a.id));},[assets,state.pending]);
  // What «Eliminar N» would free; partial while weights are still being measured.
  const reviewBytes=useMemo(()=>({bytes:reviewAssets.reduce((n,a)=>n+(a.bytes??0),0),partial:reviewAssets.some(a=>!a.bytes)}),[reviewAssets]);
  // Weights exist only for originals on this iPhone: with any unknown, the figure
  // is a lower bound («al menos») and the button does not state it.
  const freeLabel=formatBytes(reviewBytes.bytes,locale)??'';
  // Native refusals arrive in Spanish (PhotoLibrary.swift): they are keys too (nativeMessages.ts).
  const messageError=(e:unknown)=>cancelled(e)?undefined:setError(e instanceof Error?t(e.message):t('No se pudo completar la acción. Inténtalo de nuevo.'));
  const connect=useCallback(async()=>{const permission=++permissionRevision.current;const revision=invalidateLibrary();setLoading(true);setError('');try{
    const access=await Library.authorize();if(permission!==permissionRevision.current)return false;setPermission(access.status as PhotoPermission);if(!['authorized','limited'].includes(access.status)){clearLibraryAccess();return false;}if(revision!==libraryRevision.current)return false;
    const result=await Library.assets();if(revision!==libraryRevision.current)return false;setPermission(result.status as PhotoPermission);if(!['authorized','limited'].includes(result.status)){clearLibraryAccess();return false;}setAssets(savedGroups(result.assets));reconcileFresh(result.assets);setLimited(result.status==='limited');setConnected(true);analysisCoverage.retry();return savedGroups(result.assets);
  }catch(e){if(revision===libraryRevision.current)messageError(e);return false;}finally{if(revision===libraryRevision.current)setLoading(false);}},[invalidateLibrary,clearLibraryAccess]);
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
  /** The decision itself (shared by swipes, buttons and album saves): one
   * undoable history entry, stats, and the move to the next card. */
  const SPOKEN={keep:()=>t('Conservada'),discard:()=>t('Para eliminar; se borra solo al confirmar'),favorite:()=>t('Favorita'),later:()=>t('Para más tarde: vuelve al final'),unfavorite:()=>t('Quitada de Favoritas: vuelve a la pila')} as const;
  const [videoSound,setVideoSound]=useState(false);
  const shareBusy=useRef(false);
  const [sharing,setSharing]=useState(false);
  const shareActive=async (asset:Asset)=>{
    if(shareBusy.current)return;
    shareBusy.current=true;setSharing(true);setSpoken(t('Preparando archivo para compartir'));
    try {
      await Library.share({id:asset.id});
    } catch {
      setNotice(t('No se pudo compartir el archivo. Comprueba la conexión e inténtalo de nuevo.'));
    } finally { shareBusy.current=false;setSharing(false); }
  };
  const shareMany=async(ids:string[])=>{
    if(shareBusy.current)return;if(ids.length===1){const one=byId.get(ids[0]);if(one)await shareActive(one);return;}
    shareBusy.current=true;setSharing(true);setSpoken(t('Preparando archivo para compartir'));
    try{await Library.shareMany({ids});}catch{setNotice(t('No se pudo compartir el archivo. Comprueba la conexión e inténtalo de nuevo.'));}finally{shareBusy.current=false;setSharing(false);}
  };
  // The front video card: a quick tap pauses/plays it; holding it hands its frame to the held view.
  const videoControl=useRef<VideoControl|null>(null);const heldVideo=useRef<HTMLVideoElement|null>(null);
  const hideSeals=()=>{setDisplay(d=>({...d,photo:{...d.photo,seal:false}}));haptic('selection');setNotice(t('Sellos ocultos\nVuelven en Ajustes'));};
  const record=async(action:Action,ids:string[],apply=(s:RecordState)=>decide(s,ids,action,Date.now(),context),favorite?:{ids:string[];value:boolean},clearIntent=false)=>{
    const nextLock=afterDecision(hand,ids,best);
    await persistRecord(apply(recordNow.current),{context:{...context,handIds:nextLock.ids,selected:[],best:nextLock.best}},favorite,clearIntent);
    setLock(nextLock);setPinnedInspect(false);setInspect(null);setSelected([]);
    if(!gridOpenNow.current)setGridSelection(previous=>previous.size?new Set():previous);
    if(action!=='unfavorite'){setStats(previous=>({...previous,[action]:previous[action]+ids.length}));setFlash({kind:action,key:Date.now()});}setDecidedHere(previous=>new Set([...previous,...ids]));money.review(ids);
    setSpoken(`${SPOKEN[action]()}${ids.length>1?`: ${formatNumber(ids.length)}`:''}`);
  };
  /** Resolves true only after the decision and any Android queue are committed. */
  const act=async(requested:Action,ids=targets):Promise<boolean>=>{
    if(!ids.length||operationBusy.current)return false;
    const action:Action=favView&&requested==='favorite'?'unfavorite':requested;
    if(favView&&action==='discard'){haptic('warning');setNotice(t('Las favoritas\nno se eliminan'));return false;}
    if(!startOperation())return false;
    const favorite=(action==='favorite'||action==='unfavorite')&&!demo?{ids,value:action==='favorite'}:undefined;
    const nativeFavorite=!!favorite&&!onAndroid();
    try {
      if(nativeFavorite){await beforeNative('favorite',ids);invalidateLibrary();await setFavorite(ids,favorite!.value);invalidateLibrary();}
      // The legacy preview path keeps its existing queue; native journals commit both atomically.
      if(favorite&&onAndroid()&&!journal)await setFavorite(ids,favorite.value);
      await record(action,ids,undefined,favorite&&onAndroid()?favorite:undefined,nativeFavorite);
      haptic(action==='favorite'||action==='unfavorite'?'medium':action==='later'?'soft':'light');return true;
    }catch(e){haptic('error');await nativeFailed(e);return false;}finally{endOperation();}
  };
  const undoLast=async()=>{
    const last=recordNow.current.history.at(-1);if(!last||!startOperation())return;
    let missingIds:string[]=[];
    const favorite=(last.action==='favorite'||last.action==='unfavorite')&&!demo?{ids:last.ids,value:last.action==='unfavorite'}:undefined;
    const nativeFavorite=!!favorite&&!onAndroid();
    try {
      if(nativeFavorite){await beforeNative('favorite',last.ids);invalidateLibrary();const result=await setFavorite(last.ids,favorite!.value,true);missingIds=result.missing;invalidateLibrary();}
      if(favorite&&onAndroid()&&!journal)await setFavorite(last.ids,favorite.value,true);
      const previous=last.context;
      await persistRecord(undo(recordNow.current),{context:previous??context,filter:previous?.filter??filterSetting},favorite&&onAndroid()?favorite:undefined,nativeFavorite);
      const undone=last.action;haptic('soft');if(undone!=='unfavorite')setStats(p=>({...p,[undone]:Math.max(0,p[undone]-last.ids.length)}));
      setLock(restoreHand(previous,last.ids));setSelected(previous?.selected??[]);if(previous?.filter)setFilter(previous.filter);
      if(missingIds.length){setNotice(missingIds.length===last.ids.length?t('Ya no está\nen Fotos'):t('Algunas ya no\nestán en Fotos'));const gone=new Set(missingIds);setAssets(prev=>prev.filter(a=>!gone.has(a.id)));}
      setSpoken(t('Última decisión deshecha'));
    }catch(e){await nativeFailed(e);}finally{endOperation();}
  };
  const cycle=()=>{if(active&&hand.length>1){const refocus=document.activeElement?.classList.contains('photo-card');setLock(cycleHand(hand,best));if(refocus)requestAnimationFrame(()=>document.querySelector<HTMLElement>('.photo-card.front')?.focus({preventScroll:true}));}};
  const select=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const windowOf=(element:Element)=>(element.querySelector('.photo-window')??element).getBoundingClientRect();
  const openPinned=(asset:Asset,element:Element)=>{rotating.current=false;heldVideo.current=element.querySelector('video');inspectOrigin.current=windowOf(element);resetPeek();setPinnedInspect(true);setInspect(asset);haptic('rigid');};
  const closeInspect=()=>{rotating.current=false;setPinnedInspect(false);setInspect(null);setInspectSet(null);setInspectFromGrid(false);haptic('soft');};
  const decideAnchored=async(kind:Action):Promise<boolean>=>{
    const shown=inspect;if(!shown)return false;
    if(kind==='discard'&&state.favorites.includes(shown.id)){haptic('warning');setNotice(t('Las favoritas\nno se eliminan'));return false;}
    const list=inspectSet;if(!await act(kind,[shown.id]))return false;
    const rest=(list??[]).filter(a=>a.id!==shown.id);
    if(rest.length){rotating.current=true;const i=Math.max(0,(list??[]).findIndex(a=>a.id===shown.id));inspectOrigin.current=undefined;resetPeek();setInspectSet(rest.length>1?rest:null);setInspectFromGrid(true);setPinnedInspect(true);rememberStack(rest[Math.min(i,rest.length-1)].id);setInspect(rest[Math.min(i,rest.length-1)]);}
    else{setInspectSet(null);setInspectFromGrid(false);setPinnedInspect(false);setInspect(null);}
    return true;
  };
  const rotateSet=(step:number)=>{if(!inspectSet||!inspect)return;rotating.current=true;const i=inspectSet.findIndex(a=>a.id===inspect.id);const next=inspectSet[(i+step+inspectSet.length)%inspectSet.length];rememberStack(next.id);inspectOrigin.current=undefined;resetPeek();setInspect(next);haptic('selection');};
  useAndroidBack(!!inspect,closeInspect);
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
  // iOS retargets a tap that lands just outside a small button (mute, VHS letters) to that
  // button's click, while pointerdown still reaches the card: muting also toggled play
  // (user, 2026-11-09). A touch starting within 14 px of a card control is the control's.
  const nearControl=(e:PointerEvent)=>[...(e.currentTarget as HTMLElement).querySelectorAll('button')].some(b=>{const r=b.getBoundingClientRect();return r.width>0&&e.clientX>=r.left-14&&e.clientX<=r.right+14&&e.clientY>=r.top-14&&e.clientY<=r.bottom+14;});
  const start=(e:PointerEvent,asset:Asset,review=false)=>{if(busy||(e.target as HTMLElement).closest('button')||nearControl(e))return;
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
    // Pinch out: the anchored view. Pinch in — zooming out, as in Photos — opens the Fototeca (user, 2026-11-13).
    if(g.pinch){const [a,b]=[...pointers.current.values()];const ratio=a&&b?Math.hypot(b.x-a.x,b.y-a.y)/g.pinch:1;
      if(!g.grid&&ratio>1.25){const asset=hand.find(h=>h.id===g.id);gesture.current=null;if(asset)openPinned(asset,e.currentTarget);return;}
      // Fingers together: the grid comes in under them, step by step; apart again, the card returns.
      if(!g.grid&&ratio<.97&&!gridOpenNow.current&&!deckAd&&assets.length){g.grid=true;void LibraryGrid.preload();setGridTop((document.querySelector('.archive-progress')?.getBoundingClientRect().bottom??0)+4);gridEnter.current=document.querySelector('.decision-bar')?.getBoundingClientRect();gridCard.current=cardTarget();gridTools.current={undo:document.querySelector('.archive-tools>button:first-child .tool-icon')?.getBoundingClientRect(),album:document.querySelector('#album-trigger .tool-icon')?.getBoundingClientRect()};gridProgress.set(0);setGridAds(money.grid());setGridOpen(true);}
      if(g.grid){const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},held=gridFingers.get();gridFingers.set(held?{...held,x:mid.x,y:mid.y,ratio}:{x0:mid.x,y0:mid.y,x:mid.x,y:mid.y,ratio});gridScrub(Math.max(0,Math.min(.98,(1-ratio)/.45)));}return;}
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
  const end=(e:PointerEvent)=>{pointers.current.delete(e.pointerId);const g=gesture.current;if(!g)return;if(g.pinch){if(g.grid&&pointers.current.size<2){g.grid=false;gridFingers.set(null);gridRelease();}if(!pointers.current.size){gesture.current=null;}return;}if(g.timer)clearTimeout(g.timer);const x=e.clientX-g.x,y=e.clientY-g.y;
    if(g.held&&!g.review&&!hookHover.current)hookHover.current=anchorAt(e.clientX,e.clientY,y);
    // Only touch state that changed: a plain tap must not re-render the whole app.
    // Only touch state that changed: a plain tap must not re-render the whole app.
    gesture.current=null;if(g.zone)setZone('');resetPeek();if(g.held&&!g.review&&hookHover.current){setPinnedInspect(true);haptic('rigid');}else if(g.held){setPinnedInspect(false);setInspect(null);}
    if(hookHover.current){hookHover.current=false;setOverHook(false);}
    if(g.review){if(g.element)(g.element as HTMLElement).style.transform='';if(g.held&&x>65)void recoverDecision(g.id);return;}if(g.held)return;
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
  const analyze=async(manual=false)=>{if(analysisRunning.current)return;analysisRunning.current=true;const snapshot=rawAssets,versions=analysisCoverage.begin(snapshot),epoch=analysisEpoch.current;setAnalyzing(true);if(manual)setError('');let listener:{remove():Promise<void>}|undefined;try{
    if(demo){if(manual)setNotice(t('Grupos de\ndemostración'));return;}listener=await Library.addListener('analysisProgress',value=>{if(epoch===analysisEpoch.current)setProgress(value);});
    // Photos only: videos are never stacked, so they are not compared either.
    const result=await Library.analyze({ids:snapshot.filter(a=>a.kind!=='video').map(a=>a.id),threshold:.28});
    if(epoch!==analysisEpoch.current||!latestConnected.current||!unchangedPhotos(versions,latestLibrary.current))return;
    const live=new Set(latestLibrary.current.map(a=>a.id));const groups=new Map(result.groups.flatMap((ids,i)=>ids.filter(id=>live.has(id)).map(id=>[id,`vision-${i}`] as const)));
    localStorage.setItem('mano-similarity-v1',JSON.stringify(Object.fromEntries(groups)));
    if(!result.skipped&&!result.cancelled){analysisCoverage.complete(latestLibrary.current);localStorage.setItem('mano-analysis-complete-v1',libraryFingerprint(latestLibrary.current));}else localStorage.removeItem('mano-analysis-complete-v1');
    if(warmingNow.current)deferredGroups.current=groups;else setAssets(prev=>prev.map(a=>({...a,group:groups.get(a.id)})));if(manual)setNotice(result.cancelled?t('Búsqueda\ndetenida'):result.groups.length?tn('similarGroups',result.groups.length):t('Sin fotos\nparecidas'));
  }catch(e){if(manual)messageError(e);}finally{try{await listener?.remove();}finally{analysisRunning.current=false;setAnalyzing(false);}}};
  useEffect(()=>{if(demo||!connected||loading||warming||analyzing||!assets.length)return;
    if(analysisCoverage.reuse(rawAssets)){localStorage.setItem('mano-analysis-complete-v1',fingerprint);return;}
    // Only hydrate once; a later metadata change must not be accepted merely
    // because the legacy ID/edit fingerprint happens to stay the same.
    if(!analysisMarkerRead.current){analysisMarkerRead.current=true;if(localStorage.getItem('mano-analysis-complete-v1')===fingerprint){analysisCoverage.complete(rawAssets);return;}}
    if(analysisCoverage.needsPass(rawAssets))void analyze();
  },[connected,fingerprint,rawAssets,loading,warming,analyzing]);
  useEffect(()=>()=>{analysisEpoch.current++;if(analysisRunning.current)void Library.cancelAnalysis().catch(()=>{});},[]);
  const stopAnalysis=async()=>{try{await Library.cancelAnalysis();}catch(e){messageError(e);}};
  /** Album = assign, then keep and advance (undoable like a swipe). If Fotos
   * fails, nothing is kept and the card stays. */
  const saveToAlbum=async(write:()=>Promise<{title:string;added?:number}>)=>{
    const ids=albumTargets;if(!ids.length||!startOperation())return false;
    try {
      if(!demo)await beforeNative('album',ids);
      const outcome=await assignToAlbum(write,ids);
      if(!outcome.ok){await nativeFailed(outcome.error);haptic('error');return false;}
      await record('keep',ids,s=>afterAlbum(s,ids,outcome,Date.now(),context),undefined,!demo);
      if(albumIds)setGridAlbumDone(n=>n+1);setAlbumIds(null);setSheet(null);haptic('success');setNotice(t('Guardada en\n«{album}»',{album:outcome.title}));return true;
    }catch(e){await nativeFailed(e);return false;}finally{endOperation();}
  };
  const createAlbum=async()=>{const title=newAlbum.trim();if(!title)return;const ok=await saveToAlbum(async()=>{const result=demo?{album:{id:`demo-${Date.now()}`,title},added:albumTargets.length}:await Library.createAlbum({title,ids:albumTargets});setAlbums(a=>[result.album,...a]);return {title:result.album.title,added:result.added};});if(ok){setNewAlbum('');setCreatingAlbum(false);}};
  const openAlbums=async(ids?:string[])=>{setAlbumIds(ids??null);if(!(ids??targets).length)return;setSheet('albums');setCreatingAlbum(false);setNewAlbum('');setError('');try{setAlbums(demo&&albums.length?albums:demo?[{id:'viajes',title:t('Viajes')},{id:'recuerdos',title:t('Recuerdos')},{id:'familia',title:t('Familia')}]:(await Library.albums()).albums);}catch(e){messageError(e);}};
  const addAlbum=(album:Album)=>void saveToAlbum(async()=>{if(!demo)await Library.addToAlbum({ids:albumTargets,albumId:album.id});return {title:album.title};});
  const commitDelete=async()=>{
    const ids=reviewAssets.map(a=>a.id);if(!ids.length||!startOperation())return;
    invalidateLibrary();
    try {
      if(!demo)await flushFavorites(ids,invalidateLibrary);
      if(!demo)await beforeNative('delete',ids);
      const result=demo?{deleted:ids}:await Library.deleteAssets({ids});
      invalidateLibrary();
      // Only IDs confirmed by this request may become removed. Missing visibility is not deletion.
      const confirmed=new Set(result.deleted.filter(id=>ids.includes(id)));
      const next=recordNow.current;
      await persistRecord({...next,pending:next.pending.filter(id=>!confirmed.has(id)),removed:[...new Set([...next.removed,...confirmed])],history:[]},
        confirmed.size===ids.length?{active:false,context:{...context,handIds:[],selected:[]}}:{},undefined,!demo);
      const gone=reviewAssets.filter(a=>confirmed.has(a.id));const bytes=gone.reduce((n,a)=>n+(a.bytes??0),0);const videos=gone.filter(a=>a.kind==='video').length;
      setStats(p=>({...p,freed:p.freed+bytes,freedPhotos:p.freedPhotos+gone.length-videos,freedVideos:p.freedVideos+videos,freedPartial:p.freedPartial||gone.some(a=>!a.bytes)}));
      if(confirmed.size!==ids.length){if(confirmed.size)setSpoken(tn('sentToDeleted',confirmed.size));setError(t('No se pudo completar la acción. Inténtalo de nuevo.'));return;}
      money.finish();cancelWarmup();setLock(NO_HAND);setSessionOpen(false);setSheet(null);setSession(false);setShowDone(true);haptic('success');
      if(demo)setNotice(t('Borrado simulado\nTus fotos, intactas'));else setSpoken(tn('sentToDeleted',confirmed.size));
    }catch(e){await nativeFailed(e);if(cancelled(e)){haptic('soft');setNotice(t('No se borró nada\nSigue en tu cola'));}}
    finally{endOperation();}
  };
  const play=async(asset:Asset)=>{if(demo){setNotice(testMode?t('Modo de prueba\nsin pantalla completa'):t('Pantalla completa\nsolo en el iPhone'));return;}try{await Library.preview({id:asset.id});}catch(e){messageError(e);}};
  const requestAccess=async():Promise<PhotoPermission>=>{if(demo)return 'authorized';try{const {status}=await Library.authorize();setPermission(status as PhotoPermission);if(['authorized','limited'].includes(status)){initialLibrary.current=null;loadLibrary();}return status as PhotoPermission;}catch{return 'denied';}};
  const finishOnboarding=(status:PhotoPermission)=>{try{localStorage.setItem(ONBOARDING_KEY,'done');}catch{/* shown again next launch */}setOnboarded(true);haptic(['authorized','limited'].includes(status)?'success':'warning');};
  const openSettings=()=>{void Library.openSettings().catch(()=>setError(t('Abre Ajustes › CocoWash › Fotos para permitir el acceso.')));};
  const manageLimited=async()=>{if(demo)return;try{const result=await Library.manageLimitedAccess();if(result.changed)await connect();}catch(e){messageError(e);}};
  const allowed=permission==='authorized'||permission==='limited';
  // No landing page: once onboarded and allowed, the session (or its resume) starts by itself.
  useEffect(()=>{if(onboarded&&allowed&&connected&&!session&&!showDone&&!warming&&!loading&&!loadError)void beginSession();},[onboarded,allowed,connected,session,showDone,warming,loading,loadError]);
  // Android: the round's favourites reach the gallery together, in one system dialog.
  useEffect(()=>{if(showDone&&!demo)void flushFavorites(undefined,invalidateLibrary).catch(messageError);},[showDone,demo,invalidateLibrary]);
  useEffect(()=>{setDecidedHere(new Set());},[filterKey]);
  // «Modo de prueba» never runs out: when fewer than eight cards remain, another
  // round of postcards is dealt. A round that adds nothing (filters exclude it)
  // stops the dealing until the filters change.
  const roundCheck=useRef<{filter:string;before:number;round:number}|null>(null);const roundsStuck=useRef('');
  useEffect(()=>{if(!testMode||!connected||queue.length>=8)return;const check=roundCheck.current;
    if(check&&check.round===demoRounds.current&&check.filter===filterKey&&queue.length<=check.before){roundsStuck.current=filterKey;roundCheck.current=null;return;}
    if(roundsStuck.current===filterKey||demoRounds.current>=500)return;
    const round=demoRounds.current+1;demoRounds.current=round;saveTestRounds(round);roundCheck.current={filter:filterKey,before:queue.length,round};
    setAssets(previous=>[...previous,...demoRound(round)]);},[testMode,connected,queue.length,filterKey]);
  // «Una última mirada» carries a fixed letter above «Recuperar todo» when one is ready.
  useEffect(()=>{if(sheet==='review'&&reviewAssets.length)money.reviewing();else money.release('review');},[sheet,reviewAssets.length>0,money.placement]);
  const frontVideo=useVideoStore(getVideos,active);
  const inspectedLive=useVideoStore(getVideos,inspect?.kind==='live'&&!onAndroid()?inspect:undefined);
  useEffect(()=>{if(liveRequested&&hand[0]?.id!==liveRequested&&inspect?.id!==liveRequested)setLiveRequested(null);},[windowHandKey,liveRequested,inspect?.id]);
  const requestLive=(asset:Asset)=>{if(onAndroid())return;const motion=motionAsset(asset);setLiveRequested(asset.id);getVideos().want([motion,...videoAhead],motion);getVideos().ensure(motion);};
  const placeWanted=(a:Asset)=>a.kind==='video'?display.video.location:display.photo.location;
  const frontPlace=usePlace(active,!!active&&placeWanted(active));
  // Anchored from the Fototeca: a stack of Polaroids, each with its place and date.
  const anchoredPlace=usePlace(inspectFromGrid&&inspect?inspect:undefined,!!inspect&&inspectFromGrid&&inspect.hasLocation===true);
  const stackOrder=inspect&&inspectSet&&inspectSet.length>1?(()=>{const i=Math.max(0,inspectSet.findIndex(a=>a.id===inspect.id));return [...inspectSet.slice(i),...inspectSet.slice(0,i)];})():[];
  // Taken when the set moves on (Siguiente, Anterior, a decision): where each photo sat.
  const stackFrom=useRef<{id:string;was:Record<string,number>}|null>(null);
  const rememberStack=(nextId:string)=>{stackFrom.current={id:nextId,was:Object.fromEntries(stackOrder.map((a,k)=>[a.id,k-1]))};};
  const stackWas=inspect&&stackFrom.current?.id===inspect.id?stackFrom.current.was:{};
  // While the set rotates (or moves on after a decision) the outgoing view leaves at once:
  // the incoming one already shows the whole stack moving (Inspector, AnchoredStack).
  const rotating=useRef(false);
  const anchoredCaption=inspect&&inspectFromGrid?polaroidCaption(inspect,anchoredPlace,{...display.photo,location:true,date:true},locale):undefined;
  // Resolve the next places in the window ahead of time, one request at a time
  // behind the card on screen (native pacing and per-id cache unchanged).
  useEffect(()=>{if(session)prefetchPlaces(upcoming.filter(a=>a.hasLocation&&placeWanted(a)));},[session,upcomingKey,display.photo.location,display.video.location]);
  const scope=useMemo(()=>filterScope(assets,state,filter,Date.now(),decidedHere,queue.length),[assets,state,filter,decidedHere,queue.length]);
  const currentColor=zone;
  const lastDecision=state.history.at(-1);
  const noticeRoom=useNoticeRoom();
  const toggleFilters=()=>{const on=!!filterSetting.off;resumeContext.current=undefined;setFilter(f=>({...f,off:on?undefined:true,startAt:undefined}));setSelected([]);setLock(NO_HAND);haptic('selection');setNotice(on?t('Filtros activados'):t('Filtros desactivados\nTodo en orden cronológico'));};
  const filtersButton=<FilterSwitch id="filter-trigger" on={!filterSetting.off} toggle={toggleFilters} edit={()=>{setSheetTab('filters');openFilters();}}/>;
  const brand=<h1 id="session-heading" tabIndex={-1} className="header-brand"><BrandStatus notice={notice}/></h1>;
  const visibleError=error;
  const alert=visibleError&&!sheet?<ErrorAlert message={visibleError} clear={()=>void acknowledgeError()}/>:null;
  // 9.8: the round summary is a closing moment — no way into Filtros from here, only «Seguir revisando».
  const doneHeader=<><header ref={noticeRoom} className="archive-header"><span className="header-spacer" aria-hidden="true"/>{brand}<span className="header-spacer" aria-hidden="true"/></header>{alert}</>;
  const pending=state.pending.length;
  let screen:ReactNode;
  if(!onboarded)screen=<Suspense fallback={<main className="status-screen is-quiet" aria-busy="true"><CocoLoader size={44}/></main>}><Onboarding requestAccess={requestAccess} finish={finishOnboarding} granted={permission==='authorized'||permission==='limited'}/></Suspense>;
  else if(permission==='unknown')screen=loadError?<LoadErrorScreen message={loadError} retry={()=>{initialLibrary.current=null;loadLibrary();}}/>:<PreparingScreen/>;
  else if(!allowed)screen=<AccessScreen status={permission} request={()=>void requestAccess()} openSettings={openSettings}/>;
  else if(loadError)screen=<LoadErrorScreen message={loadError} retry={()=>{initialLibrary.current=null;loadLibrary();}}/>;
  else if(!session)screen=showDone&&sheet==='review'?<div className="session-content">{doneHeader}<main className="status-screen is-quiet"><Character pose="coqui-review" height={120} motion="still"/><p className="status-line">{t('Una última mirada antes de terminar.')}</p></main></div>:showDone?<div className="session-content">{doneHeader}<SessionDone stats={stats} pending={pending} pendingBytes={reviewBytes.bytes} pendingPartial={reviewBytes.partial} again={()=>{money.clear();setShowDone(false);setNotice('');}} review={()=>{money.clear();setError('');setSheet('review');}} monetization={money.available&&(money.placement==='finish'||money.awaiting==='finish')&&<div className="finish-monetization">{money.placement==='finish'?<AdSlot where="finish" money={money}/>:<AdRoom where="finish"/>}</div>}/></div>:<PreparingScreen cancel={()=>{cancelWarmup();setShowDone(true);}}/>;
  else screen=<div className={`session-content ${gridOpen?'is-gridding':''}`} inert={pinnedInspect}>
    {/* «Terminar» ends the round: the summary keeps pending discards and offers the review. */}
    <header ref={noticeRoom} className="archive-header is-session">{filtersButton}{brand}<FinishButton pending={pending} busy={busy} announce={setSpoken} finish={()=>{if(gridOpen)gridUnmount();cancel();setError('');setSheet('review');haptic('light');}}/></header>
    {/* Second row: how far through the filtered pile (same calculation as before). */}
    <div className="archive-progress">{testMode&&<button className="access-indicator test-mode" onClick={()=>{setSheetTab('settings');setSheet('filters');}}>{t('Modo de prueba')}</button>}{limited&&<button className="access-indicator" onClick={()=>void manageLimited()}><InfoIcon size={14} weight="bold"/>{t('Acceso limitado')}</button>}{gridOpen&&<motion.span className="grid-exit-room" style={{width:exitRoom}}><motion.button type="button" className="grid-exit" data-testid="grid-exit" style={{opacity:exitShow,scale:exitScale}} onClick={gridExit} aria-label={t('Volver a las cartas')}><XIcon size={17} weight="bold"/></motion.button></motion.span>}<PileProgress reviewed={scope.reviewed} total={scope.total} count={<><AnimatedNumber value={scope.reviewed}/><span className="pile-slash">/</span><AnimatedNumber value={scope.total} className="is-total"/></>}/></div>
    <motion.section ref={stage} style={{opacity:handFade}} inert={gridIn} className={`hand-space ${currentColor}`} aria-label={t('Pila de recuerdos')}>{alert}
      {deckAd?<motion.div key="deck-ad" className="ad-stage" initial={reduced?false:{opacity:0,y:16,scale:.96}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.3,ease:[.2,.8,.2,1]}}><AdSlot where="deck" money={money}/></motion.div>:!connected?<div className="empty-state"><Character pose="coqui-wave" height={140} className="empty-character"/><h2>{t('Tu carrete, en tus manos.')}</h2><p>{t('Revisa, conserva y ordena tus recuerdos. Nada se borra sin tu confirmación.')}</p><button className="primary-empty" onClick={connect} disabled={loading}>{loading?t('Abriendo Fotos…'):t('Abrir mi biblioteca')}</button><small>{t('Todo se analiza en tu iPhone.')}</small></div>:!active?<div className="empty-state"><Character pose={scope.total?'coqui-calm':'coqui-wonder'} height={120} className="empty-character" motion="sway"/><h2>{favView&&!scope.total?t('Aún no hay favoritas.'):scope.total?t('Todo en su sitio.'):t('Nada con estos filtros.')}</h2><p>{favView&&!scope.total?t('Toca el corazón o desliza hacia arriba para guardar una.'):narrowed?t('Prueba con otros filtros o resetéalos.'):pending?t('Lo marcado para eliminar te espera al pulsar Terminar.'):scope.total?t('No quedan fotos pendientes con estos filtros.'):t('Prueba con otras fechas o con todo el contenido.')}</p><button className="primary-empty" onClick={()=>{setSheetTab('filters');setSheet('filters');}}>{t('Cambiar filtros')}</button>{narrowed&&<button className="secondary-empty" data-testid="reset-filters" onClick={resetFilters}><ArrowCounterClockwiseIcon size={18} weight="bold"/>{t('Resetear filtros')}</button>}{!demo&&<button className="text-button" onClick={connect}>{t('Actualizar biblioteca')}</button>}</div>:<div className="polaroid-stack" data-testid="photo-hand">
        <AnimatePresence>{bundleKey&&<motion.div className="bundle-arrival" key={bundleKey} initial={reduced?false:{opacity:0,scale:.94,y:-6}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}} transition={{duration:.24,ease:[.2,.8,.2,1]}} role="status"><StackIcon size={15} weight="bold"/><span aria-hidden="true">{targetIds.length ? t('{n} de {total}',{n:targetIds.length,total:hand.length}) : tn('photos',hand.length)}</span><span className="sr-only">{targetIds.length ? t('{n} de {total} fotos seleccionadas',{n:targetIds.length,total:hand.length}) : tn('photos',hand.length)}</span></motion.div>}</AnimatePresence>
        {bundleKey&&!reduced&&<motion.div key={`flash-${bundleKey}`} className="bundle-flash" initial={{opacity:0}} animate={{opacity:[0,.14,0]}} transition={{duration:.5}}/>}
        <AnimatePresence custom={lastDecision}>{[...hand].reverse().map(asset=>{const tape=asset.kind==='video';const {cardWidth,cardHeight}=cardBox(stageSize,asset,!display.photo.polaroid);const index=hand.indexOf(asset),picked=targetIds.includes(asset.id);
          const kindLabel=asset.kind==='video'?t('Vídeo'):asset.kind==='live'?'Live Photo':t('Foto');const lifting=index===0&&!!inspect&&inspect.id===asset.id;
          return <HandCard key={asset.id} id={asset.id} index={index} follow={index===0||picked} reduced={!!reduced} register={register} inert={index!==0} data-testid={`card-${asset.id}`} className={`photo-card ${tape?'tape':'paper'} ${!tape&&!display.photo.polaroid?'is-plain':''} ${index===0?'front':''} ${picked?'picked':''} ${lifting?'is-lifted':''}`} style={{zIndex:20-index,width:cardWidth,height:cardHeight,left:`calc(50% - ${cardWidth/2}px)`,top:`calc(50% - ${cardHeight/2}px)`} as CSSProperties}
            initial={reduced?false:{opacity:0,scale:.97}} animate={{opacity:1,scale:1-index*.018}}
            variants={{leave:(decision?:Decision)=>cardExit(asset.id,decision,reduced)}} exit="leave"
            transition={reduced?{duration:0}:CARD_SPRING}
            onPointerDown={e=>start(e,asset)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel}
            tabIndex={index===0?0:-1} aria-hidden={index!==0} aria-label={`${t('{kind} {n} de {total}',{kind:kindLabel,n:index+1,total:hand.length})}${picked?t(', seleccionada'):''}${tape?t('. Toca o pulsa Intro para pausar o reproducir.'):hand.length>1?t('. Intro para ver la siguiente; espacio para seleccionar.'):''}`} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key===' '){e.preventDefault();select(asset.id);}if(e.key==='Enter'){e.preventDefault();index===0?(tape?videoControl.current?.toggle():cycle()):select(asset.id);}}}>
            <div className="photo-window">{(tape||(asset.kind==='live'&&!onAndroid()))&&index===0?<InlineVideo key={asset.id} tools={tape&&isNative&&!demo?<CardShare asset={asset} sharing={sharing} share={shareActive}/>:undefined} asset={asset} state={frontVideo} request={()=>requestLive(asset)} active={!inspect&&!sheet&&!sharing} retry={()=>getVideos().retry(motionAsset(asset))} download={()=>{requestLive(asset);getVideos().download(motionAsset(asset));}} fullscreen={()=>{if(tape)void play(asset);}} openSettings={openSettings} meta={tape?display.video:undefined} place={frontPlace} sound={tape?videoSound:false} onSound={tape?()=>setVideoSound(v=>!v):undefined} onOsd={tape?()=>setDisplay(d=>({...d,video:{...d.video,osd:!d.video.osd}})):undefined} control={videoControl}><Photo asset={asset} quiet={tape} pool={preloader.current}/></InlineVideo>:<Photo asset={asset} quiet={tape} pool={preloader.current}/>}</div>
            {index===0&&!tape&&display.photo.polaroid&&<PolaroidCaption asset={asset} settings={display.photo} place={frontPlace} pending={display.photo.location&&!!asset.hasLocation&&frontPlace===undefined}/>}
            {hand.length>1&&<button tabIndex={index===0?0:-1} className={`pick-toggle ${picked?'selected':''}`} aria-label={picked?t('Deseleccionar {kind} {n}',{kind:kindLabel,n:index+1}):t('Seleccionar {kind} {n}',{kind:kindLabel,n:index+1})} aria-pressed={picked} onPointerDown={e=>e.stopPropagation()} onClick={()=>{haptic('selection');select(asset.id);}}><CheckIcon size={16} weight="bold"/></button>}
            {index===0&&!tape&&isNative&&!demo&&<CardShare asset={asset} sharing={sharing} share={shareActive}/>}
            {index===0&&<button className="zoom-access" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();openPinned(asset,e.currentTarget.closest('article')!);}}><PushPinIcon size={16} weight="bold"/>{t('Anclar')}</button>}
            {index===0&&filter.geek&&<button className="geek-access" aria-label={t('Ver datos del archivo')} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();openPinned(asset,e.currentTarget.closest('article')!);}}><InfoIcon size={18} weight="bold"/></button>}
            {index===0&&asset.id===best&&<span className="best-chip"><SparkleIcon size={13} weight="fill"/>{t('Mejor toma')}</span>}
            {display.photo.seal&&state.marks[asset.id]&&<Seal level={state.marks[asset.id].level} hide={hideSeals}/>}
          </HandCard>;
        })}</AnimatePresence>
        {currentColor&&!(favView&&currentColor==='favorite')&&<motion.span className={`drag-stamp ${currentColor}`} style={{opacity:stampOpacity}}><Stamp kind={currentColor} word lettering={stampWords}/></motion.span>}
        {flash&&<DecisionStamp key={flash.key} kind={flash.kind} lettering={stampWords} reduced={!!reduced} done={()=>setFlash(f=>f?.key===flash.key?null:f)}/>}
      </div>}
    </motion.section>
    <motion.div className="bundle-controls" style={{opacity:laterFade}} inert={deckAd||gridIn}>{hand.length>1&&!deckAd?<div className="segmented"><button onClick={()=>{haptic('selection');setSelected(allPicked?[]:others);}}>{allPicked?t('Quitar selección'):best?t('Elegir las demás'):t('Elegir todas')}</button><button onClick={cycle} aria-label={t('Ver la siguiente foto del grupo')}><ArrowClockwiseIcon size={16}/>{t('Siguiente')}</button></div>:null}</motion.div>
    {/* Eliminar (←) · the heart, protagonist · Conservar (→): three buttons drawn
        as one set (DecisionBar). The piece on the side the card is dragged
        toward rises. In «Favoritas» the heart is on and takes items out. */}
    <DecisionBar count={targets.length} disabled={deckAd||!active||busy} favoriteOn={favView} armed={currentColor}
      onDiscard={()=>void act('discard')} onFavorite={()=>void act('favorite')} onKeep={()=>void act('keep')}/>
    <footer className="archive-tools" inert={deckAd||gridIn}><button onClick={undoLast} disabled={busy||!state.history.length} aria-label={state.history.length?t('Deshacer la última decisión'):t('Nada que deshacer')}><span className="tool-icon"><ArrowUUpLeftIcon size={24} className="flip-rtl"/></span><span className="tool-label">{t('Deshacer')}</span></button><motion.button className="later" style={{opacity:laterFade}} aria-label={targets.length>1?t('Dejar {n} para más tarde',{n:targets.length}):t('Dejar para más tarde')} disabled={!active||busy} onClick={()=>act('later')}><span className="tool-icon"><DecisionIcon kind="later" size={24}/></span><span className="tool-label">{t('Más tarde')}</span></motion.button>{/* Android keeps albums as folders (moving the original): no «Álbum» there; the empty cell keeps «Más tarde» centred. */}{onAndroid()?<span aria-hidden="true"/>:<button id="album-trigger" onClick={()=>void openAlbums()} disabled={!active||busy}><span className="tool-icon"><FolderSimplePlusIcon size={24}/></span><span className="tool-label">{t('Álbum')}</span></button>}</footer>
    </div>;
  const libraryActions=<>
    <button className="sheet-action secondary" onClick={()=>void analyze(true)} disabled={analyzing}>{analyzing?<><CocoLoader size={22} progress={progress.total?progress.done/progress.total:undefined}/>{t('Buscando parecidas…')}</>:t('Buscar fotos parecidas')}</button>
    {analyzing&&<button className="sheet-action quiet" onClick={stopAnalysis}>{t('Detener búsqueda')}</button>}
    {!demo&&<button className="sheet-action secondary" onClick={connect}>{t('Actualizar biblioteca')}</button>}
    {limited&&<button className="sheet-action secondary" onClick={()=>void manageLimited()}>{t('Elegir más fotos')}</button>}
  </>;
  const reviewEnd=useRef<HTMLDivElement>(null);
  const recoverDecision=async(id?:string)=>{
    if(!startOperation())return;
    try {const next=recordNow.current;await persistRecord(id?restore(next,id):{...next,pending:[],history:next.history.filter(d=>d.action!=='discard')});setSpoken(id?t('Elemento recuperado'):t('Todo recuperado'));haptic('soft');}
    catch(e){messageError(e);}finally{endOperation();}
  };
  const resetDemo=async()=>{
    if(!demo||!startOperation())return;
    try {await persistRecord(initialState(),{active:false,filter:initialFilter,context:{handIds:[],selected:[],rotated:[]}});
      demoRounds.current=0;roundCheck.current=null;roundsStuck.current='';if(testMode){saveTestRounds(0);setAssets(demoAssets);}setStats(EMPTY_STATS);setSessionOpen(false);setSession(false);setShowDone(false);setLock(NO_HAND);setFilter(initialFilter);setSelected([]);setSheet(null);setSpoken(t('Demostración reiniciada'));
    }catch(e){messageError(e);}finally{endOperation();}
  };
  const recoverAll=()=>void recoverDecision();
  const recoverReview=(id:string)=>void recoverDecision(id);
  const acknowledgeError=async()=>{try{if(journal?.snapshot.intent){if(operationBusy.current)return;await journal.intent();invalidateLibrary();loadLibrary();}setError('');}catch{setError('');}};
  // Long press never opens the system menu or loupe; text fields keep theirs.
  const blockMenu=(e:MouseEvent)=>{if(!(e.target as HTMLElement).closest('input,textarea'))e.preventDefault();};
  return <div ref={root} className={`mano-app ${isNative?'on-device':''} ${session?'in-session':'on-screen'}`} onContextMenu={blockMenu}>
    {screen}
    <p className="sr-only" role="status" aria-live="polite">{spoken}</p>
    {splash&&<Splash done={()=>setSplash(false)}/>}
    {gridOpen&&<Suspense fallback={null}><LibraryGrid assets={assets} state={state} filter={filterSetting} filtersOn={!filterSetting.off} cardFrom={gridCard.current} top={gridTop} selected={gridSelection} setSelected={setGridSelection} progress={gridProgress} scrub={gridScrub} release={gridRelease} cardTarget={cardTarget} fingers={gridFingers} tools={gridTools.current}
      share={ids=>void shareMany(ids)} reviewFrom={asset=>{resumeContext.current=undefined;setFilter(f=>({...f,off:true,startAt:asset.date}));setSelected([]);setLock(NO_HAND);gridUnmount();setNotice(t('En orden desde esta foto'));}} current={hand[0]?.id} busy={busy} close={gridExit} decide={(action,ids)=>act(action,ids)} undo={()=>void undoLast()} notice={setNotice}
      album={onAndroid()?undefined:ids=>void openAlbums(ids)} albumDone={gridAlbumDone} enterFrom={gridEnter.current}
      openSet={(list,from,src)=>{gridPoster.current=src?{id:list[0]?.id,src}:null;rotating.current=false;heldVideo.current=null;inspectOrigin.current=from;resetPeek();setInspectSet(list.length>1?list:null);setInspectFromGrid(true);setPinnedInspect(true);setInspect(list[0]);haptic('rigid');}}
      open={(asset,from,src)=>{gridPoster.current=src?{id:asset.id,src}:null;rotating.current=false;heldVideo.current=null;inspectOrigin.current=from;resetPeek();setInspectFromGrid(true);setPinnedInspect(true);setInspect(asset);haptic('rigid');}}
      ad={gridAds&&money.placement==='grid'?within=><AdSlot where="grid" money={money} within={within}/>:undefined}/></Suspense>}
    {/* Anchored set: tapping the photo moves on (user, 2026-11-13: the arrows were not needed);
        the counter stays, and is itself a button for keyboard and screen readers. */}
    {inspect&&inspectSet&&inspectSet.length>1&&<button type="button" className="inspect-set" onClick={()=>rotateSet(1)} aria-label={t('Siguiente')}><span aria-live="polite">{t('{n} de {total}',{n:formatNumber(inspectSet.findIndex(a=>a.id===inspect.id)+1),total:formatNumber(inspectSet.length)})}</span></button>}
    <CenterNotice notice={notice}/>
    <AnimatePresence custom={rotating.current}>{inspect&&<InspectorBoundary key={inspect.id} close={closeInspect}><Suspense fallback={<div className="inspection is-pinned" aria-busy="true"><div className="inspection-shade"/><CocoLoader size={44}/></div>}><Inspector asset={inspect} src={sharpPreview(inspect)??(preloader.current?.get(inspect)?.poster||(gridPoster.current?.id===inspect.id?gridPoster.current.src:undefined))} cloud={!!preloader.current?.peek(inspect)?.value?.cloud} pinned={pinnedInspect} origin={inspectOrigin.current} peek={{x:peekX,y:peekY}} anchor={anchor} armed={overHook} geek={!!filter.geek} polaroid={anchoredCaption&&inspect?.kind!=='video'?{where:anchoredCaption.where,when:anchoredCaption.when,stack:stackOrder.length>1?{behind:stackOrder.slice(1,3),was:stackWas}:undefined}:undefined} close={closeInspect} decide={inspectFromGrid&&pinnedInspect?decideAnchored:undefined} next={inspectFromGrid&&inspectSet&&inspectSet.length>1?()=>rotateSet(1):undefined} pin={()=>{setPinnedInspect(true);haptic('rigid');}}
      video={(inspect.kind==='video'&&inspect.id===active?.id)||(inspect.kind==='live'&&!onAndroid())?{state:inspect.kind==='live'?inspectedLive:frontVideo,request:()=>requestLive(inspect),retry:()=>getVideos().retry(motionAsset(inspect)),download:()=>{requestLive(inspect);getVideos().download(motionAsset(inspect));},fullscreen:()=>{if(inspect.kind==='video')void play(inspect);},openSettings,sound:videoSound,onSound:()=>setVideoSound(v=>!v),freeze:inspect.kind==='video'?heldVideo.current:undefined}:undefined}/></Suspense></InspectorBoundary>}</AnimatePresence>
    <Sheet open={sheet==='filters'} close={()=>setSheet(null)} title={sheetTab==='filters'?t('Filtros'):sheetTab==='support'?t('Apoyo'):t('Ajustes')} description={sheetTab==='filters'?t('Elige qué fotos entran en la pila.'):sheetTab==='support'?t('Quita los anuncios o invita un café a quien la hace.'):t('Elige cómo se ven tus recuerdos.')} error={visibleError} returnTo="filter-trigger">
      <div className="sheet-tabs" role="group" aria-label={t('Sección')}><button aria-pressed={sheetTab==='filters'} onClick={()=>{haptic('selection');setSheetTab('filters');}}>{t('Filtros')}</button><button aria-pressed={sheetTab==='settings'} onClick={()=>{haptic('selection');setSheetTab('settings');}}>{t('Ajustes')}</button>{money.available&&<button aria-pressed={sheetTab==='support'} onClick={()=>{haptic('selection');setSheetTab('support');}}>{t('Apoyo')}</button>}</div>
      <div hidden={sheetTab!=='filters'}>
        <Filters filter={filterSetting} assets={assets} state={state} preview={draft=>prewarm(eligible(assets,state,draft,Date.now(),seed.current))} index={{sized:index.sized,total:rawAssets.length,analyzed:index.analyzed,photos:index.photos,measuring:index.measuring,analyzing:index.analyzing}} apply={value=>{resumeContext.current=undefined;setFilter(f=>({...value,geek:f.geek,off:undefined,startAt:undefined}));setSelected([]);setLock(NO_HAND);setSheet(null);haptic('light');setSpoken(t('Filtros aplicados'));}}/>
        {demo&&<button className="sheet-action secondary" onClick={()=>void resetDemo()}>{t('Reiniciar demostración')}</button>}
      </div>
      {/* Mounted only when shown: measured while hidden (display:none), the VHS preview
          laid out at zero size and flashed when the tab opened. */}
      <div hidden={sheetTab!=='settings'}>{sheetTab==='settings'&&<Suspense fallback={<CocoLoader size={44}/>}><DisplaySettingsPanel display={display} change={setDisplay} stampWordsAuto={stampWordsAuto} geek={!!filter.geek} setGeek={value=>setFilter(f=>({...f,geek:value}))} library={libraryActions} replayIntro={()=>{setSheet(null);setOnboarded(false);haptic('selection');}} testing={isNative&&DEVELOPER?{on:testMode,set:on=>setTestMode(on),ads:!adsOff,setAds:on=>{saveAdsOff(!on);setAdsOff(!on);haptic('selection');}}:undefined}/></Suspense>}</div>
      {money.available&&<div hidden={sheetTab!=='support'}>{sheet==='filters'&&sheetTab==='support'&&<PurchaseOptions money={money}/>}</div>}
    </Sheet>
    <Sheet open={sheet==='albums'} close={()=>{setSheet(null);setAlbumIds(null);}} title={t('Guardar en un álbum')} description={t('Se conserva y pasa a la siguiente. También sigue en tu carrete.')} error={visibleError} returnTo="album-trigger"><p className="sheet-intro">{parts(tn('selected',albumTargets.length),{n:<strong key="n">{formatNumber(albumTargets.length)}</strong>})}</p><button className="album-row album-new" onClick={()=>setCreatingAlbum(v=>!v)} disabled={busy}><span className="row-icon"><PlusIcon size={20} weight="bold"/></span>{t('Crear álbum nuevo')}</button>{creatingAlbum&&<div className="new-album"><label className="field">{t('Nombre del álbum')}<AlbumInput value={newAlbum} change={setNewAlbum}/></label><button className="sheet-action" onClick={createAlbum} disabled={busy||!newAlbum.trim()}>{tn('createAndAdd',targets.length)}</button></div>}{albums.map(a=><button className="album-row" key={a.id} onClick={()=>addAlbum(a)} disabled={busy}><span className="row-icon"><FolderOpenIcon size={20}/></span>{a.title}<CaretRightIcon size={16} weight="bold" className="flip-rtl"/></button>)}</Sheet>
    <Sheet open={sheet==='review'} close={()=>setSheet(null)} footer={reviewAssets.length>0&&money.available&&(money.placement==='review'||money.awaiting==='review')&&<div className="review-monetization">{money.placement==='review'?<AdSlot where="review" money={money}/>:<AdRoom where="review"/>}</div>} title={t('Una última mirada')} description={t('Recupera lo que quieras conservar antes de eliminar.')} error={visibleError} returnTo={session?'review-trigger':'filter-trigger'}><p className="sheet-intro">{reviewAssets.length?parts(freeLabel?(reviewBytes.partial?t('{count}: liberarías al menos {size}. Aún no se ha borrado nada.'):t('{count}: liberarías {size}. Aún no se ha borrado nada.')):t('{count}. Aún no se ha borrado nada.'),{count:<strong key="count">{t('{n} para eliminar',{n:reviewAssets.length})}</strong>,size:<strong key="size">{freeLabel}</strong>}):t('No hay nada marcado para eliminar.')}</p>
      {/* 9.8.6: every photo first, three across; the decision waits at the end of
          the list, so it is made after seeing all of it. A cue says so until then. */}
      {!reviewAssets.length&&pending>0&&<><p className="sheet-intro">{t('Fotos no muestra ahora los elementos pendientes. Puedes recuperarlos de la cola; no se darán por eliminados.')}</p><button className="sheet-action secondary recover-all" disabled={busy} onClick={recoverAll}><ArrowCounterClockwiseIcon size={20}/>{t('Recuperar todo ({n})',{n:pending})}</button></>}
      {reviewAssets.length>0&&<><ReviewGrid assets={reviewAssets} open={sheet==='review'} recover={recoverReview} disabled={busy}/>
        <ScrollCue until={reviewEnd}/>
        <div className="review-primary" ref={reviewEnd}><button className="sheet-action secondary recover-all" disabled={busy} onClick={recoverAll}><ArrowCounterClockwiseIcon size={20}/>{reviewAssets.length===1?t('Recuperar'):t('Recuperar todo ({n})',{n:reviewAssets.length})}</button><button className="sheet-action danger" onClick={commitDelete} disabled={busy} aria-busy={busy}><TrashIcon size={20}/>{busy?t('Esperando a Fotos…'):freeLabel&&!reviewBytes.partial?t('Eliminar {n} ({size})',{n:reviewAssets.length,size:freeLabel}):t('Eliminar {n}',{n:reviewAssets.length})}</button><p className="sheet-fine">{t('Fotos te pedirá confirmación; lo eliminado queda 30 días en «Eliminado recientemente», también en iCloud.')}</p></div></>}
    </Sheet>

  </div>;
}
