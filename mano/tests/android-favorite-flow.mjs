// Real React/queue/Capacitor proxy, synthetic gallery only; not Android hardware QA.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {installAppleFixture} from './apple-fixture.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
const out=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/cx024/android');await fs.mkdir(out,{recursive:true});
async function run(name,test){const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{await context.addInitScript(installAppleFixture,{});await context.addInitScript(()=>{window.androidBridge={postMessage(){throw new Error('Real Android bridge forbidden');}};});
 const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html');await page.locator('.photo-card').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
 assert.equal(await page.evaluate(async()=> (await import('/src/locales/android.ts')).onAndroid()),true);
 await test(page);assert.deepEqual(errors,[]);results.push({name,status:'PASS'});
 }catch(e){results.push({name,status:'FAIL',error:e.stack});}finally{await context.close();}console.log(results.at(-1).status,name,results.at(-1).error??'');}
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')));
async function refresh(page){await page.getByRole('button',{name:'Filtros',exact:true}).click();await page.getByRole('button',{name:'Ajustes',exact:true}).click();await page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click();await page.getByRole('button',{name:'Cerrar',exact:true}).click();}
try{
 await run('queued decision survives a fresh gallery enumeration',async page=>{
  await page.getByRole('button',{name:'Añadir a Favoritas',exact:true}).click();await page.waitForTimeout(400);
  const favorite=(await stored(page)).record.favorites;assert.equal(favorite.length,1);
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='favorite')),false,'Queue alone must not mutate gallery');
  await refresh(page);await page.waitForTimeout(400);assert.deepEqual((await stored(page)).record.favorites,favorite);
 });
 await run('queueing alone does not discard a useful pending external snapshot',async page=>{
  await page.evaluate(()=>{appleFixture.assets.push({...appleFixture.assets[0],id:'external-favorite',favorite:true});appleFixture.holdAssets=true;});
  await refresh(page);await page.waitForFunction(()=>appleFixture.pendingAssets?.length===1);
  await page.getByRole('button',{name:'Añadir a Favoritas',exact:true}).click();await page.waitForTimeout(400);
  await page.evaluate(()=>appleFixture.pendingAssets.splice(0).forEach(r=>r()));await page.waitForTimeout(400);
  assert.ok((await stored(page)).record.favorites.includes('external-favorite'));
 });
 await run('end-of-round native flush invalidates pre-mutation snapshots',async page=>{
  await page.getByRole('button',{name:'Añadir a Favoritas',exact:true}).click();await page.waitForTimeout(400);const fav=(await stored(page)).record.favorites;
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();await page.getByRole('button',{name:/^Terminar/}).click();
  await page.evaluate(()=>{appleFixture.deleteMode='success';appleFixture.holdFavorite=true;});await page.getByRole('button',{name:/^Eliminar 1/}).click();await page.waitForFunction(()=>appleFixture.pendingFavorites?.length===1);
  await page.evaluate(()=>{appleFixture.holdAssets=true;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>appleFixture.pendingAssets?.length===1);
  await page.evaluate(()=>{appleFixture.pendingFavorites.splice(0).forEach(r=>r());});await page.waitForTimeout(100);
  await page.evaluate(()=>appleFixture.pendingAssets.splice(0).forEach(r=>r()));await page.waitForTimeout(400);
  assert.deepEqual((await stored(page)).record.favorites,fav);
 });
 await run('undo during in-flight gallery confirmation is not lost',async page=>{
  const result=await page.evaluate(async()=>{const q=await import('/src/favoriteQueue.ts');await q.setFavorite(['fixture-0'],true);appleFixture.holdFavorite=true;const send=q.flushFavorites();while(!appleFixture.pendingFavorites?.length)await new Promise(r=>setTimeout(r,10));await q.setFavorite(['fixture-0'],false);appleFixture.holdFavorite=false;appleFixture.pendingFavorites.splice(0).forEach(r=>r());await send;return appleFixture.assets[0].favorite;});assert.equal(result,false);
 });
 await run('native error retains queue for retry; system cancellation drops only its batch',async page=>{
  const result=await page.evaluate(async()=>{const q=await import('/src/favoriteQueue.ts');await q.setFavorite(['fixture-0'],true);appleFixture.favoriteError=true;await q.flushFavorites();const retained=JSON.parse(localStorage.getItem('cocowash-android-favorites-v1'));appleFixture.favoriteError=false;await q.flushFavorites();const afterRetry=localStorage.getItem('cocowash-android-favorites-v1');await q.setFavorite(['fixture-1'],true);appleFixture.favoriteCancel=true;await q.flushFavorites();return {retained,afterRetry,afterCancel:localStorage.getItem('cocowash-android-favorites-v1'),favorite:appleFixture.assets[0].favorite,notApplied:appleFixture.assets[1].favorite};});
  assert.deepEqual(result,{retained:{'fixture-0':true},afterRetry:null,afterCancel:null,favorite:true,notApplied:undefined});
 });
 await run('interrupted confirmation marker keeps an undo explicit after restart',async page=>{
  const result=await page.evaluate(async()=>{appleFixture.assets[0].favorite=true;localStorage.setItem('cocowash-android-favorites-v1',JSON.stringify({'fixture-0':true}));localStorage.setItem('cocowash-android-favorites-inflight-v1',JSON.stringify({'fixture-0':true}));const q=await import('/src/favoriteQueue.ts');await q.setFavorite(['fixture-0'],false);await q.flushFavorites();return {favorite:appleFixture.assets[0].favorite,marker:localStorage.getItem('cocowash-android-favorites-inflight-v1')};});assert.deepEqual(result,{favorite:false,marker:null});
 });
 await run('failed persistence never records a successful queued favorite',async page=>{
  await page.evaluate(()=>{const real=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='cocowash-android-favorites-v1')throw new DOMException('Fixture storage full','QuotaExceededError');return real.call(this,key,value);};});
  await page.getByRole('button',{name:'Añadir a Favoritas',exact:true}).click();await page.waitForTimeout(400);
  assert.deepEqual((await stored(page)).record.favorites,[]);assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='favorite')),false);
 });
}finally{await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify({boundary:'Edge + synthetic Android bridge; not native execution',results},null,2)+'\n');}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
