// Real Edge IndexedDB + React/Capacitor synthetic gallery. Never physical-device evidence.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {installAppleFixture} from './apple-fixture.mjs';
const out=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/r61-browser');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
async function entry(page){return page.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('cocowash-decisions-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readonly'),r=tx.objectStore('sessions').get('cocowash-library-session-v1');tx.oncomplete=()=>resolve(r.result);tx.onabort=reject;});}finally{db.close();}
});}
async function waitEntry(page,predicate){const until=Date.now()+10000;while(Date.now()<until){if(predicate(await entry(page)))return;await new Promise(r=>setTimeout(r,50));}throw Error('Durable state was not committed');}
async function ready(page){await page.locator('.photo-card.front').waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));}
const noNotice=async page=>{assert.equal(await page.getByText(/No se pudo guardar|quedó interrumpida/).count(),0,'Storage problems are never shown (user, 2026-11-08)');};
async function scenario(name,run,android=false){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  await context.addInitScript(installAppleFixture,{});
  await context.addInitScript(android=>{
   if(android)window.androidBridge={postMessage(){throw Error('No real Android bridge');}};
   const put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,...args){
    const request=put.call(this,value,...args);
    if(this.name==='sessions')request.addEventListener('success',()=>{
     if(value.intent)window.journalSawIntent=true;
     if(window.abortJournalWrites||(window.abortAfterNative&&window.journalSawIntent&&!value.intent)){
      window.realRequestSucceededBeforeAbort=true;this.transaction.abort();
     }
    });
    return request;
   };
  },android);
  const page=await context.newPage();page.setDefaultTimeout(12000);await page.goto(url);await ready(page);await run(page);
  results.push({name,status:'PASS'});
 }catch(e){results.push({name,status:'FAIL',error:e.stack});}
 finally{await context.close();}console.log(results.at(-1).status,name,results.at(-1).error??'');
}
try{
 // Contract changed by the user (2026-11-08): storage problems are handled behind the
 // scenes. A refused durable write never blocks or shows a notice; the decision stays
 // in memory and in the localStorage mirror and the next write commits it.
 await scenario('aborted journal writes are silent: the discard advances and the next write commits it',async page=>{
  const front=await page.locator('.photo-card.front').getAttribute('data-testid');
  await page.evaluate(()=>window.abortJournalWrites=true);
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();
  await page.waitForFunction(id=>document.querySelector('.photo-card.front')?.getAttribute('data-testid')!==id,front);
  assert.equal(await page.evaluate(()=>window.realRequestSucceededBeforeAbort),true);await noNotice(page);
  assert.deepEqual(JSON.parse((await entry(page)).session).record.pending,[],'the refused write left storage unchanged');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')).record.pending.length),1,'the mirror keeps the decision');
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='deleteAssets')),false);
  await page.evaluate(()=>window.abortJournalWrites=false);
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();
  await waitEntry(page,e=>JSON.parse(e.session).record.pending.length===2);
 });
 await scenario('acknowledged decision/history survives reload even with stale legacy storage; Undo restores hand',async page=>{
  const before=await page.locator('.photo-card.front').getAttribute('data-testid');
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();
  await page.getByRole('button',{name:/^Terminar.*1 para eliminar/}).waitFor();
  const saved=JSON.parse((await entry(page)).session);
  assert.equal(saved.record.pending.length,1);assert.equal(saved.record.history.at(-1).action,'discard');
  await page.reload();await ready(page);
  const restored=JSON.parse((await entry(page)).session);assert.deepEqual(restored.record,saved.record);
  await page.getByRole('button',{name:/Deshacer/}).click();
  await page.waitForFunction(id=>document.querySelector('.photo-card.front')?.getAttribute('data-testid')===id,before);
  assert.deepEqual(JSON.parse((await entry(page)).session).record.pending,[]);
 });
 await scenario('Android favorite queue and decision commit together; a refused write is silent and retried',async page=>{
  await page.evaluate(()=>window.abortJournalWrites=true);
  await page.getByRole('button',{name:'Añadir a Favoritas',exact:true}).click();await page.waitForTimeout(400);await noNotice(page);
  let stored=await entry(page);assert.deepEqual(stored.favorites,{});assert.deepEqual(JSON.parse(stored.session).record.favorites,[]);
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='favorite')),false);
  await page.evaluate(()=>window.abortJournalWrites=false);await page.getByRole('button',{name:'Añadir a Favoritas',exact:true}).click();
  await waitEntry(page,e=>Object.keys(e.favorites).length===2);
  stored=await entry(page);assert.deepEqual(Object.keys(stored.favorites),JSON.parse(stored.session).record.favorites);
  await page.reload();await ready(page);assert.deepEqual((await entry(page)).favorites,stored.favorites);
 },true);
 await scenario('native success with a refused acknowledgement is silent; the next launch settles the intent without replaying it',async page=>{
  await page.evaluate(()=>window.abortAfterNative=true);
  await page.getByRole('button',{name:'Añadir a Favoritas',exact:true}).click();await page.waitForTimeout(500);await noNotice(page);
  const stored=await entry(page);assert.equal(stored.intent.kind,'favorite');assert.deepEqual(JSON.parse(stored.session).record.favorites,[]);
  assert.equal(await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='favorite').length),1);
  await page.reload();await ready(page);await waitEntry(page,e=>!e.intent);await noNotice(page);
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='favorite')),false,'Never replay a native mutation on startup');
 });
 await scenario('pending item hidden by a library change remains recoverable and is never inferred deleted',async page=>{
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();
  await page.getByRole('button',{name:/^Terminar.*1 para eliminar/}).waitFor();
  const id=JSON.parse((await entry(page)).session).record.pending[0];
  await page.evaluate(id=>{appleFixture.assets=appleFixture.assets.filter(a=>a.id!==id);document.dispatchEvent(new Event('visibilitychange'));},id);
  await page.getByRole('button',{name:/^Terminar.*1 para eliminar/}).click();
  await page.getByText('Fotos no muestra ahora los elementos pendientes.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Recuperar todo (1)',exact:true}).click();await waitEntry(page,e=>JSON.parse(e.session).record.pending.length===0);
  assert.deepEqual(JSON.parse((await entry(page)).session).record.removed,[]);
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='deleteAssets')),false);
 });
 await scenario('confirmed native deletion with a refused acknowledgement is silent and never repeated',async page=>{
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();
  await page.getByRole('button',{name:/^Terminar.*1 para eliminar/}).click();
  await page.evaluate(()=>{appleFixture.deleteMode='success';window.abortAfterNative=true;});
  await page.getByRole('button',{name:/^Eliminar 1/}).click();await page.waitForTimeout(600);await noNotice(page);
  const stored=await entry(page);assert.equal(stored.intent.kind,'delete');assert.deepEqual(JSON.parse(stored.session).record.removed,[],'storage never claims a success it did not record');
  assert.equal(await page.evaluate(()=>appleFixture.assets.length),2);
  await page.reload();await ready(page);await waitEntry(page,e=>!e.intent);await noNotice(page);
  assert.equal(await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='deleteAssets').length),0,'the deletion is never replayed after restart');
 });
 await scenario('corrupt durable data never blocks startup: the app starts from the local copy',async page=>{
  await page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('cocowash-decisions-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
   await new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readwrite',{durability:'strict'});tx.objectStore('sessions').put({version:99,revision:99},'cocowash-library-session-v1');tx.oncomplete=resolve;tx.onabort=reject;});db.close();
  });
  await page.reload();await page.locator('.photo-card.front').waitFor();await noNotice(page);
 });
 await scenario('real IndexedDB journal round-trip at 100, 5000 and 50000 synthetic decisions',async page=>{
  const metrics=await page.evaluate(async()=>{
   const {SessionJournal,openIndexedDB}=await import('/src/durableSession.ts');const {initialState,initialFilter}=await import('/src/domain.ts');const rows=[];
   for(const size of [100,5000,50000]){
    const state=initialState();for(let i=0;i<size;i++)state.marks['fixture-'+i]={level:1,due:100,keptAt:1};
    const session={version:1,active:true,seed:1,filter:initialFilter,context:{handIds:[],selected:[],rotated:[]},updatedAt:1,record:state};
    const backend=await openIndexedDB(),key='synthetic-benchmark-'+size;
    const start=performance.now();const journal=await SessionJournal.open(key,backend,()=>({session,favorites:{},inFlight:{}}));await journal.save(session);const elapsed=performance.now()-start;
    const reopened=await SessionJournal.open(key,backend,()=>{throw Error('not migration');});if(Object.keys(reopened.session.record.marks).length!==size)throw Error('Round-trip mismatch');
    rows.push({size,openAndSaveMs:elapsed,serializedBytes:new Blob([journal.snapshot.session]).size});
   }return {engine:navigator.userAgent,conditions:'Windows headless Edge, real IndexedDB strict, synthetic records, one measured sample; not iPhone metrics',rows};
  });await fs.writeFile(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));
 });
}finally{await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
