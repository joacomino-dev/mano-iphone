import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const tick=()=>new Promise(r=>setImmediate(r));
const fake={addListener:async()=>({remove:async()=>{}}),releasePreparedVideos:async()=>({released:0}),cancelVideoPreparation:async()=>({cancelled:true})};
globalThis.__cocoTestLibrary=fake;
const server=await createServer({configFile:false,ssr:{noExternal:['@capacitor/core']},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true},plugins:[{
 name:'test-native-bridge',enforce:'pre',resolveId(id){if(id==='@capacitor/core')return '\0test-native-bridge';},
 load(id){if(id==='\0test-native-bridge')return `export const Capacitor={isNativePlatform:()=>true,convertFileSrc:p=>p};export const registerPlugin=()=>globalThis.__cocoTestLibrary;`;}
}]});
const {VideoStore}=await server.ssrLoadModule('/src/media.ts');
const {setPreviewSizing}=await server.ssrLoadModule('/src/preview.ts');
const video=id=>({id,kind:'video',duration:1,modified:1,bytes:100});
try {
 await test('video iCloud error automatically retries after switching to always download',async()=>{
  setPreviewSizing({cloud:'save'});let calls=0;
  fake.prepareVideo=async options=>{calls++;if(!options.network)throw Object.assign(Error('cloud'),{code:'IN_CLOUD'});return {path:'/video.mp4',bytes:100};};
  const store=new VideoStore(), a=video('a');store.want([a],a);await tick();await tick();
  assert.equal(store.get(a).failure,'cloud');setPreviewSizing({cloud:'always'});store.reconcilePolicy();await tick();await tick();
  assert.equal(store.get(a).status,'ready');assert.equal(calls,2);store.dispose();
 });
 await test('cancelled native videos keep their slots until settling and stale answers never appear',async()=>{
  const jobs=[];let active=0,maximum=0;
  fake.prepareVideo=options=>new Promise(resolve=>{active++;maximum=Math.max(maximum,active);jobs.push({options,finish:()=>{active--;resolve({path:'/video.mp4',bytes:100});}});});
  const store=new VideoStore(), a=video('a'),b=video('b'),c=video('c');
  store.want([a,b],a);store.ensure(b);await tick();assert.equal(jobs.length,2);
  store.want([c],c);store.ensure(c);await tick();assert.equal(jobs.length,2);
  jobs[0].finish();await tick();assert.equal(jobs.length,3);assert.equal(store.get(a).status,'idle');
  jobs[1].finish();jobs[2].finish();await tick();assert.equal(store.get(c).status,'ready');assert.equal(maximum,2);store.dispose();
 });
 await test('switching to save cancels automatic network work, preserving ready playback',async()=>{
  setPreviewSizing({cloud:'always'});const jobs=[];
  fake.prepareVideo=options=>new Promise(resolve=>jobs.push({options,finish:()=>resolve({path:'/video.mp4',bytes:100})}));
  const store=new VideoStore(),a=video('a');store.want([a],a);await tick();
  setPreviewSizing({cloud:'save'});store.reconcilePolicy();jobs[0].finish();await tick();
  assert.equal(jobs[1].options.network,false);jobs[1].finish();await tick();assert.equal(store.get(a).status,'ready');
  setPreviewSizing({cloud:'always'});store.reconcilePolicy();assert.equal(store.get(a).status,'ready');store.dispose();
 });
} finally {await server.close();delete globalThis.__cocoTestLibrary;}
