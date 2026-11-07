import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {chromium} from '@playwright/test';import {installAppleFixture} from './apple-fixture.mjs';
const output=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/rc-flow');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});const results=[];
async function scenario(name,run){if(process.env.APPLE_AUDIT_MATCH&&!name.includes(process.env.APPLE_AUDIT_MATCH))return;
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{await context.addInitScript(installAppleFixture,{});const page=await context.newPage();await page.goto(process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html');await page.bringToFront();await page.locator('.photo-card').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));await run(page);results.push({name,status:'PASS'});}
 catch(e){results.push({name,status:'FAIL',error:e.message});}finally{await context.close();}console.log(results.at(-1).status,name);
}
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')));
async function settings(page){await page.getByRole('button',{name:'Filtros',exact:true}).click();await page.getByRole('button',{name:'Ajustes',exact:true}).click();}
async function support(page){await page.getByRole('button',{name:'Filtros',exact:true}).click();await page.getByRole('button',{name:'Apoyo',exact:true}).click();}
try{
 await scenario('favorite: stale manual snapshot cannot undo a confirmed favorite',async page=>{
  await settings(page);await page.evaluate(()=>appleFixture.holdAssets=true);await page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click();await page.waitForFunction(()=>appleFixture.pendingAssets?.length===1);await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('button',{name:'Añadir a Favoritas',exact:true}).click();await page.waitForTimeout(400);
  const favorite=(await stored(page)).record.favorites;assert.equal(favorite.length,1);
  await page.evaluate(()=>appleFixture.pendingAssets.splice(0).forEach(resolve=>resolve()));await page.waitForTimeout(400);
  assert.deepEqual((await stored(page)).record.favorites,favorite);
 });
 await scenario('catalog empty: no unavailable purchase buttons or coming-soon claims',async page=>{
  await page.evaluate(()=>{appleFixture.adFree=false;appleFixture.products=[];document.dispatchEvent(new Event('visibilitychange'));});await support(page);await page.waitForTimeout(250);
  assert.equal(await page.locator('.support-stamp').count(),0,'unavailable offers are still visible');
  assert.equal(await page.getByRole('button',{name:'Cargar precios',exact:true}).count(),1);
  assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.plugin==='CocoMonetization'&&c.method==='buy')),false);
 });
 await scenario('catalog error and retry: only available real IDs are offered',async page=>{
  await page.evaluate(()=>{appleFixture.adFree=false;appleFixture.catalogError=true;document.dispatchEvent(new Event('visibilitychange'));});await support(page);
  await page.getByText('Los precios no están disponibles ahora. Prueba en un momento.',{exact:true}).waitFor();
  assert.equal(await page.locator('.support-stamp').count(),0);
  await page.evaluate(()=>{appleFixture.catalogError=false;appleFixture.products=[{id:'work.joaquin.mano.noads.year',price:'US$ 3.99 fixture'}];});
  await page.getByRole('button',{name:'Cargar precios',exact:true}).click();await page.locator('.support-stamp').waitFor();
  assert.equal(await page.locator('.support-stamp').count(),1);
  assert.match(await page.locator('.support-stamp').innerText(),/fixture/);
 });
 for(const outcome of ['cancelled','pending','error','purchased'])await scenario(`purchase ${outcome}: confirmation follows the bridge result`,async page=>{
  await page.evaluate(outcome=>{appleFixture.adFree=false;appleFixture.products=[{id:'work.joaquin.mano.noads.lifetime',price:'US$ 10 fixture'}];appleFixture.purchaseOutcome=outcome;appleFixture.purchaseError=outcome==='error';document.dispatchEvent(new Event('visibilitychange'));},outcome);
  await support(page);await page.locator('.support-stamp').waitFor();await page.locator('.support-stamp').click();
  await page.waitForTimeout(200);
  const message=await page.locator('.support-panel .setting-note').innerText();
  assert.equal(message,outcome==='pending'?'Compra pendiente de aprobación.':outcome==='error'?'No se pudo completar. Inténtalo de nuevo.':outcome==='purchased'?'Listo: ya no verás anuncios.':'');
  assert.equal(await page.evaluate(()=>appleFixture.adFree),outcome==='purchased');
  assert.equal(await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='buy').length),1);
 });
 await scenario('restore failure is never presented as restored',async page=>{
  await page.evaluate(()=>{appleFixture.adFree=false;appleFixture.restoreError=true;document.dispatchEvent(new Event('visibilitychange'));});await support(page);
  await page.getByRole('button',{name:'Restaurar compras',exact:true}).click();
  await page.getByText('No se pudo completar. Inténtalo de nuevo.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>appleFixture.adFree),false);
 });
}finally{await browser.close();await fs.writeFile(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),boundary:'Edge and synthetic bridge/catalog only; not native PhotoKit, ads or StoreKit validation',results},null,2)+'\n');}
if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
