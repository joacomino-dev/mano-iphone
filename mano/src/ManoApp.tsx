import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import { FolderOpenIcon, FolderSimplePlusIcon, CaretRightIcon, CaretLeftIcon, ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, HeartStraightIcon, ImagesIcon, StackIcon, TrashIcon, CheckIcon, XIcon, PlayIcon, PauseIcon, CircleNotchIcon, SlidersHorizontalIcon, ArrowClockwiseIcon, CloudSlashIcon, CornersOutIcon, PlusIcon } from '@phosphor-icons/react';
import { BottomSheet, Carousel, KeyboardInput, useKeyboard } from './mobile';
import { decide, undo, restore, eligible, nextSessionHand, readState, reviewedCount, reconcileLibrary, libraryFingerprint, LEVELS, initialFilter, type Asset, type Decision, type Filter, type RecordState } from './domain';
import { Library, isNative, demoAssets, thumbnail, type Album } from './library';
import { AssetPreloader, upcomingSessionAssets, type PreloadSnapshot } from './preload';
import { prepareReviewAsset, type PreparedMedia } from './media';
import { InlineVideo } from './InlineVideo';
import { Filters } from './Filters';
import { Inspector, type InspectOrigin } from './Inspector';
import { readSession, saveSession, DEMO_SESSION_KEY, LIBRARY_SESSION_KEY, type ActiveSession } from './session';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
// Seal inks follow LEVELS names (Blanco…Dorado), tuned to sit on CocoWash paper.
const colors = ['#E4D8C2', '#B44238', '#3F7A62', '#1F2A2A', '#3E6497', '#73568E', '#C4733A', '#B38E3A'];
const ranks = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
// Presentation only: a decided card leaves toward the side of its decision.
// Any other removal (filters, undo, session end) simply fades.
const leaveEase = [.32, .72, .36, 1] as const;
function cardExit(id: string, decision: Decision | undefined, reduced: boolean | null) {
  const decided = !!decision?.ids.includes(id);
  if (reduced || !decided) return { opacity: 0, pointerEvents: 'none' as const, transition: { duration: reduced ? 0 : .16 } };
  const flight = decision!.action === 'keep' ? { x: 440, rotate: 12 } : decision!.action === 'discard' ? { x: -440, rotate: -12 } : { y: -560, scale: .92 };
  return { ...flight, opacity: 0, pointerEvents: 'none' as const, transition: { duration: .34, ease: leaveEase } };
}
function savedGroups(items: Asset[]) {
  try { const groups = JSON.parse(localStorage.getItem('mano-similarity-v1') || '{}') as Record<string,string>; return items.map(a=>({...a,group:groups[a.id]})); } catch { return items; }
}
function Photo({ asset, small=false, prepared }: { asset: Asset; small?: boolean; prepared?:string }) {
  const [src, setSrc] = useState(''); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { let alive = true; setError(false); setSrc(''); (prepared&&retry===0?Promise.resolve(prepared):thumbnail(asset,small?260:900,retry>0)).then(s => { if (alive) setSrc(s); }).catch(() => { if (alive) setError(true); }); return () => { alive = false; }; }, [asset.id, asset.modified, retry, small, prepared]);
  return src&&!error ? <img onError={()=>setError(true)} src={src} alt={asset.kind === 'video' ? 'Vista previa de vídeo' : 'Foto del carrete'} draggable={false}/> : <div className="photo-loading">{error ? <><CloudSlashIcon size={28}/><span>No se pudo descargar</span>{!small&&<button onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setRetry(v=>v+1);}}>Reintentar</button>}</> : <CircleNotchIcon className="spinner" size={28}/>}</div>;
}
function Seal({ level }: { level: number }) {
  return <span className="seal" style={{ '--seal-color': colors[level-1] } as CSSProperties} aria-label={`Conservada, sello ${LEVELS[level-1]}`}><img src="/assets/stamp-red.png" alt=""/><b>{ranks[level-1]}</b></span>;
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
function BrandStatus({message,error=false,clear,logo=true}:{message:string;error?:boolean;clear?:()=>void;logo?:boolean}) {
 // Reduce Motion: the mascot and notices swap with a plain fade, no travel.
 const reduced=useReducedMotion();const travel=reduced?0:1;const timing=reduced?{duration:0}:{duration:.22,ease:[.2,.8,.2,1] as const};
 return <div className={`brand-status ${message?'has-message':''} ${error?'has-error':''}`}>{logo&&<motion.img src="/assets/cocowash-compact.svg" alt="CocoWash" animate={{y:message?-10*travel:0,scale:message?.86:1,opacity:message?0:1}} transition={timing}/>}<AnimatePresence>{message&&<motion.div key={message} role={error?'alert':'status'} initial={{opacity:0,y:-8*travel}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6*travel}} transition={timing}>{error&&<span className="notice-dot" aria-hidden="true"/>}<span>{message}</span>{error&&clear&&<button onClick={clear} aria-label="Cerrar aviso"><XIcon size={16}/></button>}</motion.div>}</AnimatePresence></div>;
}
function Welcome({assets,begin,loading,reduced,error,openFilters,warming,prepared,cancelWarmup,resuming,notice,clearError}: {assets:Asset[];begin:()=>void;loading:boolean;reduced:boolean|null;error:string;openFilters:()=>void;warming:boolean;prepared:PreloadSnapshot<PreparedMedia>;cancelWarmup:()=>void;resuming:boolean;notice:string;clearError:()=>void}) {
  const [paused,setPaused]=useState(false);const still=reduced||paused;const [slots,setSlots]=useState([0,1,2,3,4,5]);const next=useRef(6);
  useEffect(()=>{next.current=6;setSlots([0,1,2,3,4,5]);},[assets]);
  const positions=[8,59,32,2,66,41];
  return <main className="welcome">
    <header className="welcome-brand"><span className="wordmark">CocoWash</span><BrandStatus message={error||notice} error={!!error} clear={clearError} logo={false}/><button id="filter-trigger" className="header-filters" onClick={openFilters} disabled={loading||warming}><SlidersHorizontalIcon size={20}/><span>Filtros</span></button></header>
    <div className="floating-memories" aria-hidden="true">{slots.map((slot,i)=><motion.div className="welcome-polaroid paper" key={`${i}-${slot}`} style={{left:`${positions[i]}%`,top:still?`${(i%3)*25}%`:'-55%'}} initial={still?false:{y:0,rotate:i%2?11:-13,opacity:0}} animate={still?{y:0,rotate:i%2?8:-9}:{y:[0,540],rotate:[i%2?11:-13,i%2?-5:6],opacity:[0,1,1,0]}} transition={still?{duration:0}:{duration:8+i*.5,ease:'linear',delay:slot<6?i*1.1:0,times:[0,.12,.84,1]}} onAnimationComplete={()=>{if(!still)setSlots(previous=>previous.map((v,index)=>index===i?next.current++:v));}}>{assets.length?<Photo asset={assets[slot%assets.length]} small/>:<ImagesIcon size={36}/>}</motion.div>)}</div>
    {!reduced&&<button className="ambient-toggle" onClick={()=>setPaused(v=>!v)} aria-pressed={paused} aria-label={paused?'Animar recuerdos':'Pausar animación'}>{paused?<PlayIcon size={16} weight="fill"/>:<PauseIcon size={16} weight="fill"/>}</button>}
    <div className="welcome-copy"><img className="welcome-mascot" src="/assets/cocowash.svg" alt="" draggable={false}/><span className="eyebrow">Un poco de orden. Mucho coco.</span><h1>Lo que importa,<br/>se queda.</h1></div>
    <button id="start-trigger" className="start-session" onClick={begin} disabled={loading||warming} aria-busy={loading||warming}>{warming?<><CircleNotchIcon className="spinner" size={20}/>Preparando {prepared.completed} de {prepared.total}</>:loading?<><CircleNotchIcon className="spinner" size={20}/>Abriendo tus fotos…</>:<>{resuming?'Continuar revisión':'Empezar a revisar'}<CaretRightIcon size={20} weight="bold"/></>}</button>
    <div className="preparation-status">{warming?<><progress value={prepared.completed} max={Math.max(1,prepared.total)} aria-label="Archivos preparados para la sesión"/><p role="status">Dejando listas tus próximas fotos y vídeos.</p><button onClick={cancelWarmup}>Cancelar preparación</button></>:<p className="welcome-fine">Tu carrete. Tu criterio. Todo en tu iPhone.</p>}</div>
  </main>;
}
export function ManoApp() {
  const demo = !isNative; const key = demo ? 'mano-demo-v1' : 'mano-library-v1';
  const sessionKey=demo?DEMO_SESSION_KEY:LIBRARY_SESSION_KEY;
  const [saved]=useState(()=>readSession(sessionKey));const resumeContext=useRef(saved?.active?saved.context:undefined);
  const [state,setState] = useState<RecordState>(()=>saved?.record??readState(key));
  const [sessionOpen,setSessionOpen]=useState(saved?.active??false);
  const [revisit,setRevisit]=useState<string[]>(saved?.active?saved.context.handIds:[]);
  const [newAlbum,setNewAlbum]=useState('');const [creatingAlbum,setCreatingAlbum]=useState(false);
  const [pinnedInspect,setPinnedInspect]=useState(false);const [overHook,setOverHook]=useState(false);const hookHover=useRef(false);const inspectOrigin=useRef<InspectOrigin|undefined>(undefined);
  const stage=useRef<HTMLElement>(null);const [stageSize,setStageSize]=useState({width:340,height:440});
  const [assets,setAssets] = useState<Asset[]>(demo?demoAssets:[]);
  const [filter,setFilter] = useState<Filter>(saved?.filter??initialFilter);
  const [session,setSession] = useState(false); const [bundleAnchor,setBundleAnchor]=useState<{group:string;filterKey:string;members:string[]}|null>(null); const [rotated,setRotated] = useState<string[]>(saved?.active?saved.context.rotated:[]); const [selected,setSelected] = useState<string[]>(saved?.active?saved.context.selected:[]);
  const [sheet,setSheet] = useState<'filters'|'review'|'albums'|null>(null); const [albums,setAlbums] = useState<Album[]>([]);
  const [loading,setLoading] = useState(false); const [busy,setBusy] = useState(false); const [connected,setConnected] = useState(demo); const [limited,setLimited] = useState(false);
  const [notice,setNotice] = useState(''); const [error,setError] = useState(''); const [inspect,setInspect] = useState<Asset|null>(null);
  const [analyzing,setAnalyzing] = useState(false); const [progress,setProgress] = useState({done:0,total:0});
  const reduced = useReducedMotion(); const seed = useRef(saved?.seed??Math.floor(Math.random()*100000));
  const gesture = useRef<{x:number;y:number;held:boolean;timer:ReturnType<typeof setTimeout>|null;id:string;review:boolean}|null>(null);
  const [drag,setDrag] = useState({x:0,y:0});
  const analysisStarted=useRef('');
  const [warming,setWarming]=useState(false);
  const warmingNow=useRef(false);
  const deferredGroups=useRef<Map<string,string>|null>(null);
  const [prepared,setPrepared]=useState<PreloadSnapshot<PreparedMedia>>({items:[],total:0,ready:0,failed:0,loading:0,completed:0});
  const preloader=useRef<AssetPreloader<PreparedMedia>|null>(null);
  const preloadWindow=useRef<Asset[]>([]);
  const sessionNumber=useRef(0);
  const warmWait=useRef<(()=>void)|null>(null);
  const getPreloader=()=>preloader.current??(preloader.current=new AssetPreloader(prepareReviewAsset));
  const prepareWindow=(items:Asset[],sessionKey:string)=>{
    const wanted=new Set(items.map(a=>`${a.id}:${a.modified??0}`));
    const released=preloadWindow.current.filter(a=>a.kind==='video'&&!wanted.has(`${a.id}:${a.modified??0}`));
    const pool=getPreloader();pool.update(items,sessionKey);
    for(const asset of released)pool.forget(asset);
    if(!demo&&released.length)void Library.releasePreparedVideos({ids:released.map(a=>a.id)}).catch(()=>{});
    preloadWindow.current=items;
  };
  useEffect(()=>{
    const pool=getPreloader();const unsubscribe=pool.subscribe(setPrepared);
    return()=>{sessionNumber.current++;unsubscribe();pool.dispose();preloader.current=null;warmWait.current?.();if(!demo)void Library.releasePreparedVideos({ids:preloadWindow.current.filter(a=>a.kind==='video').map(a=>a.id)}).catch(()=>{});preloadWindow.current=[];};
  },[]);
  const waitPrepared=(pool:AssetPreloader<PreparedMedia>)=>new Promise<void>(resolve=>{
    let unsubscribe=()=>{};let done=false;
    const finish=()=>{if(done)return;done=true;unsubscribe();warmWait.current=null;resolve();};
    unsubscribe=pool.subscribe(snapshot=>{if(snapshot.completed===snapshot.total)queueMicrotask(finish);});warmWait.current=finish;
  });
  const cancelWarmup=()=>{sessionNumber.current++;warmingNow.current=false;prepareWindow([],String(sessionNumber.current));warmWait.current?.();setWarming(false);setLoading(false);const groups=deferredGroups.current;if(groups){deferredGroups.current=null;setAssets(prev=>prev.map(a=>({...a,group:groups.get(a.id)})));}};
  useEffect(()=>{document.title='CocoWash · Lo que importa, se queda';},[]);
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{setError('No hay espacio para guardar la sesión. Libera espacio antes de continuar.');}},[state,key]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),2600);return()=>clearTimeout(t);},[notice]);
  useEffect(()=>()=>{if(gesture.current?.timer)clearTimeout(gesture.current.timer);},[]);
  const initialLibrary=useRef<ReturnType<typeof Library.assets>|null>(null);
  useEffect(()=>{if(demo)return;let alive=true;const request=initialLibrary.current??(initialLibrary.current=Library.authorize().then(()=>Library.assets()));request.then(result=>{if(alive&&['authorized','limited'].includes(result.status)){setAssets(savedGroups(result.assets));setLimited(result.status==='limited');setConnected(true);setState(s=>reconcileLibrary(s,result.assets));}}).catch(messageError);return()=>{alive=false;};},[]);
  const queue = useMemo(()=>eligible(assets,state,filter,Date.now(),seed.current),[assets,state,filter,session]);
  const filterKey=JSON.stringify(filter);
  const sessionHand=useMemo(()=>nextSessionHand(assets,state,filter,Date.now(),seed.current),[assets,state,filter,session]);
  const pinned=bundleAnchor?.filterKey===filterKey?queue.filter(a=>bundleAnchor.members.includes(a.id)).slice(0,5):[];
  const revisited=revisit.map(id=>assets.find(a=>a.id===id)).filter((a):a is Asset=>!!a&&!state.pending.includes(a.id)&&!state.removed.includes(a.id)&&!state.favorites.includes(a.id));
  const baseHand=revisited.length?revisited:pinned.length?pinned:sessionHand;
  const bundleKey=baseHand.length>1?baseHand[0].group??null:null;
  const anchorKey=pinned.length?bundleAnchor!.group:baseHand.length>1?baseHand[0]?.group??null:null;
  useEffect(()=>{if(anchorKey&&(bundleAnchor?.group!==anchorKey||bundleAnchor?.filterKey!==filterKey))setBundleAnchor({group:anchorKey,filterKey,members:queue.filter(a=>a.group===anchorKey).map(a=>a.id)});else if(!anchorKey&&bundleAnchor)setBundleAnchor(null);},[anchorKey,filterKey,bundleAnchor?.group,bundleAnchor?.filterKey]);

  useEffect(()=>{if(!session)return;const frame=requestAnimationFrame(()=>document.getElementById('session-heading')?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame);},[session]);
  const hand=[...baseHand].sort((a,b)=>rotated.indexOf(a.id)-rotated.indexOf(b.id));
  const windowHandKey=baseHand.map(a=>`${a.id}:${a.modified??0}`).join('|');
  const upcoming=useMemo(()=>{
    const next=upcomingSessionAssets(assets,state,filter,Date.now(),seed.current);
    return [...baseHand,...next].filter((a,i,all)=>all.findIndex(b=>b.id===a.id)===i).slice(0,10);
  },[assets,state,filter,session,windowHandKey]);
  const upcomingKey=upcoming.map(a=>`${a.id}:${a.modified??0}`).join('|');
  useEffect(()=>{if(session&&!warming)prepareWindow(upcoming,String(sessionNumber.current));},[session,warming,upcomingKey]);
  const context={handIds:baseHand.map(a=>a.id),rotated:[...rotated],selected:[...selected],group:anchorKey??undefined,filter};
  const envelope:ActiveSession={version:1,active:sessionOpen,seed:seed.current,filter,context:session?context:resumeContext.current??context,updatedAt:Date.now(),record:state};
  const latest=useRef(envelope);latest.current=envelope;
  useEffect(()=>{if(!saveSession(sessionKey,latest.current))setError('No se pudo guardar el progreso. Libera espacio antes de continuar.');},[state,sessionOpen,filterKey,windowHandKey,rotated,selected,session]);
  useEffect(()=>{const persist=()=>saveSession(sessionKey,latest.current);document.addEventListener('visibilitychange',persist);window.addEventListener('pagehide',persist);return()=>{persist();document.removeEventListener('visibilitychange',persist);window.removeEventListener('pagehide',persist);};},[sessionKey]);
  useEffect(()=>{const element=stage.current;if(!element)return;const observer=new ResizeObserver(([entry])=>setStageSize({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(element);return()=>observer.disconnect();},[session]);
  const openFilters=()=>{setError('');setSheet('filters');};
  const active=hand[0]; const targetIds=selected.filter(id=>hand.some(a=>a.id===id)); const targets=targetIds.length?targetIds:active?[active.id]:[];
  const reviewAssets=assets.filter(a=>state.pending.includes(a.id));
  const checked=reviewedCount(assets,state);
  const messageError=(e:unknown)=>setError(e instanceof Error?e.message:'No se pudo completar la acción. Inténtalo de nuevo.');
  const connect=useCallback(async()=>{setLoading(true);setError('');try{
    const permission=await Library.authorize();if(!['authorized','limited'].includes(permission.status))throw new Error('Permite acceso a Fotos desde Ajustes para revisar tu carrete.');
    const result=await Library.assets();setAssets(savedGroups(result.assets));setState(s=>reconcileLibrary(s,result.assets));setLimited(result.status==='limited');setConnected(true);analysisStarted.current='';setNotice(result.status==='limited'?'Solo se muestran las fotos autorizadas.':'Tu carrete está listo.');return savedGroups(result.assets);
  }catch(e){messageError(e);return false;}finally{setLoading(false);}},[]);
  const beginSession=async()=>{
    if(loading||warming)return;
    let available=connected?assets:await connect();if(available===false)return;
    const record=connected?state:reconcileLibrary(state,available);
    const number=++sessionNumber.current;if(!sessionOpen){seed.current=Math.floor(Math.random()*100000);setRevisit([]);setRotated([]);setSelected([]);setState(s=>({...s,history:[]}));}
    warmingNow.current=true;setWarming(true);setError('');setNotice('');setBundleAnchor(null);
    if(!demo&&analyzing)void Library.cancelAnalysis().catch(()=>{});
    do {
      const groups=deferredGroups.current;if(groups){deferredGroups.current=null;available=available.map(a=>({...a,group:groups.get(a.id)}));setAssets(available);}
      const source:Asset[]=available;const first=revisit.map(id=>source.find(a=>a.id===id)).filter((a):a is Asset=>!!a&&!record.pending.includes(a.id)&&!record.removed.includes(a.id)&&!record.favorites.includes(a.id));
      prepareWindow([...first,...upcomingSessionAssets(available,record,filter,Date.now(),seed.current)].filter((a,i,all)=>all.findIndex(b=>b.id===a.id)===i).slice(0,10),String(number));
      await waitPrepared(getPreloader());if(number!==sessionNumber.current)return;
    } while(deferredGroups.current);
    const result=getPreloader().snapshot();warmingNow.current=false;setWarming(false);setSession(true);resumeContext.current=undefined;setSessionOpen(true);analysisStarted.current='';
    if(result.failed)setNotice(`${result.ready} archivos listos; ${result.failed} necesitan reintento o conexión a iCloud.`);
  };
  const closeSession=()=>{resumeContext.current=undefined;cancelWarmup();cancel();setSheet(null);setSession(false);setSessionOpen(false);setSelected([]);setRotated([]);setRevisit([]);setBundleAnchor(null);setState(s=>({...s,history:[]}));setNotice('Revisión guardada. Tus descartes te esperan.');};
  const act=async(action:'keep'|'discard'|'favorite',ids=targets)=>{if(busy||!ids.length)return;setBusy(true);setError('');setNotice(action==='favorite'?'Guardando en Favoritos…':'Guardando decisión…');try{
    if(action==='favorite'&&!demo)await Library.favorite({ids,value:true});
    setState(s=>decide(s,ids,action,Date.now(),context));setRevisit(previous=>previous.filter(id=>!ids.includes(id)));setPinnedInspect(false);setInspect(null);setSelected([]);setRotated([]);setNotice(action==='discard'?`${ids.length} a descartes · nada se borra aún`:action==='favorite'?'Añadida a Favoritos':`${ids.length} conservada${ids.length>1?'s':''}`);
  }catch(e){messageError(e);}finally{setBusy(false);}};
  const undoLast=async()=>{if(busy)return;const last=state.history.at(-1);if(!last){setNotice('Nada que deshacer. Al terminar podrás recuperar descartes.');return;}setBusy(true);try{
    let missing=0;
    if(last.action==='favorite'&&!demo){const result=await Library.favorite({ids:last.ids,value:false,ignoreMissing:true});missing=result.missing.length;}
    setState(undo);const previous=last.context;setRevisit(previous?.handIds??last.ids);setSelected(previous?.selected??[]);setRotated(previous?.rotated??[]);if(previous?.filter)setFilter(previous.filter);setBundleAnchor(previous?.group?{group:previous.group,filterKey:JSON.stringify(previous.filter??filter),members:previous.handIds}:null);setNotice(missing?'Decisión deshecha; algunos elementos ya no están disponibles.':'Última decisión deshecha');
    if(last.action==='favorite'&&!demo){const fresh=(await Library.assets()).assets;setAssets(savedGroups(fresh));setState(s=>reconcileLibrary(s,fresh));}
  }catch(e){messageError(e);}finally{setBusy(false);}};
  const cycle=()=>{if(active&&hand.length>1){const refocus=document.activeElement?.classList.contains('photo-card');setRotated(prev=>[...prev.filter(x=>x!==active.id),active.id]);if(refocus)requestAnimationFrame(()=>document.querySelector<HTMLElement>('.photo-card.front')?.focus({preventScroll:true}));}};
  const select=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const start=(e:PointerEvent,asset:Asset,review=false)=>{if(busy||(e.target as HTMLElement).closest('button'))return;e.currentTarget.setPointerCapture(e.pointerId);
    const element=e.currentTarget;const g={x:e.clientX,y:e.clientY,held:false,timer:null as ReturnType<typeof setTimeout>|null,id:asset.id,review};
    g.timer=setTimeout(()=>{g.held=true;if(!review){inspectOrigin.current=element.getBoundingClientRect();setPinnedInspect(false);hookHover.current=false;setOverHook(false);setInspect(asset);}},380);gesture.current=g;};
  const move=(e:PointerEvent)=>{const g=gesture.current;if(!g)return;const x=e.clientX-g.x,y=e.clientY-g.y;
    if(!g.held&&Math.hypot(x,y)>10&&g.timer){clearTimeout(g.timer);g.timer=null;}
    if(g.held&&!g.review){const box=document.querySelector('[data-inspection-hook]')?.getBoundingClientRect();hookHover.current=!!box&&e.clientX>=box.left-18&&e.clientX<=box.right+18&&e.clientY>=box.top-18&&e.clientY<=box.bottom+18;setOverHook(hookHover.current);}else if(!g.review&&!g.held||g.review&&g.held)setDrag({x,y});};
  const end=(e:PointerEvent)=>{const g=gesture.current;if(!g)return;if(g.timer)clearTimeout(g.timer);const x=e.clientX-g.x,y=e.clientY-g.y;
    gesture.current=null;setDrag({x:0,y:0});if(g.held&&!g.review&&hookHover.current){setPinnedInspect(true);}else{setPinnedInspect(false);setInspect(null);}
    if(g.review){if(g.held&&x>65){setState(s=>restore(s,g.id));setNotice('Foto recuperada');}return;}if(g.held)return;
    if(Math.abs(x)>65&&Math.abs(x)>Math.abs(y))void act(x>0?'keep':'discard');else if(y< -70&&Math.abs(y)>Math.abs(x))void act('favorite');
    else if(Math.hypot(x,y)<10){if(hand[0]?.id===g.id)cycle();else select(g.id);}};
  const cancel=()=>{if(gesture.current?.timer)clearTimeout(gesture.current.timer);gesture.current=null;setPinnedInspect(false);setInspect(null);setDrag({x:0,y:0});};
  const analyze=async()=>{if(analyzing)return;setAnalyzing(true);setError('');let listener:{remove():Promise<void>}|undefined;try{
    if(demo){setNotice('Los grupos de esta vista son de demostración.');return;}listener=await Library.addListener('analysisProgress',setProgress);
    const result=await Library.analyze({ids:assets.map(a=>a.id),threshold:.28});const groups=new Map(result.groups.flatMap((ids,i)=>ids.map(id=>[id,`vision-${i}`] as const)));
    localStorage.setItem('mano-similarity-v1',JSON.stringify(Object.fromEntries(groups)));
    if(!result.skipped&&!result.cancelled)localStorage.setItem('mano-analysis-complete-v1',libraryFingerprint(assets));else localStorage.removeItem('mano-analysis-complete-v1');
    if(warmingNow.current)deferredGroups.current=groups;else setAssets(prev=>prev.map(a=>({...a,group:groups.get(a.id)})));setNotice(`${result.cancelled?'Análisis detenido · ':''}${result.groups.length} grupos encontrados${result.skipped?` · ${result.skipped} sin descargar; puedes reintentar`:''}`);
  }catch(e){messageError(e);}finally{try{await listener?.remove();}finally{setAnalyzing(false);}}};
  const fingerprint=useMemo(()=>libraryFingerprint(assets),[assets]);
  useEffect(()=>{if(!demo&&connected&&!loading&&!warming&&!analyzing&&assets.length&&analysisStarted.current!==fingerprint&&localStorage.getItem('mano-analysis-complete-v1')!==fingerprint){analysisStarted.current=fingerprint;void analyze();}},[connected,fingerprint,loading,warming,analyzing]);
  const stopAnalysis=async()=>{try{await Library.cancelAnalysis();}catch(e){messageError(e);}};
  const createAlbum=async()=>{if(busy||!newAlbum.trim()||!targets.length)return;setBusy(true);setError('');setNotice('Creando álbum…');try{const result=demo?{album:{id:`demo-${Date.now()}`,title:newAlbum.trim()},added:targets.length}:await Library.createAlbum({title:newAlbum.trim(),ids:targets});setAlbums(a=>[result.album,...a]);setNewAlbum('');setCreatingAlbum(false);setSheet(null);setNotice(`Álbum ${result.album.title} creado`);}catch(e){messageError(e);}finally{setBusy(false);}};
  const openAlbums=async()=>{if(!targets.length)return;setSheet('albums');setCreatingAlbum(false);setNewAlbum('');setError('');try{setAlbums(demo&&albums.length?albums:demo?[{id:'viajes',title:'Viajes'},{id:'recuerdos',title:'Recuerdos'},{id:'familia',title:'Familia'}]:(await Library.albums()).albums);}catch(e){messageError(e);}};
  const addAlbum=async(album:Album)=>{setBusy(true);setNotice('Guardando en el álbum…');try{if(!demo)await Library.addToAlbum({ids:targets,albumId:album.id});setSheet(null);setNotice(`Añadida${targets.length>1?'s':''} a ${album.title}`);}catch(e){messageError(e);}finally{setBusy(false);}};
  const commitDelete=async()=>{if(busy)return;setBusy(true);setError('');setNotice('Esperando confirmación de Fotos…');const ids=reviewAssets.map(a=>a.id);try{
    const result=demo?{deleted:ids}:await Library.deleteAssets({ids});
    setState(s=>({...s,pending:s.pending.filter(id=>!result.deleted.includes(id)),removed:[...new Set([...s.removed,...result.deleted])],history:[]}));
    cancelWarmup();setRevisit([]);setSessionOpen(false);setSheet(null);setSession(false);setNotice(demo?'Borrado simulado. Tus fotos reales están intactas.':`${result.deleted.length} enviadas a Eliminado recientemente`);
  }catch(e){messageError(e);}finally{setBusy(false);}};
  const play=async(asset:Asset)=>{if(demo){setNotice('La reproducción real está disponible en el iPhone.');return;}try{await Library.preview({id:asset.id});}catch(e){messageError(e);}};
  const welcomeAssets=useMemo(()=>{const available=assets.filter(a=>!state.pending.includes(a.id)&&!state.favorites.includes(a.id)&&!state.removed.includes(a.id));const sample=[...available];for(let i=sample.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[sample[i],sample[j]]=[sample[j],sample[i]];}return sample.slice(0,15);},[assets,session]);
  const currentColor=drag.x>45?'keep':drag.x< -45?'discard':drag.y< -45?'favorite':'';
  const lastDecision=state.history.at(-1);
  return <div className={`mano-app ${isNative?'on-device':''} ${session?'in-session':'on-welcome'}`}>
    {!session?<Welcome assets={welcomeAssets} begin={beginSession} loading={loading} warming={warming} prepared={prepared} cancelWarmup={cancelWarmup} reduced={reduced} error={error} openFilters={openFilters} resuming={sessionOpen} notice={notice} clearError={()=>setError('')}/>:<div className="session-content" inert={pinnedInspect}>
    <header className="archive-header"><button id="filter-trigger" className="header-filters" onClick={openFilters}><SlidersHorizontalIcon size={20}/><span>Filtros</span></button><h1 id="session-heading" tabIndex={-1} className="header-brand"><BrandStatus message={error||notice||(analyzing?`Buscando parecidas · ${progress.done} / ${progress.total}`:'')} error={!!error} clear={()=>setError('')}/></h1><button id="review-trigger" className="finish" onClick={()=>{cancel();setError('');setSheet('review');}}><span>Terminar</span>{state.pending.length>0&&<><span className="finish-count" aria-hidden="true">{state.pending.length}</span><span className="sr-only">, {state.pending.length} descarte{state.pending.length===1?'':'s'}</span></>}</button></header>
    <div className="archive-progress">{limited&&<span className="access-indicator">Acceso limitado</span>}<progress value={checked} max={Math.max(1,assets.length)} aria-label={`Revisados ${checked} de ${assets.length} elementos`}/><span className="progress-count" aria-hidden="true">{checked}<span>/{assets.length}</span></span></div>
    <section ref={stage} className={`hand-space ${currentColor}`} aria-label="Pila de recuerdos">
      {!connected?<div className="empty-state"><span className="empty-icon"><FolderOpenIcon size={32}/></span><h2>Tu carrete, en tus manos.</h2><p>Revisa, conserva y ordena tus recuerdos. Nada se borra sin tu confirmación.</p><button className="primary-empty" onClick={connect} disabled={loading}>{loading?'Abriendo Fotos…':'Abrir mi biblioteca'}</button><small>Todo se analiza en tu iPhone.</small></div>:!active?<div className="empty-state"><img className="empty-mascot" src="/assets/cocowash.svg" alt="" draggable={false}/><h2>Todo en su sitio.</h2><p>{state.pending.length?'Tus descartes te esperan en Terminar.':'No quedan fotos pendientes con estos filtros.'}</p><button className="primary-empty" onClick={()=>setSheet('filters')}>Cambiar filtros</button>{!demo&&<button className="text-button" onClick={connect}>Actualizar biblioteca</button>}</div>:<div className="polaroid-stack" data-testid="photo-hand">
        <AnimatePresence>{bundleKey&&<motion.div className="bundle-arrival" key={bundleKey} initial={reduced?false:{opacity:0,scale:.94,y:-6}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}} transition={{duration:.24,ease:[.2,.8,.2,1]}} role="status"><StackIcon size={15} weight="bold"/><span>{hand.length} parecidas</span></motion.div>}</AnimatePresence>
        {bundleKey&&!reduced&&<motion.div key={`flash-${bundleKey}`} className="bundle-flash" initial={{opacity:0}} animate={{opacity:[0,.14,0]}} transition={{duration:.5}}/>}
        <AnimatePresence custom={lastDecision}>{[...hand].reverse().map(asset=>{const ratio=Math.max(.05,asset.width/Math.max(1,asset.height));const imageWidth=Math.max(20,Math.min(stageSize.width-44,(stageSize.height-64)*ratio));const cardWidth=imageWidth+16;const cardHeight=imageWidth/ratio+38;const index=hand.indexOf(asset),picked=targetIds.includes(asset.id),angle=index===0?0:index%2?3+index:-3-index;
          const kindLabel=asset.kind==='video'?'Vídeo':asset.kind==='live'?'Live Photo':'Foto';
          return <motion.article key={asset.id} inert={index!==0} data-testid={`card-${asset.id}`} className={`photo-card paper ${index===0?'front':''} ${picked?'picked':''}`} style={{zIndex:20-index,width:cardWidth,height:cardHeight} as CSSProperties}
            initial={reduced?false:{opacity:0,y:16,scale:.97}} animate={{opacity:1,x:(index===0?0:index%2?8:-8)+(index===0||picked?drag.x:0),y:-index*6+(index===0||picked?drag.y*.55:0),rotate:angle+(index===0?drag.x*.035:0),scale:1-index*.018}}
            variants={{leave:(decision?:Decision)=>cardExit(asset.id,decision,reduced)}} exit="leave"
            transition={reduced?{duration:0}:{type:'spring',stiffness:380,damping:34}}
            onPointerDown={e=>start(e,asset)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onContextMenu={e=>e.preventDefault()}
            tabIndex={index===0?0:-1} aria-hidden={index!==0} aria-label={`${kindLabel} ${index+1} de ${hand.length}${picked?', seleccionada':''}. Intro para ver la siguiente; espacio para seleccionar.`} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key===' '){e.preventDefault();select(asset.id);}if(e.key==='Enter'){e.preventDefault();index===0?cycle():select(asset.id);}}}>
            <div className="photo-window">{asset.kind==='video'&&index===0?<InlineVideo asset={asset} prepared={preloader.current?.get(asset)} failed={prepared.items.some(i=>i.id===asset.id&&i.status==='error')} retry={()=>getPreloader().retry(asset)} fullscreen={()=>void play(asset)}><Photo asset={asset} prepared={preloader.current?.get(asset)?.poster}/></InlineVideo>:<Photo asset={asset} prepared={preloader.current?.get(asset)?.poster}/>}</div><button tabIndex={index===0?0:-1} className={`pick-toggle ${picked?'selected':''}`} aria-label={`${picked?'Deseleccionar':'Seleccionar'} ${kindLabel.toLowerCase()} ${index+1}`} aria-pressed={picked} onPointerDown={e=>e.stopPropagation()} onClick={()=>select(asset.id)}><CheckIcon size={16} weight="bold"/></button>
            {index===0&&<button className="expand-photo" aria-label="Ampliar y anclar" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();inspectOrigin.current=e.currentTarget.closest('article')!.getBoundingClientRect();setPinnedInspect(true);setInspect(asset);}}><CornersOutIcon size={18} weight="bold"/></button>}{state.marks[asset.id]&&<Seal level={state.marks[asset.id].level}/>}{asset.kind==='live'&&<button className="media-play" onPointerDown={e=>e.stopPropagation()} onClick={()=>play(asset)} aria-label="Reproducir Live Photo"><PlayIcon weight="fill" size={14}/>{asset.kind==='live'?'LIVE':`${Math.floor(asset.duration)} s`}</button>}
          </motion.article>;
        })}</AnimatePresence>{currentColor&&<span className={`drag-label ${currentColor}`} aria-hidden="true" style={{opacity:Math.min(1,.4+Math.max(Math.abs(drag.x),Math.abs(drag.y))/120)}}>{currentColor==='keep'?'Conservar':currentColor==='discard'?'Descartar':'Favorita'}</span>}
      </div>}
    </section>
    <div className="bundle-controls">{hand.length>1?<div className="segmented"><button onClick={()=>setSelected(targetIds.length===hand.length?[]:hand.map(a=>a.id))}>{targetIds.length===hand.length?'Quitar selección':'Elegir todas'}</button><button onClick={cycle} aria-label="Ver la siguiente foto del grupo"><ArrowClockwiseIcon size={16}/>Siguiente</button></div>:null}</div>
    {targetIds.length>0&&<div className="selection-caption">{targetIds.length} seleccionada{targetIds.length===1?'':'s'}</div>}
    <div className="decision-buttons"><button className="discard" disabled={!active||busy} onClick={()=>act('discard')}><CaretLeftIcon size={18} weight="bold"/><span>Descartar</span></button><button className="keep" disabled={!active||busy} onClick={()=>act('keep')}><span>Conservar</span><CaretRightIcon size={18} weight="bold"/></button></div>
    <footer className="archive-tools"><button onClick={undoLast} disabled={busy} aria-label="Deshacer la última decisión"><span className="tool-icon"><ArrowUUpLeftIcon size={22}/></span><span>Deshacer</span></button><button className="favorite" aria-label={targets.length>1?`Añadir ${targets.length} a Favoritos`:'Añadir a Favoritos'} disabled={!active||busy} onClick={()=>act('favorite')}><span className="tool-icon"><HeartStraightIcon size={24} weight="bold"/></span><span>Favorita</span></button><button id="album-trigger" onClick={openAlbums} disabled={!active||busy}><span className="tool-icon"><FolderSimplePlusIcon size={22}/></span><span>Álbum</span></button></footer>
    </div>}
    {inspect&&<Inspector asset={inspect} src={preloader.current?.get(inspect)?.poster} pinned={pinnedInspect} overHook={overHook} origin={inspectOrigin.current} geek={!!filter.geek} close={()=>{setPinnedInspect(false);setInspect(null);}} pin={()=>setPinnedInspect(true)}/>}
    <Sheet open={sheet==='filters'} close={()=>setSheet(null)} title="Tu forma de revisar" description="Elige qué entra en la pila. Los cambios se aplican al pulsar el botón final." error={error} returnTo="filter-trigger">
      <Filters filter={filter} assets={assets} state={state} apply={value=>{resumeContext.current=undefined;setFilter(value);setSelected([]);setRotated([]);setRevisit([]);setBundleAnchor(null);setSheet(null);setNotice('Filtros actualizados');}} analyze={analyze} analyzing={analyzing} progress={progress} stop={stopAnalysis} refresh={connect}/>
      {demo&&<button className="sheet-action secondary" onClick={()=>{setState({marks:{},pending:[],favorites:[],removed:[],history:[]});setSessionOpen(false);setSession(false);setRevisit([]);setFilter(initialFilter);setSelected([]);setRotated([]);setSheet(null);setNotice('Demostración reiniciada');}}>Reiniciar demostración</button>}
    </Sheet>
    <Sheet open={sheet==='albums'} close={()=>setSheet(null)} title="Guardar en un álbum" description="Las fotos seguirán también en tu carrete." error={error} returnTo="album-trigger"><p className="sheet-intro"><strong>{targets.length}</strong> seleccionada{targets.length>1?'s':''}</p><button className="album-row album-new" onClick={()=>setCreatingAlbum(v=>!v)} disabled={busy}><span className="row-icon"><PlusIcon size={20} weight="bold"/></span>Crear álbum nuevo</button>{creatingAlbum&&<div className="new-album"><label className="field">Nombre del álbum<AlbumInput value={newAlbum} change={setNewAlbum}/></label><button className="sheet-action" onClick={createAlbum} disabled={busy||!newAlbum.trim()}>Crear y añadir {targets.length} elemento{targets.length===1?'':'s'}</button></div>}{albums.map(a=><button className="album-row" key={a.id} onClick={()=>addAlbum(a)} disabled={busy}><span className="row-icon"><FolderOpenIcon size={20}/></span>{a.title}<CaretRightIcon size={16} weight="bold"/></button>)}</Sheet>
    <Sheet open={sheet==='review'} close={()=>setSheet(null)} title="Una última mirada" description="Repasa tus descartes. Nada se borra hasta que lo confirmes en Fotos." error={error} returnTo={session?'review-trigger':'start-trigger'}><p className="sheet-intro">{reviewAssets.length?<><strong>{reviewAssets.length} descarte{reviewAssets.length===1?'':'s'}</strong> · aún no se ha borrado nada.</>:'No tienes descartes pendientes.'}</p>
      {reviewAssets.length>0&&<><p className="review-hint">Mantén pulsada una foto y deslízala a la derecha para recuperarla.</p><Carousel ariaLabel="Revisar descartes" draggingEnabled={false} className="review-carousel"><div className="review-grid">{reviewAssets.map(a=><article key={a.id} className="review-card paper" onPointerDown={e=>start(e,a,true)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} style={gesture.current?.id===a.id?{transform:`translateX(${Math.max(0,drag.x)}px)`}:undefined}><div className="review-photo"><Photo asset={a}/></div><button className="recover-button" onPointerDown={e=>e.stopPropagation()} onClick={()=>{setState(s=>restore(s,a.id));setNotice('Elemento recuperado');}}><ArrowCounterClockwiseIcon size={16}/>Recuperar</button></article>)}</div></Carousel>
        <div className="review-primary"><button className="sheet-action danger" onClick={commitDelete} disabled={busy}><TrashIcon size={20}/>{busy?'Esperando a Fotos…':`Eliminar ${reviewAssets.length}`}</button><p className="sheet-fine">Fotos te pedirá confirmación. Lo eliminado queda en «Eliminado» durante 30 días y el cambio también se aplica en iCloud y tus dispositivos sincronizados.</p><button className="sheet-action quiet" disabled={busy} onClick={()=>{setState(s=>({...s,pending:[],history:s.history.filter(d=>d.action!=='discard')}));setNotice('Todos los descartes recuperados');}}><ArrowCounterClockwiseIcon size={18}/>Deshacer todo</button></div></>}
      <div className="sheet-footer"><button className="sheet-action secondary" onClick={()=>setSheet(null)} disabled={busy}>Seguir revisando</button><button className={`sheet-action ${reviewAssets.length?'secondary':''}`} onClick={closeSession} disabled={busy}>{reviewAssets.length?'Terminar sin eliminar':'Terminar revisión'}</button></div>
    </Sheet>
  </div>;
}
