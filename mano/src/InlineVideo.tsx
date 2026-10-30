import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PlayIcon, CircleNotchIcon, ArrowSquareOutIcon, XIcon } from '@phosphor-icons/react';
import type { Asset } from './domain';
import type { PreparedMedia } from './media';

export function InlineVideo({asset,prepared,failed,retry,fullscreen,children}: {asset:Asset;prepared?:PreparedMedia;failed:boolean;retry:()=>void;fullscreen:()=>void;children:ReactNode}) {
  const player = useRef<HTMLVideoElement>(null);
  const [playing,setPlaying] = useState(false);
  const [error,setError] = useState('');
  useEffect(() => {
    setPlaying(false);setError('');
    const video=player.current;
    if(video&&prepared?.video){video.src=prepared.video;video.load();}
    return () => { if(video){video.pause();video.removeAttribute('src');video.load();} };
  },[asset.id,prepared?.video]);
  const play = () => {
    const video=player.current;if(!video)return;
    setError('');
    void video.play().then(()=>setPlaying(true)).catch(()=>setError('No se pudo reproducir aquí. Puedes abrirlo a pantalla completa.'));
  };
  return <div className={`inline-media ${playing?'is-playing':''}`} onPointerDown={e=>{if(playing)e.stopPropagation();}}>
    {children}
    {prepared?.video&&<video data-testid="inline-video" ref={player} src={prepared.video} poster={prepared.poster} playsInline preload="metadata" controls={playing} onPlay={()=>setPlaying(true)} onError={()=>{setPlaying(false);setError('No se pudo reproducir aquí.');}} aria-label="Vídeo de tu biblioteca"/>}
    {playing&&<button className="close-inline-video" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();player.current?.pause();setPlaying(false);}} aria-label="Volver a la vista previa"><XIcon size={20}/></button>}
    {!playing&&<div className="inline-video-actions" onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
      {error?<><span role="alert">{error}</span><button onClick={fullscreen}><ArrowSquareOutIcon size={18}/>Pantalla completa</button></>:prepared?.video?<button onClick={play} aria-label="Reproducir vídeo"><PlayIcon weight="fill" size={18}/>Reproducir ({Math.max(1,Math.round(asset.duration))} s)</button>:failed?<><span>No se pudo preparar el vídeo</span><button onClick={retry}>Reintentar</button><button onClick={fullscreen}>Abrir a pantalla completa</button></>:<span role="status"><CircleNotchIcon className="spinner" size={18}/>Preparando vídeo…</span>}
    </div>}
  </div>;
}
