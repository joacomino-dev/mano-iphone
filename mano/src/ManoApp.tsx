import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FolderOpenIcon, CaretRightIcon, CaretLeftIcon, StampIcon, ArrowCounterClockwiseIcon, HeartIcon, ImagesIcon, TrashIcon, ArchiveIcon, CheckIcon, XIcon, PlayIcon, CircleNotchIcon, SlidersHorizontalIcon, ArrowClockwiseIcon, CloudSlashIcon } from '@phosphor-icons/react';
import { BottomSheet, Carousel } from './mobile';
import { decide, undo, restore, eligible, nextHand, readState, LEVELS, initialFilter, type Asset, type Filter, type RecordState } from './domain';
import { Library, isNative, demoAssets, thumbnail, type Album } from './library';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
const colors = ['#e8e1cc', '#b83930', '#36836e', '#272b2b', '#3969b7', '#8056ab', '#d68637', '#b69942'];
const ranks = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function savedGroups(items: Asset[]) {
  try { const groups = JSON.parse(localStorage.getItem('mano-similarity-v1') || '{}') as Record<string,string>; return items.map(a=>({...a,group:groups[a.id]})); } catch { return items; }
}
function Photo({ asset }: { asset: Asset }) {
  const [src, setSrc] = useState(''); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { let alive = true; setError(false); setSrc(''); thumbnail(asset).then(s => { if (alive) setSrc(s); }).catch(() => { if (alive) setError(true); }); return () => { alive = false; }; }, [asset.id, retry]);
  return src ? <img src={src} alt={asset.kind === 'video' ? 'Vista previa de vídeo' : 'Foto del carrete'} draggable={false} style={asset.demo ? { objectPosition: `${40 + Number(asset.id.split('-')[1]) % 5 * 5}% center`, transform: `scale(${1 + Number(asset.id.split('-')[1]) % 5 * .025})` } : undefined}/> : <div className="photo-loading">{error ? <><CloudSlashIcon size={28}/><span>No se pudo descargar</span><button onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setRetry(v=>v+1);}}>Reintentar</button></> : <CircleNotchIcon className="spinner" size={28}/>}</div>;
}
function Seal({ level }: { level: number }) {
  return <span className="seal" style={{ '--seal-color': colors[level-1] } as CSSProperties} aria-label={`Conservada, sello ${LEVELS[level-1]}`}><img src="/assets/stamp-red.png" alt=""/><b>{ranks[level-1]}</b></span>;
}
function Sheet({ open, close, title, children, error }: { open: boolean; close: () => void; title: string; children: ReactNode; error?: string }) {
  const content=<div className="mano-sheet-body">{error&&<p className="sheet-error" role="alert">{error}</p>}{children}</div>;
  if (!isNative) return <BottomSheet open={open} onOpenChange={v=>!v&&close()} title={title} description="Organiza tu biblioteca sin perder el control de tus decisiones." snap={.85}>{content}</BottomSheet>;
  return open ? <div className="native-shade" onClick={close}><section className="native-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><header><h2>{title}</h2><button aria-label="Cerrar" onClick={close}><XIcon size={24}/></button></header>{content}</section></div> : null;
}
export function ManoApp() {
  const demo = !isNative; const key = demo ? 'mano-demo-v1' : 'mano-library-v1';
  const [state,setState] = useState<RecordState>(()=>readState(key));
  const [assets,setAssets] = useState<Asset[]>(demo?demoAssets:[]);
  const [filter,setFilter] = useState<Filter>(initialFilter);
  const [similar,setSimilar] = useState(true); const [rotated,setRotated] = useState<string[]>([]); const [selected,setSelected] = useState<string[]>([]);
  const [sheet,setSheet] = useState<'filters'|'review'|'albums'|null>(null); const [albums,setAlbums] = useState<Album[]>([]);
  const [loading,setLoading] = useState(false); const [busy,setBusy] = useState(false); const [connected,setConnected] = useState(demo); const [limited,setLimited] = useState(false);
  const [notice,setNotice] = useState(''); const [error,setError] = useState(''); const [inspect,setInspect] = useState<Asset|null>(null);
  const [analyzing,setAnalyzing] = useState(false); const [progress,setProgress] = useState({done:0,total:0}); const [deleteConfirm,setDeleteConfirm] = useState(false);
  const reduced = useReducedMotion(); const seed = useRef(Math.floor(Math.random()*100000));
  const gesture = useRef<{x:number;y:number;held:boolean;timer:ReturnType<typeof setTimeout>|null;id:string;review:boolean}|null>(null);
  const [drag,setDrag] = useState({x:0,y:0});
  const analysisStarted=useRef(false);
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{setError('No hay espacio para guardar la sesión. Libera espacio antes de continuar.');}},[state,key]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),2600);return()=>clearTimeout(t);},[notice]);
  useEffect(()=>()=>{if(gesture.current?.timer)clearTimeout(gesture.current.timer);},[]);
  useEffect(()=>{if(demo)return;let alive=true;Library.assets().then(result=>{if(alive&&['authorized','limited'].includes(result.status)){setAssets(savedGroups(result.assets));setLimited(result.status==='limited');setConnected(true);setState(s=>({...s,favorites:s.favorites.filter(id=>!result.assets.some(a=>a.id===id))}));}}).catch(messageError);return()=>{alive=false;};},[]);
  const queue = useMemo(()=>eligible(assets,state,filter,Date.now(),seed.current),[assets,state,filter]);
  const hand = useMemo(()=>nextHand(queue,similar).sort((a,b)=>rotated.indexOf(a.id)-rotated.indexOf(b.id)),[queue,similar,rotated]);
  const active=hand[0]; const targetIds=selected.filter(id=>hand.some(a=>a.id===id)); const targets=targetIds.length?targetIds:active?[active.id]:[];
  const reviewAssets=assets.filter(a=>state.pending.includes(a.id));
  const checked=assets.length-eligible(assets,state,{...initialFilter,includeWaiting:true}).length;
  const messageError=(e:unknown)=>setError(e instanceof Error?e.message:'No se pudo completar la acción. Inténtalo de nuevo.');
  const connect=useCallback(async()=>{setLoading(true);setError('');try{
    const permission=await Library.authorize();if(!['authorized','limited'].includes(permission.status))throw new Error('Permite acceso a Fotos desde Ajustes para revisar tu carrete.');
    const result=await Library.assets();setAssets(savedGroups(result.assets));setState(s=>({...s,favorites:s.favorites.filter(id=>!result.assets.some(a=>a.id===id))}));setLimited(result.status==='limited');setConnected(true);setNotice(result.status==='limited'?'Solo se muestran las fotos autorizadas.':'Tu carrete está listo.');
  }catch(e){messageError(e);}finally{setLoading(false);}},[]);
  const act=async(action:'keep'|'discard'|'favorite',ids=targets)=>{if(busy||!ids.length)return;setBusy(true);setError('');try{
    if(action==='favorite'&&!demo)await Library.favorite({ids,value:true});
    setState(s=>decide(s,ids,action));setSelected([]);setRotated([]);setNotice(action==='discard'?`${ids.length} en revisión. Aún no se ha borrado nada.`:action==='favorite'?'Añadida a Favoritos':`${ids.length} conservada${ids.length>1?'s':''}`);
  }catch(e){messageError(e);}finally{setBusy(false);}};
  const undoLast=async()=>{if(busy)return;const last=state.history.at(-1);if(!last)return;setBusy(true);try{
    if(last.action==='favorite'&&!demo){await Library.favorite({ids:last.ids,value:false});setAssets(savedGroups((await Library.assets()).assets));}setState(undo);setSelected([]);setRotated([]);setNotice('Última decisión deshecha');
  }catch(e){messageError(e);}finally{setBusy(false);}};
  const cycle=()=>{if(active&&hand.length>1)setRotated(prev=>[...prev.filter(x=>x!==active.id),active.id]);};
  const select=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const start=(e:PointerEvent,asset:Asset,review=false)=>{if(busy||(e.target as HTMLElement).closest('button'))return;e.currentTarget.setPointerCapture(e.pointerId);
    const g={x:e.clientX,y:e.clientY,held:false,timer:null as ReturnType<typeof setTimeout>|null,id:asset.id,review};
    g.timer=setTimeout(()=>{g.held=true;if(!review)setInspect(asset);},380);gesture.current=g;};
  const move=(e:PointerEvent)=>{const g=gesture.current;if(!g)return;const x=e.clientX-g.x,y=e.clientY-g.y;
    if(!g.held&&Math.hypot(x,y)>10&&g.timer){clearTimeout(g.timer);g.timer=null;}
    if(!g.review&&!g.held||g.review&&g.held)setDrag({x,y});};
  const end=(e:PointerEvent)=>{const g=gesture.current;if(!g)return;if(g.timer)clearTimeout(g.timer);const x=e.clientX-g.x,y=e.clientY-g.y;
    gesture.current=null;setDrag({x:0,y:0});setInspect(null);
    if(g.review){if(g.held&&x>65){setState(s=>restore(s,g.id));setNotice('Foto recuperada');}return;}if(g.held)return;
    if(Math.abs(x)>65&&Math.abs(x)>Math.abs(y))void act(x>0?'keep':'discard');else if(y< -70&&Math.abs(y)>Math.abs(x))void act('favorite');
    else if(Math.hypot(x,y)<10){if(hand[0]?.id===g.id)cycle();else select(g.id);}};
  const cancel=()=>{if(gesture.current?.timer)clearTimeout(gesture.current.timer);gesture.current=null;setInspect(null);setDrag({x:0,y:0});};
  const analyze=async()=>{if(analyzing)return;setAnalyzing(true);setError('');let listener:{remove():Promise<void>}|undefined;try{
    if(demo){setNotice('Los grupos de esta vista son de demostración.');return;}listener=await Library.addListener('analysisProgress',setProgress);
    const result=await Library.analyze({ids:assets.map(a=>a.id),threshold:.28});const groups=new Map(result.groups.flatMap((ids,i)=>ids.map(id=>[id,`vision-${i}`] as const)));
    localStorage.setItem('mano-similarity-v1',JSON.stringify(Object.fromEntries(groups)));setAssets(prev=>prev.map(a=>({...a,group:groups.get(a.id)})));setNotice(`${result.groups.length} grupos encontrados${result.skipped?` · ${result.skipped} sin descargar`:''}`);
  }catch(e){messageError(e);}finally{await listener?.remove();setAnalyzing(false);}};
  useEffect(()=>{if(!demo&&connected&&assets.length&&!analysisStarted.current&&!localStorage.getItem('mano-similarity-v1')){analysisStarted.current=true;void analyze();}},[connected,assets.length]);
  const openAlbums=async()=>{if(!targets.length)return;setSheet('albums');setError('');try{setAlbums(demo?[{id:'viajes',title:'Viajes'},{id:'recuerdos',title:'Recuerdos'},{id:'familia',title:'Familia'}]:(await Library.albums()).albums);}catch(e){messageError(e);}};
  const addAlbum=async(album:Album)=>{setBusy(true);try{if(!demo)await Library.addToAlbum({ids:targets,albumId:album.id});setSheet(null);setNotice(`Añadida${targets.length>1?'s':''} a ${album.title}`);}catch(e){messageError(e);}finally{setBusy(false);}};
  const commitDelete=async()=>{if(busy)return;setBusy(true);setError('');const ids=reviewAssets.map(a=>a.id);try{
    const result=demo?{deleted:ids}:await Library.deleteAssets({ids});
    setState(s=>({...s,pending:s.pending.filter(id=>!result.deleted.includes(id)),removed:[...new Set([...s.removed,...result.deleted])],history:[]}));
    setDeleteConfirm(false);setSheet(null);setNotice(demo?'Borrado simulado. Tus fotos reales están intactas.':`${result.deleted.length} enviadas a Eliminado recientemente`);
  }catch(e){messageError(e);}finally{setBusy(false);}};
  const play=async(asset:Asset)=>{if(demo){setNotice('La reproducción real está disponible en el iPhone.');return;}try{await Library.preview({id:asset.id});}catch(e){messageError(e);}};
  const currentColor=drag.x>45?'keep':drag.x< -45?'discard':drag.y< -45?'favorite':'';
  return <div className={`mano-app ${isNative?'on-device':''}`}>
    <header className="archive-header paper"><FolderOpenIcon size={31} weight="fill" aria-hidden="true"/><div className="archive-brand">MANO /<br/>ARCHIVO PERSONAL</div><button className="finish" onClick={()=>{setDeleteConfirm(false);setSheet('review');}}>Terminar<CaretRightIcon size={20}/></button></header>
    <nav className="archive-tabs" aria-label="Modo de revisión"><button className={!similar?'active paper':''} onClick={()=>{setSimilar(false);setSelected([]);setRotated([]);}} aria-pressed={!similar}>Una a una</button><button className={similar?'active paper':''} onClick={()=>{setSimilar(true);setSelected([]);setRotated([]);}} aria-pressed={similar}>Similares</button><button className="seal-filter" onClick={()=>setSheet('filters')}><StampIcon weight="fill" size={20}/>Sellos</button></nav>
    <div className="archive-progress"><div><span>{active?hand.length>1?`${hand.length} fotos de un mismo momento`:'Un recuerdo a la vez':'Tu archivo personal'}</span><small>{demo?'DEMO':limited?'ACCESO LIMITADO':`${checked} / ${assets.length}`}</small></div><progress value={checked} max={Math.max(1,assets.length)} aria-label="Fotos revisadas"/></div>
    {error&&<div className="error-note" role="alert">{error}<button onClick={()=>setError('')} aria-label="Cerrar aviso"><XIcon/></button></div>}
    <section className={`hand-space ${currentColor}`} aria-label="Mano de fotos">
      {!connected?<div className="empty-state"><FolderOpenIcon size={48}/><h1>Tu carrete, en tus manos.</h1><p>Revisa, conserva y ordena tus recuerdos. Los descartes esperan tu confirmación.</p><button className="paper primary-empty" onClick={connect} disabled={loading}>{loading?'Abriendo Fotos…':'Abrir mi biblioteca'}</button><small>Todo se analiza en tu iPhone.</small></div>:!active?<div className="empty-state"><CheckIcon size={48}/><h1>Todo en su sitio.</h1><p>{state.pending.length?'Tus descartes te esperan en Terminar.':'No quedan fotos pendientes con estos filtros.'}</p><button className="paper primary-empty" onClick={()=>setSheet('filters')}>Cambiar filtros</button>{!demo&&<button className="text-button" onClick={connect}>Actualizar biblioteca</button>}</div>:<div className="fan" data-testid="photo-hand">
        <AnimatePresence initial={false}>{[...hand].reverse().map(asset=>{const index=hand.indexOf(asset),picked=targetIds.includes(asset.id),angle=index===0?-5:index*4-4;
          return <motion.article key={asset.id} data-testid={`card-${asset.id}`} className={`photo-card paper ${index===0?'front':''} ${picked?'picked':''}`} style={{zIndex:20-index} as CSSProperties}
            initial={reduced?false:{opacity:0,y:20}} animate={{opacity:1,x:index*18+(index===0||picked?drag.x:0),y:index*(-2)+(index===0||picked?drag.y*.55:0),rotate:angle+(index===0?drag.x*.035:0),scale:1-index*.025}}
            exit={reduced?{opacity:0}:{opacity:0,x:180,rotate:14}} transition={{type:'spring',stiffness:370,damping:32}}
            onPointerDown={e=>start(e,asset)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onContextMenu={e=>e.preventDefault()}
            tabIndex={0} aria-label={`Foto ${index+1}${picked?', seleccionada':''}. Centro para pasar; borde para seleccionar.`} onKeyDown={e=>{if(e.key===' '){e.preventDefault();select(asset.id);}if(e.key==='Enter'){e.preventDefault();index===0?cycle():select(asset.id);}}}>
            <div className="photo-window"><Photo asset={asset}/></div><button className={`pick-toggle ${picked?'selected':''}`} aria-label={`${picked?'Deseleccionar':'Seleccionar'} foto ${index+1}`} aria-pressed={picked} onPointerDown={e=>e.stopPropagation()} onClick={()=>select(asset.id)}><CheckIcon size={18} weight="bold"/></button>
            {state.marks[asset.id]&&<Seal level={state.marks[asset.id].level}/>}{asset.kind!=='photo'&&<button className="media-play" onPointerDown={e=>e.stopPropagation()} onClick={()=>play(asset)} aria-label={asset.kind==='video'?'Reproducir vídeo':'Reproducir Live Photo'}><PlayIcon weight="fill" size={16}/>{asset.kind==='live'?'LIVE':`${Math.floor(asset.duration)} s`}</button>}
          </motion.article>;
        })}</AnimatePresence>{currentColor&&<span className={`drag-label ${currentColor}`}>{currentColor==='keep'?'CONSERVAR':currentColor==='discard'?'REVISAR':'FAVORITA'}</span>}
      </div>}
    </section>
    <div className="selection-caption"><span/>{targetIds.length?`${targetIds.length} SELECCIONADAS`:hand.length>1?'TOCA EL CENTRO PARA PASAR':active?'DESLIZA PARA DECIDIR':'SIN PRISA, RECUERDO A RECUERDO'}<span/></div>
    <div className="decision-buttons"><button className="discard" disabled={!active||busy} onClick={()=>act('discard')}><TrashIcon size={23}/><span>Descartar</span><CaretLeftIcon size={23}/></button><button className="keep paper" disabled={!active||busy} onClick={()=>act('keep')}><ArchiveIcon size={24} weight="fill"/><span>Conservar</span><CaretRightIcon size={23}/></button></div>
    <p className="hold-hint">{analyzing?`Buscando similares · ${progress.done} / ${progress.total}`:'Mantén pulsado para ver sin sello'}</p><footer className="archive-tools"><button onClick={undoLast} disabled={!state.history.length||busy}><ArrowCounterClockwiseIcon size={29}/><span>Deshacer</span></button><button className="favorite" aria-label="Marcar como favorita" disabled={!active||busy} onClick={()=>act('favorite')}><HeartIcon size={31} weight="fill"/></button><button onClick={openAlbums} disabled={!active||busy}><ImagesIcon size={29}/><span>Álbum</span></button></footer>
    <AnimatePresence>{notice&&<motion.div className="toast" role="status" key={notice} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}>{notice}</motion.div>}</AnimatePresence>
    {inspect&&<div className="inspect-overlay" aria-label="Foto sin sello"><Photo asset={inspect}/><p>Suelta para volver a la mano</p></div>}
    <Sheet open={sheet==='filters'} close={()=>setSheet(null)} title="Tu forma de revisar" error={error}>
      <p className="sheet-intro">Primero, las fotos sin sello. Las conservadas descansan antes de volver.</p>
      <label className="field">Orden<select value={filter.order} onChange={e=>setFilter(f=>({...f,order:e.target.value as Filter['order']}))}><option value="oldest">Más antiguas primero</option><option value="newest">Más recientes primero</option><option value="random">Aleatorio</option></select></label>
      <label className="field">Tipo<select value={filter.media} onChange={e=>setFilter(f=>({...f,media:e.target.value as Filter['media']}))}><option value="all">Fotos, vídeos y Live Photos</option><option value="photo">Solo fotos</option><option value="video">Solo vídeos</option><option value="live">Solo Live Photos</option></select></label>
      <label className="field">Sello<select value={filter.seal} onChange={e=>setFilter(f=>({...f,seal:['all','none'].includes(e.target.value)?e.target.value as 'all'|'none':Number(e.target.value)}))}><option value="all">Todos los sellos</option><option value="none">Sin sello</option>{LEVELS.map((l,i)=><option key={l} value={i+1}>{ranks[i]} · {l}</option>)}</select></label>
      <label className="check-field"><input type="checkbox" checked={filter.includeWaiting} onChange={e=>setFilter(f=>({...f,includeWaiting:e.target.checked}))}/>Incluir las que están descansando</label><p className="sheet-fine">Al elegir un sello concreto puedes revisar ese nivel aunque esté descansando.</p>
      <button className="sheet-action" onClick={analyze} disabled={analyzing||!connected}><SlidersHorizontalIcon size={20}/>{analyzing?`Analizando ${progress.done} / ${progress.total}…`:'Buscar fotos visualmente similares'}</button><p className="sheet-fine">Análisis local de miniaturas. Los grupos son sugerencias; tú decides. Los originales de iCloud pueden necesitar conexión.</p>
      {!demo&&<button className="sheet-action secondary" onClick={connect} disabled={loading}><ArrowClockwiseIcon size={20}/>Actualizar biblioteca</button>}{demo&&<button className="sheet-action secondary" onClick={()=>{setState({marks:{},pending:[],favorites:[],removed:[],history:[]});setFilter(initialFilter);setSelected([]);setRotated([]);setSheet(null);setNotice('Demostración reiniciada');}}>Reiniciar demostración</button>}<button className="sheet-action" onClick={()=>setSheet(null)}>Volver a mi mano</button>
    </Sheet>
    <Sheet open={sheet==='albums'} close={()=>setSheet(null)} title="Guardar en un álbum" error={error}><p className="sheet-intro">{targets.length} seleccionada{targets.length>1?'s':''}. Seguirán también en el carrete.</p>{albums.length?albums.map(a=><button className="album-row" key={a.id} onClick={()=>addAlbum(a)} disabled={busy}><FolderOpenIcon size={24}/>{a.title}<CaretRightIcon size={18}/></button>):<p>Cargando álbumes… Si no aparece ninguno, crea uno en Fotos.</p>}</Sheet>
    <Sheet open={sheet==='review'} close={()=>setSheet(null)} title="Una última mirada" error={error}><p className="sheet-intro">{reviewAssets.length?`${reviewAssets.length} descarte${reviewAssets.length===1?'':'s'}. Aún no se ha borrado nada.`:'No tienes descartes pendientes.'}</p>
      {reviewAssets.length>0&&<><p className="review-hint">Mantén pulsada una foto y deslízala a la derecha para recuperarla.</p><Carousel ariaLabel="Revisar descartes" draggingEnabled={false} className="review-carousel"><div className="review-grid">{reviewAssets.map(a=><article key={a.id} className="review-card paper" onPointerDown={e=>start(e,a,true)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} style={gesture.current?.id===a.id?{transform:`translateX(${Math.max(0,drag.x)}px)`}:undefined}><div className="review-photo"><Photo asset={a}/></div><button className="recover-button" onPointerDown={e=>e.stopPropagation()} onClick={()=>{setState(s=>restore(s,a.id));setNotice('Foto recuperada');}}><ArrowCounterClockwiseIcon size={16}/>Recuperar</button></article>)}</div></Carousel>
      <p className="icloud-note">Al borrar, también se eliminarán de iCloud y de tus dispositivos sincronizados. Fotos las conservará en Eliminado recientemente durante el plazo que indique iOS.</p>
      {deleteConfirm?<div className="confirm-block"><strong>¿Borrar {reviewAssets.length} elementos{demo?' de demostración':''}?</strong><button className="sheet-action danger" onClick={commitDelete} disabled={busy}>{busy?'Esperando a Fotos…':demo?'Confirmar borrado simulado':'Continuar con Fotos'}</button><button className="sheet-action secondary" onClick={()=>setDeleteConfirm(false)} disabled={busy}>Seguir revisando</button></div>:<button className="sheet-action danger" onClick={()=>setDeleteConfirm(true)}><TrashIcon size={20}/>Borrar {reviewAssets.length} elementos</button>}</>}
      <button className="sheet-action secondary" onClick={()=>setSheet(null)} disabled={busy}>Continuar la sesión</button>
    </Sheet>
  </div>;
}
