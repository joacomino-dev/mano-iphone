import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from 'react';
import { animate, motion, useMotionValue, usePresenceData, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { PushPinIcon, XIcon } from '@phosphor-icons/react';
import { Library, thumbnail, inCloudError, type AssetMetadata } from './library';
import { InlineVideo } from './InlineVideo';
import { loadZoomPreview, cloudPreviews, type VideoState } from './media';
import { CloudBadge, useCloud } from './Cloud';
import { cardPixels, previewPolicyKey, subscribePreviewPolicy } from './preview';
import { formatBytes } from './meta';
import { locale, t } from './i18n';
import type { Asset } from './domain';
import { Stamp, type StampKind } from './Stamp';
import { haptic } from './haptics';

const GEEK_LABELS:Record<string,()=>string>={latitude:()=>t('Latitud'),longitude:()=>t('Longitud'),altitude:()=>t('Altitud'),filename:()=>t('Archivo'),width:()=>t('Ancho'),height:()=>t('Alto'),creationDate:()=>t('Capturada'),modified:()=>t('Modificada'),duration:()=>t('Duración'),kind:()=>t('Tipo'),uniformTypeIdentifier:()=>t('Formato'),cameraMake:()=>t('Fabricante'),cameraModel:()=>t('Cámara'),lensModel:()=>t('Objetivo'),fNumber:()=>t('Apertura'),exposureTime:()=>t('Exposición'),dateTimeOriginal:()=>t('Fecha EXIF'),orientation:()=>t('Orientación'),camera:()=>t('Cámara'),lens:()=>t('Objetivo'),iso:()=>'ISO',aperture:()=>t('Apertura'),shutter:()=>t('Exposición'),focalLength:()=>t('Distancia focal'),isFavorite:()=>t('Favorita'),isHidden:()=>t('Oculta')};
export type InspectOrigin={x:number;y:number;width:number;height:number};
type Box={x:number;y:number;width:number;height:number};
// Critically damped: settles without overshoot (ζ≈1). Entry/exit stay continuous with the card.
const settle={type:'spring',stiffness:320,damping:36,mass:1} as const;
const follow={type:'spring',stiffness:900,damping:60,mass:.6} as const;
/** An anchored set as a real stack of Polaroids (user, 2026-11-13): `behind` are the next
 * photos, each in its own proportions, peeking out slightly turned; `was` says where each
 * one sat in the stack before this photo came to the front (-1 front, 0/1 behind, absent
 * = not shown), so the deck rotates instead of popping. */
export type AnchoredStack={behind:Asset[];was:Record<string,number>};
const stackSpring={type:'spring',stiffness:520,damping:42,mass:1} as const;
/** Thumbnails the stack already showed, so a photo coming to the front has its image at once. */
const stackSrc=new Map<string,string>();
const slotPose=(k:number)=>k<=0?{rotate:-2.8,y:10,scale:.965}:{rotate:3.4,y:20,scale:.935};
function StackPhoto({asset}:{asset:Asset}){
 const [src,setSrc]=useState<string>();const policy=useSyncExternalStore(subscribePreviewPolicy,previewPolicyKey);
 useEffect(()=>{const controller=new AbortController();thumbnail(asset,cardPixels(asset),false,false,controller.signal).then(value=>{if(!controller.signal.aborted){stackSrc.set(asset.id,value);setSrc(value);}}).catch(()=>{});return()=>controller.abort();},[asset.id,asset.modified,policy]);
 return src?<img className="stack-photo" src={src} alt="" draggable={false}/>:<span className="stack-photo"/>;
}

/** Hold = isolate in place (a 3 % lift, no zoom jump); drag down to the single
 * dock to anchor; anchored = fit to screen with pinch/pan and controls. */
/** `freeze`: the card's own <video>, whose current frame is painted under the
 * held view while its element catches up — no flash of the first frame. */
export type InspectVideo={request?:()=>void;state:VideoState;retry:()=>void;download:()=>void;fullscreen:()=>void;openSettings:()=>void;sound?:boolean;onSound?:()=>void;freeze?:HTMLVideoElement|null};
/** `decide` (opened from the Fototeca, user 2026-11-12): dragging the photo away decides
 * it like a card on the pile — right keeps, left deletes, up favourites, down later —
 * instead of closing. `next`: a single tap rotates to the next anchored photo. */
export function Inspector({asset,src,cloud=false,pinned,origin,peek,anchor,armed,geek,close,pin,video,decide,next,polaroid}: {asset:Asset;src?:string;cloud?:boolean;pinned:boolean;origin?:InspectOrigin;peek:{x:MotionValue<number>;y:MotionValue<number>};anchor:MotionValue<number>;armed:boolean;geek:boolean;close:()=>void;pin:()=>void;video?:InspectVideo;decide?:(kind:StampKind)=>Promise<boolean>;next?:()=>void;polaroid?:{where?:string;when?:string;stack?:AnchoredStack}}) {
 const policy=useSyncExternalStore(subscribePreviewPolicy,previewPolicyKey);
 // An iCloud-only photo (no local preview under «Ahorrar iCloud») is not an
 // error: it says so, and anchoring downloads it (loadZoomPreview below).
 const [posterError,setPosterError]=useState(false);const [posterCloud,setPosterCloud]=useState(false);const [posterRetry,setPosterRetry]=useState(0);const [poster,setPoster]=useState(src??stackSrc.get(asset.id));useEffect(()=>{let alive=true;const controller=new AbortController();if(src){setPoster(src);return;}const known=stackSrc.get(asset.id);if(known)setPoster(known);setPosterError(false);setPosterCloud(false);thumbnail(asset,cardPixels(asset),posterRetry>0,false,controller.signal).then(value=>{if(alive)setPoster(value);}).catch(e=>{if(!alive)return;if(inCloudError(e))setPosterCloud(true);else setPosterError(true);});return()=>{alive=false;controller.abort();};},[asset.id,asset.modified,src,posterRetry,policy]);
 const outer=useRef<HTMLDivElement>(null);const reduced=useReducedMotion();const frame=useRef<HTMLDivElement>(null);
 // A held video continues from the card's frame: paint that frame once, under the
 // video element, until the element shows the same moment (drawing a video into a
 // canvas never reads its pixels back, so any source is allowed).
 const freeze=video?.freeze;
 const still=(c:HTMLCanvasElement|null)=>{const v=freeze;if(!v||!c||c.dataset.painted||v.readyState<2||!v.videoWidth)return;c.dataset.painted='1';try{const k=Math.min(1,960/Math.max(v.videoWidth,v.videoHeight));c.width=Math.round(v.videoWidth*k);c.height=Math.round(v.videoHeight*k);c.getContext('2d')?.drawImage(v,0,0,c.width,c.height);}catch{/* poster stays */}};
 // Anchored on purpose: fetch the larger preview once, decode it off screen and
 // swap it into the same <img> (same box, same object-fit): no blank frame and
 // no reframing. The card-size poster stays if this fails. Anchoring may fetch
 // from iCloud — joining the download that holding the card already started —
 // and the card's own iCloud indicator follows it here, with real progress.
 const [sharp,setSharp]=useState('');const download=useCloud(asset.kind==='video'?undefined:asset);
 useEffect(()=>{if(!pinned||asset.kind==='video')return;const controller=new AbortController();const timer=window.setTimeout(()=>{loadZoomPreview(asset,controller.signal).then(value=>{if(!controller.signal.aborted)setSharp(value);}).catch(()=>{});},polaroid?.stack?380:0);return()=>{window.clearTimeout(timer);controller.abort();};},[pinned,asset.id,asset.modified,policy]);
 const [space,setSpace]=useState<{target:Box;origin:Box;scale:number;fit:(ratio:number)=>Box}|null>(null);
 const [meta,setMeta]=useState<AssetMetadata|null>(null);const [metaError,setMetaError]=useState('');const [zoom,setZoom]=useState(1);const [pan,setPan]=useState({x:0,y:0});
 // Pinching in past the fitted size shrinks the view with the fingers; let go small and it
 // closes — the opposite of the pinch out that opened it (user, 2026-11-13).
 const shrink=useMotionValue(1);
 const points=useRef(new Map<number,{x:number;y:number}>());const base=useRef({distance:0,zoom:1,x:0,y:0,panX:0,panY:0});
 // Measure in the overlay's own CSS pixels (the preview device frame may be scaled).
 useLayoutEffect(()=>{const element=outer.current;if(!element)return;const measure=()=>{
  const bounds=element.getBoundingClientRect(),k=bounds.width/Math.max(1,element.offsetWidth)||1,W=element.offsetWidth,H=element.offsetHeight,ratio=asset.width/Math.max(1,asset.height);
  const top=geek?64:polaroid?96:84,bottom=geek?96:polaroid?176:132,availH=(H-top-bottom)*(geek?.6:1),availW=W-(polaroid?48:24);
  const fit=(r:number)=>{const width=Math.min(availW,availH*r),height=width/r;return {x:(W-width)/2,y:top+(availH-height)/2,width,height};};
  const target=fit(ratio);
  const from=origin?{x:(origin.x-bounds.left)/k,y:(origin.y-bounds.top)/k,width:origin.width/k,height:origin.height/k}:{...target,x:target.x+target.width*.04,y:target.y+target.height*.04,width:target.width*.92,height:target.height*.92};
  setSpace({target,origin:from,scale:k,fit});};measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[asset.id,geek,!!polaroid,origin?.x,origin?.y]);
 useEffect(()=>{if(!pinned)return;const prior=document.activeElement as HTMLElement|null;// preventScroll: focusing the still-animating frame made iOS scroll the web view a few
 // pixels, showing the page's cream background as a strip under the anchored view
 // (user report, 2026-11-08). The document never scrolls while anchored.
 frame.current?.focus({preventScroll:true});const pinScroll=()=>{if(window.scrollY||window.scrollX)window.scrollTo(0,0);};pinScroll();window.addEventListener('scroll',pinScroll,{passive:true});const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close();if(e.key==='Tab'){const controls=Array.from(outer.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]')??[]);const index=controls.indexOf(document.activeElement as HTMLElement);if(e.shiftKey&&index<=0){e.preventDefault();controls.at(-1)?.focus();}else if(!e.shiftKey&&index===controls.length-1){e.preventDefault();controls[0]?.focus();}}};document.addEventListener('keydown',escape);return()=>{document.removeEventListener('keydown',escape);window.removeEventListener('scroll',pinScroll);prior?.focus({preventScroll:true});};},[pinned,!!space]); // the frame exists only once measured
 useEffect(()=>{if(!geek)return;let alive=true;
  if(asset.demo){setMeta({filename:t('Recuerdo de demostración'),width:asset.width,height:asset.height,kind:asset.kind,duration:asset.duration,creationDate:asset.date,exifStatus:'unavailable'} as AssetMetadata);return;}
  Library.metadata({id:asset.id}).then(value=>{if(alive)setMeta(value);return Library.metadata({id:asset.id,includeExif:true});}).then(value=>{if(alive)setMeta(value);}).catch(()=>{if(alive)setMetaError(t('Algunos datos no están disponibles en este iPhone.'));});return()=>{alive=false;};
 },[asset.id,geek]);
 // Anchored and not zoomed: dragging the photo (or a video's picture, never its
 // controls) away closes it, like a photo viewer (user, 2026-11-08). Short or
 // slow drags spring back; zoomed photos keep panning instead.
 const dismissX=useMotionValue(0),dismissY=useMotionValue(0),dismissTurn=useMotionValue(0);
 const dismissFade=useTransform(()=>1-Math.min(.5,Math.hypot(dismissX.get(),dismissY.get())/480));
 const dismiss=useRef<{id:number;x:number;y:number;t:number}|null>(null);
 const onControl=(e:PointerEvent)=>!!(e.target as HTMLElement).closest('button,input,a,.video-controls');
 const startDismiss=(e:PointerEvent)=>{if(!pinned||zoom>1||onControl(e)||dismiss.current)return false;dismiss.current={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()};return true;};
 const [swipe,setSwipe]=useState<StampKind|null>(null);
 const swipeNow=useRef<StampKind|null>(null);
 const kindOf=(x:number,y:number):StampKind|null=>Math.hypot(x,y)<56?null:Math.abs(x)>=Math.abs(y)?(x>0?'keep':'discard'):(y<0?'favorite':'later');
 const resetDismiss=()=>{dismiss.current=null;swipeNow.current=null;setSwipe(null);animate(dismissX,0,settle);animate(dismissY,0,settle);animate(dismissTurn,0,settle);};
 const moveDismiss=(e:PointerEvent)=>{const d=dismiss.current;if(!d||d.id!==e.pointerId)return false;if(points.current.size>1){resetDismiss();return false;}dismissX.set((e.clientX-d.x)/scale.current);dismissY.set((e.clientY-d.y)/scale.current);if(decide){dismissTurn.set(Math.max(-12,Math.min(12,(e.clientX-d.x)/scale.current/22)));const k=kindOf(e.clientX-d.x,e.clientY-d.y);if(k!==swipeNow.current){swipeNow.current=k;setSwipe(k);if(k)haptic('selection');}}return true;};
 const endDismiss=(e:PointerEvent)=>{const d=dismiss.current;if(!d||d.id!==e.pointerId)return 0;const distance=Math.hypot(e.clientX-d.x,e.clientY-d.y),speed=distance/Math.max(1,performance.now()-d.t);dismiss.current=null;
  const dx=e.clientX-d.x,dy=e.clientY-d.y,kind=decide?kindOf(dx,dy)??(Math.abs(dx)>=Math.abs(dy)?(dx>0?'keep':'discard'):(dy<0?'favorite':'later')):null;
  if(distance>110||(distance>40&&speed>.6)){
   if(decide&&kind){const flight=reduced?{x:0,y:0,turn:0}:kind==='keep'?{x:440,y:0,turn:12}:kind==='discard'?{x:-440,y:0,turn:-12}:kind==='later'?{x:0,y:520,turn:4}:{x:0,y:-560,turn:0};
    const leave={duration:.34,ease:[.32,.72,.36,1] as const};
    void Promise.all([animate(dismissX,flight.x,leave),animate(dismissY,flight.y,leave),animate(dismissTurn,flight.turn,leave)]).then(()=>decide(kind)).then(done=>{swipeNow.current=null;setSwipe(null);if(!done){animate(dismissX,0,settle);animate(dismissY,0,settle);animate(dismissTurn,0,settle);}});}
   else{animate(dismissX,0,settle);animate(dismissY,0,settle);close();}}
  else{swipeNow.current=null;setSwipe(null);animate(dismissX,0,settle);animate(dismissY,0,settle);}return distance;};
 const rebase=()=>{const p=[...points.current.values()];base.current={distance:p.length>1?Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y):0,zoom,x:p[0]?.x??0,y:p[0]?.y??0,panX:pan.x,panY:pan.y};};
 const down=(e:PointerEvent)=>{if(!pinned||onControl(e))return;e.stopPropagation();if(!points.current.size)downAt.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.current.size===1)startDismiss(e);else resetDismiss();rebase();};
 const move=(e:PointerEvent)=>{if(moveDismiss(e)){e.stopPropagation();if(points.current.has(e.pointerId))points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});return;}if(!points.current.has(e.pointerId))return;e.stopPropagation();points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...points.current.values()],b=base.current;
  if(p.length>1&&b.distance){const z=b.zoom*Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)/b.distance;if(z<1){if(zoom!==1)setZoom(1);shrink.set(Math.max(.45,z));}else{shrink.set(1);setZoom(Math.min(5,z));}}
  else if(zoom>1){const rect=frame.current!.getBoundingClientRect();const maxX=rect.width*(zoom-1)/2,maxY=rect.height*(zoom-1)/2;setPan({x:Math.min(maxX,Math.max(-maxX,b.panX+e.clientX-b.x)),y:Math.min(maxY,Math.max(-maxY,b.panY+e.clientY-b.y))});}
 };
 // Double tap on the anchored media zooms in at that point; another double tap
 // zooms back out (user, 2026-11-09). Single taps keep their meaning.
 const lastTap=useRef<{t:number;x:number;y:number}|null>(null);const downAt=useRef({x:0,y:0});const tapTimer=useRef(0);
 useEffect(()=>()=>window.clearTimeout(tapTimer.current),[]);
 const doubleTap=(e:PointerEvent,moved:number)=>{if(!pinned||moved>=10||points.current.size||onControl(e))return;if(next){if(zoom===1&&shrink.get()===1)next();return;}const now=performance.now(),prev=lastTap.current;
  if(prev&&now-prev.t<320&&Math.hypot(e.clientX-prev.x,e.clientY-prev.y)<30){lastTap.current=null;window.clearTimeout(tapTimer.current);
   if(zoom>1){setZoom(1);setPan({x:0,y:0});}else{const rect=frame.current!.getBoundingClientRect(),k=scale.current||1,z=2.5;
    const px=(e.clientX-(rect.left+rect.width/2))/k,py=(e.clientY-(rect.top+rect.height/2))/k,maxX=rect.width/k*(z-1)/2,maxY=rect.height/k*(z-1)/2;
    setZoom(z);setPan({x:Math.min(maxX,Math.max(-maxX,-px*(z-1))),y:Math.min(maxY,Math.max(-maxY,-py*(z-1)))});}
  }else{const tap={t:now,x:e.clientX,y:e.clientY};lastTap.current=tap;}};
 const up=(e:PointerEvent)=>{endDismiss(e);points.current.delete(e.pointerId);rebase();if(points.current.size<2&&shrink.get()<1){if(shrink.get()<.82){haptic('soft');close();return;}animate(shrink,1,settle);}if(e.currentTarget===frame.current)doubleTap(e,Math.hypot(e.clientX-downAt.current.x,e.clientY-downAt.current.y));};
 // Anchored: the area around the photo is part of it. A pinch or a pan there
 // works on the photo; a single tap there closes, like «Cerrar».
 const tap=useRef<{x:number;y:number;multi:boolean}|null>(null);
 const shadeDown=(e:PointerEvent)=>{if(!pinned)return;tap.current=tap.current?{...tap.current,multi:true}:{x:e.clientX,y:e.clientY,multi:false};down(e);};
 const shadeUp=(e:PointerEvent)=>{const start=tap.current;up(e);if(points.current.size)return;tap.current=null;if(start&&!start.multi&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<10)close();};
 const shadeCancel=(e:PointerEvent)=>{resetDismiss();up(e);tap.current=null;};
 useEffect(()=>{if(zoom===1)setPan({x:0,y:0});},[zoom]);
 const expanded=meta?{...meta,...meta.exif,...meta.location}:null;
 const weight=formatBytes(asset.bytes,locale);
 const values=expanded?[...(weight?[[t('Peso'),weight]]:[]),...Object.entries(expanded).filter(([key,value])=>!['id','exifStatus','exif','location'].includes(key)&&value!==undefined&&value!==null).map(([key,value])=>[GEEK_LABELS[key]?.()??key,key.toLowerCase().includes('date')&&typeof value==='number'?new Date(value).toLocaleString(locale):typeof value==='boolean'?(value?t('Sí'):t('No')):String(value)])]:[];
 // Transform the anchored-size frame back onto the card: crisp image, no layout animation.
 const toBox=(box:Box,lift=1,offset={x:0,y:0})=>space?{x:box.x+box.width/2-(space.target.x+space.target.width/2)+offset.x,y:box.y+box.height/2-(space.target.y+space.target.height/2)+offset.y,scale:box.width/space.target.width*lift}:{x:0,y:0,scale:1};
 // The finger while holding: followed through a stiff spring on a wrapper, so
 // the photo's own pose (lift, anchor, exit) never re-renders per move.
 const scale=useRef(1);scale.current=space?.scale??1;
 const fingerX=useTransform(()=>peek.x.get()/scale.current),fingerY=useTransform(()=>peek.y.get()/scale.current);
 const smoothX=useSpring(fingerX,follow),smoothY=useSpring(fingerY,follow);
 // Leaving because the set moved on: gone at once, every part (the next view shows the stack moving).
 const rotatingOut=usePresenceData()===true,gone={opacity:0,transition:{duration:0}};
 // Read once, at mount: where this photo sat in the stack before it came to the front.
 const stack=polaroid?.stack,[arrivedFrom]=useState(()=>stack?.was[asset.id]),chained=arrivedFrom!==undefined&&arrivedFrom>=0;
 const atOrigin=space?toBox(space.origin):undefined;
 const pose=!space?undefined:pinned?{x:0,y:0,scale:1}:toBox(space.origin,reduced?1:1.03);
 return <motion.div ref={outer} className={`inspection ${pinned?'is-pinned':''} ${geek?'is-geek':''}`} role={pinned?'dialog':undefined} aria-modal={pinned?true:undefined} aria-label={t('Inspeccionar recuerdo')}
  variants={{gone:(rotating?:boolean)=>rotating?{opacity:0,pointerEvents:'none',transition:{duration:0}}:{}}} exit="gone">
  <motion.div className="inspection-shade" onPointerDown={shadeDown} onPointerMove={move} onPointerUp={shadeUp} onPointerCancel={shadeCancel} initial={chained?false:{opacity:0}} animate={{opacity:pinned?.94:.84}} exit={rotatingOut?gone:{opacity:0}} transition={{duration:reduced?0:.2,ease:[.2,.8,.2,1]}}/>
  {polaroid&&space&&pinned&&stack&&stack.behind.slice(0,2).map((b,k)=>[b,k] as const).reverse().map(([b,k])=>{const box=space.fit(b.width/Math.max(1,b.height)),was=stack.was[b.id];
   const from=was===undefined||was>1?{...slotPose(k),opacity:0}:was<0?{rotate:0,y:0,scale:1,opacity:1}:{...slotPose(was),opacity:1};
   return <motion.div key={b.id} className="inspection-mount is-back" aria-hidden="true" initial={reduced?false:from} animate={{...slotPose(k),opacity:1}} transition={stackSpring}
    style={{left:`calc(${box.x}px - var(--cw-card-side))`,top:`calc(${box.y}px - var(--cw-card-side))`,width:`calc(${box.width}px + 2 * var(--cw-card-side))`,height:`calc(${box.height}px + var(--cw-card-side) + var(--cw-caption))`,zIndex:0}}><StackPhoto asset={b}/></motion.div>;})}
  {space&&<motion.div className="inspection-follow" style={{x:reduced?fingerX:smoothX,y:reduced?fingerY:smoothY}}><motion.div className="inspection-arrive" initial={chained&&!reduced?{...slotPose(arrivedFrom),opacity:arrivedFrom>1?0:1}:false} animate={{rotate:0,y:0,scale:1,opacity:1}} transition={stackSpring}><motion.div className="inspection-dismiss" style={{x:dismissX,y:dismissY,rotate:dismissTurn,scale:shrink,opacity:decide?1:dismissFade}}>{polaroid&&pinned&&<motion.div className="inspection-mount" aria-hidden="true"
   // The paper is part of the photo (user, 2026-11-13): it grows out of the tile with it and
   // shrinks back with it, scaled around the photo's centre; only its edge fades.
   initial={reduced||chained?false:{...atOrigin,opacity:0}} animate={{...pose,opacity:1}} exit={reduced||rotatingOut?gone:{...atOrigin,opacity:0,transition:{...settle,opacity:{duration:.18,delay:.12}}}}
   transition={{...settle,opacity:{duration:.16}}} style={{transformOrigin:`50% calc(var(--cw-card-side) + ${space.target.height/2}px)`,left:`calc(${space.target.x}px - var(--cw-card-side))`,top:`calc(${space.target.y}px - var(--cw-card-side))`,width:`calc(${space.target.width}px + 2 * var(--cw-card-side))`,height:`calc(${space.target.height}px + var(--cw-card-side) + var(--cw-caption))`}}><span className="polaroid-caption mount-caption">{polaroid.where&&<span className="caption-where">{polaroid.where}</span>}{polaroid.when&&<span className="caption-when">{polaroid.when}</span>}</span></motion.div>}<motion.div ref={frame} className="inspection-photo" tabIndex={pinned?0:-1} style={{left:space.target.x,top:space.target.y,width:space.target.width,height:space.target.height,'--inspect-ratio':asset.width/asset.height} as CSSProperties}
   initial={reduced||chained?false:atOrigin} animate={pose} exit={reduced||rotatingOut?gone:{...atOrigin,transition:settle}}
   transition={reduced?{duration:0}:settle} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={e=>{resetDismiss();up(e);}} onClick={e=>e.stopPropagation()}>
   {video?<div className="inspection-media"><InlineVideo asset={asset} state={video.state} request={video.request} mediaStyle={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}} mode={pinned?'full':'peek'} sound={video.sound} onSound={video.onSound} retry={video.retry} download={video.download} fullscreen={video.fullscreen} openSettings={video.openSettings}>{freeze?<canvas ref={still} className="inspection-still"/>:(poster||sharp||download?.src)?<img src={pinned&&sharp?sharp:poster||download?.src} alt="" draggable={false} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}/>:null}</InlineVideo></div>
    :poster||(pinned&&sharp)||download?.src?<img src={pinned&&sharp?sharp:poster||download?.src} alt={t('Recuerdo ampliado')} draggable={false} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}/>:<span>{posterCloud?(pinned?'':t('En iCloud. Ancla para descargarla.')):posterError?t('No se pudo cargar la imagen.'):''}{posterError&&pinned&&<button onClick={()=>setPosterRetry(v=>v+1)}>{t('Reintentar')}</button>}</span>}
   {!sharp&&(cloud||download?.status==='downloading')&&<CloudBadge className="cloud-download" state={download?.status==='ready'?undefined:download} lite={cloud} onRetry={()=>void cloudPreviews.retry(asset,'zoom').then(setSharp).catch(()=>{})}/>}
   {swipe&&<span className={`inspection-swipe is-${swipe}`} aria-hidden="true"><Stamp kind={swipe} word/></span>}
  </motion.div></motion.div></motion.div></motion.div>}
  <motion.div layout={!reduced} className={`inspection-dock ${pinned?'is-pinned':''} ${armed?'is-armed':''}`} data-inspection-hook style={{'--anchor':anchor} as CSSProperties}
   initial={reduced?false:{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={reduced||rotatingOut?gone:{opacity:0,y:16}} transition={reduced?{duration:0}:{type:'spring',stiffness:420,damping:36}}>
   {pinned?<>
    {/* Only «Cerrar» (user, 2026-11-08: «Anclada» was redundant). Tapping outside
        the photo or dragging it away also closes; zoom is a pinch. */}
    <button className="inspection-close" onClick={close}><XIcon size={18} weight="bold"/>{t('Cerrar')}</button>
   </>:<button className="dock-target" tabIndex={-1} onClick={pin}><PushPinIcon weight={armed?'fill':'regular'} size={20}/><span>{armed?t('Suelta para anclar'):t('Arrastra aquí para anclar')}</span></button>}
  </motion.div>
  {geek&&pinned&&space&&<motion.aside className="geek-panel" style={{top:space.target.y+space.target.height+12}} aria-label={t('Datos del archivo')} exit={rotatingOut?gone:{opacity:0,transition:{duration:.12}}} initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.2}}><strong>{t('Modo Geek')}</strong>{meta?<dl>{values.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>:<p role="status">{t('Consultando datos locales…')}</p>}{metaError&&<p>{metaError}</p>}{meta&&<small>{t('Solo datos disponibles localmente. Sin descargar originales.')}</small>}</motion.aside>}
 </motion.div>;
}
