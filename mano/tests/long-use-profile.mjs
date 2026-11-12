// Long use (user, 2026-11-12: «al usar mucho la app se siente lenta»): many
// decisions in one sitting on a big synthetic library. Records, per block, the
// time from a decision to the next card, heap, DOM size, listeners, storage size
// and long tasks. Browser + synthetic bridge: shows web-layer growth, not iPhone timing.
// Usage (from mano/, dev server running): node tests/long-use-profile.mjs [decisions] [library]
import {chromium} from '@playwright/test';
import {installAppleFixture} from './apple-fixture.mjs';
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const decisions=Number(process.argv[2]??300),library=Number(process.argv[3]??3000),block=Number(process.env.BLOCK??50);
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true,args:['--js-flags=--expose-gc']});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:process.env.MOTION==='1'?'no-preference':'reduce'});
await context.addInitScript(installAppleFixture,{});
await context.addInitScript(size=>{
 window.appleFixture.assets=Array.from({length:size},(_,i)=>({id:`fixture-${i}`,kind:i%17===0?'video':'photo',date:1700000000000-i*3600000,width:1000,height:1500,duration:i%17===0?3:0,hasLocation:i%3===0,demo:true,bytes:1000000+i}));
 window.__long=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__long.push(e.duration);}).observe({type:'longtask',buffered:true});
},library);
const page=await context.newPage();page.setDefaultTimeout(20000);
const errors=[],misses=[];let crashed=false;page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>{crashed=true;});
const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
await page.goto(url);await page.locator('.photo-card.front').waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
const buttons=['Conservar','Eliminar','Conservar','Dejar para más tarde','Conservar','Eliminar'];
const metric=async()=>{await page.evaluate(()=>window.gc?.());const m=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 const s=await page.evaluate(()=>{let bytes=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);bytes+=k.length+(localStorage.getItem(k)||'').length;}const l=window.__long.splice(0);return {storage:bytes,longTasks:l.length,longMs:Math.round(l.reduce((a,b)=>a+b,0)),imgs:document.images.length,videos:document.querySelectorAll('video').length};});
 const calls=await page.evaluate(()=>{const c={};for(const x of window.appleFixture.calls.splice(0))c[x.method]=(c[x.method]??0)+1;return c;});
 return {calls,heapMB:+(m.JSHeapUsedSize/1048576).toFixed(1),nodes:m.Nodes,listeners:m.JSEventListeners,...s};};
const rows=[];let times=[];const trail=[];
console.log('start',JSON.stringify(await metric()));
try{for(let i=0;i<decisions;i++){
 const front=await page.locator('.photo-card.front').getAttribute('data-testid').catch(()=>null);
 if(!front){ // pile ended: a new round
  const fin=page.getByRole('button',{name:/^Terminar/});if(await fin.count())await fin.first().click().catch(()=>{});
  await page.waitForTimeout(500);continue;}
 const t0=Date.now();
 const name=buttons[i%buttons.length];const ok=await page.locator('.decision-bar, .bottom-actions, nav, footer, body').getByRole('button',{name:new RegExp('^'+name)}).first().click({timeout:5000}).then(()=>true,()=>false);if(!ok)misses.push(`${i}:${name}`);
 await page.waitForFunction(id=>{const f=document.querySelector('.photo-card.front');return !f||f.getAttribute('data-testid')!==id;},front,{timeout:8000}).catch(()=>{});
 times.push(Date.now()-t0);
 trail.push(await page.evaluate(()=>({front:document.querySelector('.photo-card.front')?.getAttribute('data-testid'),cards:document.querySelectorAll('.photo-card').length,imgs:document.images.length,sheet:!!document.querySelector('.native-sheet'),empty:!!document.querySelector('.empty-state'),done:!!document.querySelector('.session-done')})).catch(()=>'?'));if(trail.length>8)trail.shift();
 if((i+1)%block===0){const sorted=[...times].sort((a,b)=>a-b);const row={n:i+1,medianMs:sorted[Math.floor(sorted.length/2)],p90Ms:sorted[Math.floor(sorted.length*.9)],...await metric()};rows.push(row);console.log(JSON.stringify(row));times=[];}
}
}catch(e){console.log('STOPPED',crashed?'renderer crashed':'',e.message.split('\n')[0]);}
console.log('trail',JSON.stringify(trail));console.log('misses',misses.length,misses.slice(0,12).join(' '),'errors',errors.length,errors.slice(0,3).join(' | '));
await browser.close();
const first=rows[0],last=rows.at(-1);
if(first&&last)console.log('GROWTH',JSON.stringify({medianMs:[first.medianMs,last.medianMs],heapMB:[first.heapMB,last.heapMB],nodes:[first.nodes,last.nodes],listeners:[first.listeners,last.listeners],storage:[first.storage,last.storage]}));
