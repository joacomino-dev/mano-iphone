import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { installAppleFixture } from './apple-fixture.mjs';
const output=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/phase2-safety');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});
const results=[];
async function scenario(name,run,options={}){
 if(process.env.APPLE_AUDIT_MATCH&&!name.includes(process.env.APPLE_AUDIT_MATCH))return;
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  await context.addInitScript(installAppleFixture,options);const page=await context.newPage();
  await page.goto(process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html');await page.bringToFront();
  if(options.status==='denied')await page.getByRole('button',{name:'Abrir Ajustes',exact:true}).waitFor();
  else await page.locator('.photo-card').first().waitFor();
  await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
  await run(page);results.push({name,status:'PASS'});
 }catch(error){results.push({name,status:'FAIL',error:error.message});}
 finally{await context.close();}
 console.log(results.at(-1).status,name);
}
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')));
const discard=page=>page.getByRole('button',{name:'Eliminar',exact:true}).click();
async function review(page){await page.getByRole('button',{name:/^Terminar/}).click();await page.getByRole('heading',{name:'Una última mirada',exact:true}).waitFor();}
try{
 await scenario('manual refresh: old snapshot cannot resurrect a confirmed deletion',async page=>{
  await discard(page);await page.getByRole('button',{name:'Filtros',exact:true}).click();
  await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  await page.evaluate(()=>appleFixture.holdAssets=true);
  await page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click();
  await page.waitForFunction(()=>appleFixture.pendingAssets?.length===1);
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();await review(page);
  await page.evaluate(()=>appleFixture.deleteMode='success');
  await page.getByRole('button',{name:/^Eliminar 1/}).click();await page.waitForTimeout(450);
  const removed=(await stored(page)).record.removed;assert.equal(removed.length,1);
  await page.evaluate(()=>appleFixture.pendingAssets.splice(0).forEach(resolve=>resolve()));await page.waitForTimeout(450);
  assert.deepEqual((await stored(page)).record.removed,removed,'manual refresh erased confirmed removals');
 });
 await scenario('pending deletion: individual recovery cannot contradict an in-flight system operation',async page=>{
  await discard(page);await review(page);await page.evaluate(()=>appleFixture.holdDelete=true);
  await page.getByRole('button',{name:/^Eliminar 1/}).click();await page.waitForFunction(()=>appleFixture.pendingDeletes?.length===1);
  assert.equal(await page.locator('.recover-button').first().isDisabled(),true,'individual recovery remained active after deletion was submitted');
  await page.evaluate(()=>appleFixture.pendingDeletes.splice(0).forEach(resolve=>resolve()));await page.waitForTimeout(450);
  assert.equal(await page.locator('.recover-button').first().isEnabled(),true,'cancelling Photos did not restore recovery');
  assert.equal((await stored(page)).record.pending.length,1);
 });
 await scenario('manual refresh: permission denied during enumeration closes the sheet and old library',async page=>{
  await page.getByRole('button',{name:'Filtros',exact:true}).click();await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  await page.evaluate(()=>appleFixture.holdAssets=true);await page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click();
  await page.waitForFunction(()=>appleFixture.pendingAssets?.length===1);
  await page.evaluate(()=>{appleFixture.status='denied';appleFixture.pendingAssets.splice(0).forEach(resolve=>resolve());});await page.waitForTimeout(300);
  assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.locator('.photo-card').count(),0);
 });
 await scenario('out-of-order enumeration: a newer limited result wins over an older full result',async page=>{
  await page.getByRole('button',{name:'Filtros',exact:true}).click();await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  await page.evaluate(()=>appleFixture.holdAssets=true);await page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click();
  await page.waitForFunction(()=>appleFixture.pendingAssets?.length===1);
  await page.evaluate(()=>{appleFixture.status='limited';appleFixture.assets=appleFixture.assets.slice(0,1);document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>appleFixture.pendingAssets?.length===2);
  await page.evaluate(()=>appleFixture.pendingAssets.splice(1,1)[0]());await page.waitForTimeout(200);
  await page.evaluate(()=>appleFixture.pendingAssets.splice(0).forEach(resolve=>resolve()));await page.waitForTimeout(200);
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  assert.equal(await page.locator('.archive-progress .is-total').innerText(),'1');
 });
 await scenario('permissions: full → limited → full restores the currently permitted totals',async page=>{
  await page.evaluate(()=>{appleFixture.allAssets=structuredClone(appleFixture.assets);appleFixture.assets=appleFixture.assets.slice(0,1);appleFixture.status='limited';document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(300);assert.equal(await page.locator('.archive-progress .is-total').innerText(),'1');
  await page.evaluate(()=>{appleFixture.status='authorized';appleFixture.assets=appleFixture.allAssets;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(300);assert.equal(await page.locator('.archive-progress .is-total').innerText(),'3');
 });
 await scenario('persistence: discard survives real page reload and undo restores its exact prior state',async page=>{
  const original=await page.locator('.photo-card').first().getAttribute('aria-label');await discard(page);await page.waitForTimeout(400);
  const before=(await stored(page)).record;assert.equal(before.pending.length,1);
  await page.reload();await page.locator('.photo-card').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));await page.waitForTimeout(400);
  assert.deepEqual((await stored(page)).record,before);
  await page.getByRole('button',{name:'Deshacer la última decisión',exact:true}).click();await page.waitForTimeout(400);
  assert.equal((await stored(page)).record.pending.length,0);assert.equal((await stored(page)).record.history.length,0);
  assert.equal(await page.locator('.photo-card').first().getAttribute('aria-label'),original);
 },{resetStorage:false});
 await scenario('permission denied at launch: no library enumeration or destructive request',async page=>{
  assert.equal(await page.locator('.photo-card').count(),0);
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>['assets','deleteAssets'].includes(c.method))),false);
 },{status:'denied'});
 await scenario('cloud contract: offline preview reports failure and a later successful retry shows the image',async page=>{
  const retry=page.getByRole('button',{name:'Reintentar',exact:true}).first();await retry.waitFor();
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='thumbnail'&&c.args.network===true)),true);
  assert.equal((await stored(page)).record.removed.length,0);
  await page.evaluate(()=>appleFixture.thumbnailMode='online');await retry.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.photo-window img')].some(img=>img.complete&&img.naturalWidth>0));
  assert.equal((await stored(page)).record.removed.length,0);
 },{nativeMedia:true,cloudOffline:true});
 await scenario('permission ordering: confirmed deletion cannot discard a pending revocation result',async page=>{
  await discard(page);await review(page);await page.evaluate(()=>{appleFixture.holdDelete=true;appleFixture.deleteMode='success';});
  await page.getByRole('button',{name:/^Eliminar 1/}).click();await page.waitForFunction(()=>appleFixture.pendingDeletes?.length===1);
  await page.evaluate(()=>{appleFixture.holdPermission=true;appleFixture.status='denied';document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>appleFixture.pendingPermissions?.length===1);
  await page.evaluate(()=>appleFixture.pendingDeletes.splice(0).forEach(resolve=>resolve()));await page.waitForTimeout(350);
  await page.evaluate(()=>appleFixture.pendingPermissions.splice(0).forEach(resolve=>resolve()));await page.waitForTimeout(350);
  assert.equal(await page.getByRole('heading',{name:'CocoWash necesita tus fotos',exact:true}).count(),1,'confirmed mutation discarded the latest permission result');
  assert.equal((await stored(page)).record.removed.length,1);
 });
}finally{
 await browser.close();await fs.writeFile(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),boundary:'Edge + synthetic Capacitor fixture; not PhotoKit or native-device execution',results},null,2)+'\n');
}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
