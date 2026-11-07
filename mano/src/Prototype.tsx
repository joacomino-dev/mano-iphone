import { useEffect, useRef } from 'react';
import { ManoApp } from './ManoApp';
import { useMobileDevice } from './mobile';
import { setPreviewPlatform } from './locales/android';
export default function Prototype() {
  const root=useRef<HTMLDivElement>(null);
  // The device picker (iPhone / Pixel 10) also picks the platform wording: Android
  // texts and settings can be reviewed in the browser. Remounts on change.
  const {device}=useMobileDevice();
  setPreviewPlatform(device.platform);
  useEffect(()=>{
    // Focus restoration from a sheet must not scroll the simulated device itself.
    // App content scrolls inside its own sheets; template chrome remains untouched.
    const screen=root.current?.closest<HTMLElement>('[data-phone-screen]');
    if(!screen)return;
    const keepFrame=()=>{if(screen.scrollTop)screen.scrollTop=0;};
    screen.addEventListener('scroll',keepFrame);keepFrame();
    return()=>screen.removeEventListener('scroll',keepFrame);
  },[]);
  return <div ref={root} style={{height:'100%'}}><ManoApp key={device.platform}/></div>;
}
