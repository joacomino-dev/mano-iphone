import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PeopleBridge, usePeopleProtection } from './PeopleMedia';
import { RequestQueue } from './requests';
import type { PersonGroup, PersonPortrait } from './people';

const portraits = new RequestQueue<string>(2,64);
export const clearPortraits = () => portraits.clear();
function Portrait({ person, face, revision }: { person:string;face:PersonPortrait;revision:number }) {
  const key=`${person}:${face.face}:${face.version??revision}`;
  const [image,setImage]=useState<{key:string;src:string}>(),[retry,setRetry]=useState(0),[failed,setFailed]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();setFailed(false);
    void portraits.request(`${key}:${retry}`,async()=>{
      const value=await PeopleBridge.command({action:'portrait',person,face:face.face});const path=(value as {path?:unknown}).path;
      if(typeof path!=='string')throw new Error('Portrait unavailable');return Capacitor.convertFileSrc(path);
    },controller.signal).then(src=>{if(!controller.signal.aborted)setImage({key,src});}).catch(()=>{});
    return()=>controller.abort();
  },[key,retry]);
  return image?.key===key&&!failed?<img src={image.src} alt="Recorte del rostro" draggable={false} decoding="async" onError={()=>{if(retry===0)setRetry(1);else setFailed(true);}}/>:<span className="person-crop-pending" aria-hidden="true"/>;
}
export function PersonMosaic({ group, revision }: { group:PersonGroup;revision:number }) {
  const protectedPhoto=usePeopleProtection();
  const faces=(group.portraits??[]).slice(0,4);
  return <span className="person-mosaic" aria-label={protectedPhoto?'Miniaturas protegidas':`${faces.length} recortes faciales`}>
    {protectedPhoto?<span className="person-crop-covered">Rostros protegidos</span>:faces.map(face=><span key={face.face} className="person-crop"><Portrait person={group.id} face={face} revision={revision}/></span>)}
    {!protectedPhoto&&!faces.length&&<span>Vista local no disponible</span>}
  </span>;
}
