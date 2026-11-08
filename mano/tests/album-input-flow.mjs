// Controlled native input paths with synthetic Capacitor only, not native evidence.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {installAppleFixture} from './apple-fixture.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
const out=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/strategic/album');await fs.mkdir(out,{recursive:true});
async function run(name,test){const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{await context.addInitScript(installAppleFixture,{});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000);
 await page.goto(process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html');await page.locator('.photo-card').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
 await page.getByRole('button',{name:'Álbum',exact:true}).click();await page.getByRole('button',{name:'Crear álbum nuevo',exact:true}).click();
 await test(page,page.getByPlaceholder('Por ejemplo, Verano'),page.getByRole('button',{name:/^Crear y añadir/}));assert.deepEqual(errors,[]);results.push({name,status:'PASS'});
 }catch(error){results.push({name,status:'FAIL',error:error.message});}finally{await context.close();}console.log(results.at(-1).status,name,results.at(-1).error??'');}
try{
 await run('input event after native-style value assignment updates controlled state',async(page,input,save)=>{
  await input.evaluate(el=>{el.value='CocoWash input fixture';el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'CocoWash input fixture'}));});
  assert.equal(await save.isEnabled(),true,'An input event must update state even when React value tracking already saw the DOM value');
  await save.click();await save.waitFor({state:'detached'});
  const calls=await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='createAlbum'));assert.equal(calls.length,1);assert.equal(calls[0].args.title,'CocoWash input fixture');
 });
 await run('ordinary input and composition text create exactly one album',async(page,input,save)=>{
  await input.fill('夏の思い出');await save.click();await save.waitFor({state:'detached'});
  const calls=await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='createAlbum'));assert.equal(calls.length,1);assert.equal(calls[0].args.title,'夏の思い出');
 });
 await run('empty and whitespace-only names remain disabled',async(page,input,save)=>{
  assert.equal(await save.isDisabled(),true);await input.fill('   ');assert.equal(await save.isDisabled(),true);
  assert.equal(await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='createAlbum').length),0);
 });
}finally{await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify({boundary:'Browser input event emulation only; native XCTest must prove iOS behavior',results},null,2)+'\n');}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
