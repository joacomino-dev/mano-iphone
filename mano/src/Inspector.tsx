import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PushPinIcon, XIcon, PlusIcon, MinusIcon } from '@phosphor-icons/react';
import { Library, thumbnail, type AssetMetadata } from './library';
import type { Asset } from './domain';

export type InspectOrigin={x:number;y:number;width:number;height:number};
type Box={x:number;y:number;width:number;height:number};
// Critically damped: settles without overshoot (ζ≈1). Entry/exit stay continuous with the card.
const settle={type:'spring',stiffness:320,damping:36,mass:1} as const;
const follow={type:'spring',stiffness:900,damping:60,mass:.6} as const;

/** Hold = isolate in place (a 3 % lift, no zoom jump); drag down to the single
 * dock to anchor; anchored = fit to screen with pinch/pan and controls. */
export function Inspector({asset,src,pinned,origin,drag,anchor,armed,geek,close,pin}: {asset:Asset;src?:string;pinned:boolean;origin?:InspectOrigin;drag:{x:number;y:number};anchor:number;armed:boolean;geek:boolean;close:()=>void;pin:()=>void}) {
 const [posterError,setPosterError]=useState(false);const [posterRetry,setPosterRetry]=useState(0);const [poster,setPoster]=useState(src);useEffect(()=>{let alive=true;if(src){setPoster(src);return;}setPosterError(false);thumbnail(asset,900,posterRetry>0).then(value=>{if(alive)setPoster(value);}).catch(()=>{if(alive)setPosterError(true);});return()=>{alive=false;};},[asset.id,src,posterRetry]);
 const outer=useRef<HTMLDivElement>(null);const reduced=useReducedMotion();const frame=useRef<HTMLDivElement>(null);
 const [space,setSpace]=useState<{target:Box;origin:Box;scale:number}|null>(null);
 const [meta,setMeta]=useState<AssetMetadata|null>(null);const [metaError,setMetaError]=useState('');const [zoom,setZoom]=useState(1);const [pan,setPan]=useState({x:0,y:0});
 const points=useRef(new Map<number,{x:number;y:number}>());const base=useRef({distance:0,zoom:1,x:0,y:0,panX:0,panY:0});
 // Measure in the overlay's own CSS pixels (the preview device frame may be scaled).
 useLayoutEffect(()=>{const element=outer.current;if(!element)return;const measure=()=>{
  const bounds=element.getBoundingClientRect(),k=bounds.width/Math.max(1,element.offsetWidth)||1,W=element.offsetWidth,H=element.offsetHeight,ratio=asset.width/Math.max(1,asset.height);
  const top=geek?64:84,bottom=geek?96:132,availH=(H-top-bottom)*(geek?.6:1),availW=W-24;
  const width=Math.min(availW,availH*ratio),height=width/ratio;
  const target={x:(W-width)/2,y:top+(availH-height)/2,width,height};
  const from=origin?{x:(origin.x-bounds.left)/k,y:(origin.y-bounds.top)/k,width:origin.width/k,height:origin.height/k}:{...target,x:target.x+target.width*.04,y:target.y+target.height*.04,width:target.width*.92,height:target.height*.92};
  setSpace({target,origin:from,scale:k});};measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[asset.id,geek,origin?.x,origin?.y]);
 useEffect(()=>{if(!pinned)return;const prior=document.activeElement as HTMLElement|null;frame.current?.focus();const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close();if(e.key==='Tab'){const controls=Array.from(outer.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]')??[]);const index=controls.indexOf(document.activeElement as HTMLElement);if(e.shiftKey&&index<=0){e.preventDefault();controls.at(-1)?.focus();}else if(!e.shiftKey&&index===controls.length-1){e.preventDefault();controls[0]?.focus();}}};document.addEventListener('keydown',escape);return()=>{document.removeEventListener('keydown',escape);prior?.focus({preventScroll:true});};},[pinned,!!space]); // the frame exists only once measured
 useEffect(()=>{if(!geek)return;let alive=true;
  if(asset.demo){setMeta({filename:'Recuerdo de demostración',width:asset.width,height:asset.height,kind:asset.kind,duration:asset.duration,creationDate:asset.date,exifStatus:'unavailable'} as AssetMetadata);return;}
  Library.metadata({id:asset.id}).then(value=>{if(alive)setMeta(value);return Library.metadata({id:asset.id,includeExif:true});}).then(value=>{if(alive)setMeta(value);}).catch(()=>{if(alive)setMetaError('Algunos datos no están disponibles en este iPhone.');});return()=>{alive=false;};
 },[asset.id,geek]);
 const rebase=()=>{const p=[...points.current.values()];base.current={distance:p.length>1?Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y):0,zoom,x:p[0]?.x??0,y:p[0]?.y??0,panX:pan.x,panY:pan.y};};
 const down=(e:PointerEvent)=>{if(!pinned)return;e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});rebase();};
 const move=(e:PointerEvent)=>{if(!points.current.has(e.pointerId))return;e.stopPropagation();points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...points.current.values()],b=base.current;
  if(p.length>1&&b.distance){setZoom(Math.min(5,Math.max(1,b.zoom*Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)/b.distance)));}
  else if(zoom>1){const rect=frame.current!.getBoundingClientRect();const maxX=rect.width*(zoom-1)/2,maxY=rect.height*(zoom-1)/2;setPan({x:Math.min(maxX,Math.max(-maxX,b.panX+e.clientX-b.x)),y:Math.min(maxY,Math.max(-maxY,b.panY+e.clientY-b.y))});}
 };
 const up=(e:PointerEvent)=>{points.current.delete(e.pointerId);rebase();};
 useEffect(()=>{if(zoom===1)setPan({x:0,y:0});},[zoom]);
 const expanded=meta?{...meta,...meta.exif,...meta.location}:null;
 const values=expanded?Object.entries(expanded).filter(([key,value])=>!['id','exifStatus','exif','location'].includes(key)&&value!==undefined&&value!==null).map(([key,value])=>[({latitude:'Latitud',longitude:'Longitud',altitude:'Altitud',filename:'Archivo',width:'Ancho',height:'Alto',creationDate:'Capturada',modified:'Modificada',duration:'Duración',kind:'Tipo',uniformTypeIdentifier:'Formato',cameraMake:'Fabricante',cameraModel:'Cámara',lensModel:'Objetivo',fNumber:'Apertura',exposureTime:'Exposición',dateTimeOriginal:'Fecha EXIF',orientation:'Orientación',camera:'Cámara',lens:'Objetivo',iso:'ISO',aperture:'Apertura',shutter:'Exposición',focalLength:'Distancia focal',isFavorite:'Favorita',isHidden:'Oculta'} as Record<string,string>)[key]??key,key.toLowerCase().includes('date')&&typeof value==='number'?new Date(value).toLocaleString('es'):typeof value==='boolean'?(value?'Sí':'No'):String(value)]):[];
 // Transform the anchored-size frame back onto the card: crisp image, no layout animation.
 const toBox=(box:Box,lift=1,offset={x:0,y:0})=>space?{x:box.x+box.width/2-(space.target.x+space.target.width/2)+offset.x,y:box.y+box.height/2-(space.target.y+space.target.height/2)+offset.y,scale:box.width/space.target.width*lift}:{x:0,y:0,scale:1};
 const finger={x:drag.x/(space?.scale??1),y:drag.y/(space?.scale??1)};
 const atOrigin=space?toBox(space.origin):undefined;
 const pose=!space?undefined:pinned?{x:0,y:0,scale:1}:toBox(space.origin,reduced?1:1.03,finger);
 return <div ref={outer} className={`inspection ${pinned?'is-pinned':''} ${geek?'is-geek':''}`} role={pinned?'dialog':undefined} aria-modal={pinned?true:undefined} aria-label="Inspeccionar recuerdo">
  <motion.div className="inspection-shade" onClick={()=>{if(pinned)close();}} initial={{opacity:0}} animate={{opacity:pinned?.94:.84}} exit={{opacity:0}} transition={{duration:reduced?0:.2,ease:[.2,.8,.2,1]}}/>
  {space&&<motion.div ref={frame} className="inspection-photo" tabIndex={pinned?0:-1} style={{left:space.target.x,top:space.target.y,width:space.target.width,height:space.target.height,'--inspect-ratio':asset.width/asset.height} as CSSProperties}
   initial={reduced?false:atOrigin} animate={pose} exit={reduced?{opacity:0,transition:{duration:0}}:{...atOrigin,transition:settle}}
   transition={reduced?{duration:0}:pinned?settle:(drag.x||drag.y)?follow:settle} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={e=>e.stopPropagation()}>
   {poster?<img src={poster} alt="Recuerdo ampliado" draggable={false} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}/>:<span>{posterError?'No se pudo cargar la imagen.':''}{posterError&&pinned&&<button onClick={()=>setPosterRetry(v=>v+1)}>Reintentar</button>}</span>}
  </motion.div>}
  <motion.div layout={!reduced} className={`inspection-dock ${pinned?'is-pinned':''} ${armed?'is-armed':''}`} data-inspection-hook style={{'--anchor':anchor} as CSSProperties}
   initial={reduced?false:{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={reduced?{opacity:0,transition:{duration:0}}:{opacity:0,y:16}} transition={reduced?{duration:0}:{type:'spring',stiffness:420,damping:36}}>
   {pinned?<>
    <span className="dock-state"><PushPinIcon weight="fill" size={18}/>Anclada</span>
    <button aria-label="Reducir zoom" onClick={()=>setZoom(z=>Math.max(1,z-.5))} disabled={zoom<=1}><MinusIcon size={20}/></button><span className="dock-zoom">{Math.round(zoom*100)}%</span><button aria-label="Aumentar zoom" onClick={()=>setZoom(z=>Math.min(5,z+.5))} disabled={zoom>=5}><PlusIcon size={20}/></button>
    <button className="inspection-close" onClick={close}><XIcon size={18} weight="bold"/>Cerrar</button>
   </>:<button className="dock-target" tabIndex={-1} onClick={pin}><PushPinIcon weight={armed?'fill':'regular'} size={20}/><span>{armed?'Suelta para anclar':'Arrastra aquí para anclar'}</span></button>}
  </motion.div>
  {geek&&pinned&&space&&<motion.aside className="geek-panel" style={{top:space.target.y+space.target.height+12}} aria-label="Datos del archivo" exit={{opacity:0,transition:{duration:.12}}} initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.2}}><strong>Modo Geek</strong>{meta?<dl>{values.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>:<p role="status">Consultando datos locales…</p>}{metaError&&<p>{metaError}</p>}{meta&&<small>Solo datos disponibles localmente. Sin descargar originales.</small>}</motion.aside>}
 </div>;
}
