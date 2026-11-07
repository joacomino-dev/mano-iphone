// Synthetic JS-only profile. No image decoding, native calls or personal assets.
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {initialState,initialFilter,orderAssets,eligibleFrom,decide} from '../src/domain.ts';
import {SessionWriter} from '../src/session.ts';import {reviewRows} from '../src/review.ts';
const output=path.resolve(process.env.APPLE_PERF_OUTPUT||'../work/apple-readiness/phase2-performance.json');
const results=[];
function measure(name,run,repetitions=5){
 const samples=[];for(let i=0;i<repetitions;i++){
  global.gc?.();const before=process.memoryUsage(),cpu=process.cpuUsage(),start=performance.now();
  const size=run();const wallMs=performance.now()-start,used=process.cpuUsage(cpu),after=process.memoryUsage();
  samples.push({wallMs,cpuUserMs:used.user/1000,cpuSystemMs:used.system/1000,heapBefore:before.heapUsed,heapAfter:after.heapUsed,rssBefore:before.rss,rssAfter:after.rss,resultSize:size});
 }
 const times=samples.map(s=>s.wallMs).sort((a,b)=>a-b);return {name,repetitions,medianMs:times[Math.floor(times.length/2)],minMs:times[0],maxMs:times.at(-1),samples};
}
for(const size of [1000,10000,50000]){
 const now=1800000000000;
 const assets=Array.from({length:size},(_,i)=>({id:`synthetic-${i}`,kind:i%10?'photo':'video',date:now-i*60000,width:1000,height:1500,duration:i%10?0:2,hasLocation:false,bytes:1000000,modified:now}));
 let record=initialState();for(let i=0;i<30;i++)record=decide(record,[assets[i].id],['keep','discard','later'][i%3],now);
 const ordered=orderAssets(assets,'oldest',42);
 const dense={...initialState(),marks:Object.fromEntries(assets.map(a=>[a.id,{level:1,due:now+86400000,keptAt:now}]))};
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const session={version:1,active:true,seed:42,filter:{...initialFilter,order:'oldest'},context:{handIds:[assets[30].id],rotated:[],selected:[]},record:dense,updatedAt:now};
 const cachedWriter=new SessionWriter();if(!cachedWriter.save('synthetic',session,storage))throw Error('Synthetic session setup failed');
 const operations=[measure('orderAssets(oldest)',()=>orderAssets(assets,'oldest',42).length),measure('orderAssets(random)',()=>orderAssets(assets,'random',42).length),measure('eligibleFrom(after 30 decisions)',()=>eligibleFrom(ordered,record,initialFilter,now).length),measure('SessionWriter: validate + serialize all marks',()=>{if(!new SessionWriter().save('synthetic',session,storage))throw Error('Synthetic session save failed');return memory.get('synthetic').length;}),measure('SessionWriter: same validated record',()=>{if(!cachedWriter.save('synthetic',session,storage))throw Error('Cached synthetic session save failed');return memory.get('synthetic').length;}),measure('reviewRows(1000 pending, midpoint)',()=>reviewRows(1000,16000,667,180,8,-1).length)];
 results.push({assets:size,recordMarks:size,operations});console.log('PROFILE',size,operations.map(o=>`${o.name}=${o.medianMs.toFixed(2)}ms`).join(' | '));
}
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),boundary:'Node synthetic metadata profile on Windows; not iPhone RAM/CPU/energy or media decoding performance',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,explicitGC:!!global.gc,results},null,2)+'\n');
