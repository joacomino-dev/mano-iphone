// R-67 (Claude, 2026-11-09): storage that never answers must not leave a blank
// screen. The app starts on the mirrored copy within the bound, keeps decisions,
// and the journal adopts them on the next healthy launch. Edge + synthetic bridge.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {installAppleFixture} from './apple-fixture.mjs';
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});let failed=false;
const journal=page=>page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('cocowash-decisions-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readonly'),r=tx.objectStore('sessions').get('cocowash-library-session-v1');tx.oncomplete=()=>resolve(r.result);tx.onabort=reject;});}finally{db.close();}});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(installAppleFixture,{resetStorage:false});
 // sessionStorage survives reloads of this tab: the first launches hang, the last is healthy.
 await context.addInitScript(()=>{if(sessionStorage.getItem('hang')==='1'){const open=indexedDB.open.bind(indexedDB);
  IDBFactory.prototype.open=function(){const real=open('cocowash-never-answers',1);return new Proxy(real,{set:()=>true,get:(t,k)=>k==='addEventListener'?()=>{}:typeof t[k]==='function'?t[k].bind(t):t[k]});};}});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 await page.goto(url);await page.locator('.photo-card.front').waitFor();
 await page.getByRole('button',{name:'Eliminar',exact:true}).click();await page.getByRole('button',{name:/^Terminar.*1 para eliminar/}).waitFor();
 await page.evaluate(()=>sessionStorage.setItem('hang','1'));
 const started=Date.now();await page.reload();await page.locator('.photo-card.front').waitFor();const waited=Date.now()-started;
 assert.ok(waited<8000,`started in ${waited} ms without the journal`);
 await page.getByRole('button',{name:/^Terminar.*1 para eliminar/}).waitFor();
 assert.equal(await page.getByText(/No se pudo guardar|quedó interrumpida/).count(),0);
 console.log('PASS hung storage: the app starts on the local copy in',waited,'ms and keeps the pending decision');
 await page.getByRole('button',{name:'Eliminar',exact:true}).click();await page.getByRole('button',{name:/^Terminar.*2 para eliminar/}).waitFor();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')).record.pending.length===2);
 console.log('PASS a decision made without the journal is saved to the local copy');
 await page.evaluate(()=>sessionStorage.removeItem('hang'));await page.reload();await page.locator('.photo-card.front').waitFor();
 await page.getByRole('button',{name:/^Terminar.*2 para eliminar/}).waitFor();
 const entry=await journal(page);assert.equal(JSON.parse(entry.session).record.pending.length,2,'the journal adopted the newer local copy');
 console.log('PASS the next healthy launch adopts the newer local copy into the journal');
 await context.close();
}catch(e){failed=true;console.log('FAIL startup flow',e.message);}finally{await browser.close();}
if(failed)process.exitCode=1;
