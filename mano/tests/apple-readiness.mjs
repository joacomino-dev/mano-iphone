import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { installAppleFixture } from './apple-fixture.mjs';

// Run against Vite's native.html, with a browser-only Capacitor fixture.
// No real Photos, ads, purchases, certificates or device are involved.
const url = process.env.APPLE_AUDIT_URL || 'http://127.0.0.1:4186/native.html';
const output = path.resolve(process.env.APPLE_AUDIT_OUTPUT || '../work/apple-readiness/web');
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL || 'msedge',headless:true});
const results = [], contexts = [];
async function open(options = {}, viewport = {width:390,height:844}) {
  const context = await browser.newContext({viewport,reducedMotion:'reduce'}); contexts.push(context);
  await context.addInitScript(installAppleFixture, options);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.bringToFront();
  await page.locator('.mano-app').waitFor();
  if(options.onboarded===false)await page.locator('.onboarding').waitFor();
  else await page.locator('.photo-card').first().waitFor();
  await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
  await page.waitForTimeout(180);
  return {page,errors};
}
async function check(name, run) {
  if(process.env.APPLE_AUDIT_MATCH&&!name.includes(process.env.APPLE_AUDIT_MATCH))return;
  const firstContext=contexts.length;
  try { await run(); results.push({name,status:'PASS'}); }
  catch(e) { results.push({name,status:'FAIL',error:e.message}); }
  finally { await Promise.all(contexts.splice(firstContext).map(c=>c.close())); }
  console.log(results.at(-1).status, name);
}
async function resume(page, status, count) {
  await page.evaluate(({status,count})=>{
    appleFixture.status=status;
    if(count!==undefined)appleFixture.assets=appleFixture.assets.slice(0,count);
    document.dispatchEvent(new Event('visibilitychange'));
  },{status,count});
  await page.waitForTimeout(250);
}
async function discard(page) {
  await page.getByRole('button',{name:'Eliminar',exact:true}).click();
}
async function review(page) {
  await page.getByRole('button',{name:/^Terminar/}).click();
  await page.getByRole('heading',{name:'Una última mirada',exact:true}).waitFor();
}
const stored = page => page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')||'null'));
try {
 await check('permission: authorized → limited reloads the permitted set', async()=>{
   const {page,errors}=await open();
   await resume(page,'limited',1);
   assert.ok(await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='assets').length)>1,'assets was not refreshed');
   assert.equal(await page.locator('.photo-card').count(),1);
   assert.deepEqual(errors,[]); await page.screenshot({path:path.join(output,'limited.png')});
 });
 await check('permission: changing the limited selection with the same status refreshes it',async()=>{
   const {page}=await open({status:'limited'}); await resume(page,'limited',1);
   assert.equal(await page.locator('.photo-card').count(),1);
   assert.ok(await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='assets').length)>1,'same-status limited set was not refreshed');
 });
 await check('permission: revocation closes review; regrant reloads without losing decisions',async()=>{
   const {page}=await open(); await discard(page); await review(page);
   await resume(page,'denied');
   assert.equal(await page.getByRole('dialog').count(),0,'review remained above the access screen');
   await resume(page,'authorized',2);
   assert.ok(await page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='assets').length)>1);
   await page.waitForTimeout(400); assert.equal((await stored(page)).record.pending.length,1);
 });
 await check('permission during enumeration: a denied native result hides the previous library',async()=>{
   const {page}=await open();await page.evaluate(()=>appleFixture.holdAssets=true);await resume(page,'authorized');
   assert.equal(await page.evaluate(()=>appleFixture.pendingAssets?.length),1);
   await page.evaluate(()=>{appleFixture.status='denied';appleFixture.pendingAssets.splice(0).forEach(resolve=>resolve());});
   await page.waitForTimeout(350);assert.equal(await page.locator('.photo-card').count(),0,'denied enumeration left old photos visible');
 });
 for (const mode of ['cancel','error','partial','success']) await check(`delete contract: ${mode}`,async()=>{
   const {page}=await open(); await discard(page); await discard(page); await review(page);
   // Flush debounce before recording the original queue.
   await page.waitForTimeout(400); const before=(await stored(page)).record.pending;
   assert.equal(before.length,2);
   await page.evaluate(mode=>appleFixture.deleteMode=mode,mode);
   await page.getByRole('button',{name:/^Eliminar 2/}).click(); await page.waitForTimeout(500);
   const after=(await stored(page)).record;
   if(mode==='cancel'||mode==='error') {
     assert.deepEqual(after.pending,before); assert.deepEqual(after.removed,[]);
     assert.equal(await page.getByRole('heading',{name:'Una última mirada',exact:true}).count(),1);
     assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-round-v1')).freed),0);
   } else {
     const requested=await page.evaluate(()=>appleFixture.calls.findLast(c=>c.method==='deleteAssets').args.ids);
     const gone=mode==='partial'?requested.slice(0,1):requested;
     assert.deepEqual([...after.removed].sort(),[...gone].sort()); assert.deepEqual(after.pending,before.filter(id=>!gone.includes(id)));
     assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-round-v1')).freed),gone.length*1000000);
     await page.screenshot({path:path.join(output,`delete-${mode}-summary.png`)});
   }
 });
 await check('deletion: a stale foreground refresh cannot undo confirmed removal',async()=>{
   const {page}=await open(); await discard(page); await review(page);
   await page.evaluate(()=>{appleFixture.holdAssets=true;appleFixture.deleteMode='success';});
   await resume(page,'authorized');
   assert.equal(await page.evaluate(()=>appleFixture.pendingAssets?.length),1);
   await page.getByRole('button',{name:/^Eliminar 1/}).click(); await page.waitForTimeout(450);
   const removed=(await stored(page)).record.removed; assert.equal(removed.length,1);
   await page.evaluate(()=>appleFixture.pendingAssets.splice(0).forEach(resolve=>resolve()));
   await page.waitForTimeout(450);
   assert.deepEqual((await stored(page)).record.removed,removed,'old Photos snapshot resurrected a confirmed deletion');
 });
 if (!process.argv.includes('--contracts-only')) {
   await check('secondary screens: settings, support, album, inspector and video',async()=>{
     const {page,errors}=await open();
     await page.getByRole('button',{name:'Filtros',exact:true}).click();
     for(const name of ['Ajustes','Apoyo']) {
       await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(250);
       await page.screenshot({path:path.join(output,`${name}.png`)});
     }
     await page.getByRole('button',{name:'Cerrar',exact:true}).click();
     await page.getByRole('button',{name:'Álbum',exact:true}).click();
     await page.getByRole('heading',{name:'Guardar en un álbum',exact:true}).waitFor({timeout:2000});
     await page.screenshot({path:path.join(output,'album.png')});
     await page.getByRole('button',{name:'Cerrar',exact:true}).click();
     const anchor=page.getByRole('button',{name:'Anclar',exact:true});await anchor.focus();await anchor.press('Enter');
     await page.locator('.inspection.is-pinned').waitFor();await page.screenshot({path:path.join(output,'inspector.png')});
     assert.deepEqual(errors,[]);
     const video=await open({video:true});await video.page.screenshot({path:path.join(output,'video.png')});assert.deepEqual(video.errors,[]);
   });
   await check('resizing: the current card and saved decisions survive width/height changes',async()=>{
     const {page}=await open();await discard(page);await page.waitForTimeout(400);
     const before=await stored(page);const label=await page.locator('.photo-card').first().getAttribute('aria-label');
     for(const [width,height] of [[890,626],[360,626],[390,844]]){
       await page.setViewportSize({width,height});await page.waitForTimeout(180);
       assert.equal(await page.locator('.photo-card').first().getAttribute('aria-label'),label);
     }
     await page.waitForTimeout(400);assert.deepEqual((await stored(page)).record,before.record);
   });
   await check('safe areas: asymmetric left/right insets protect app and sheet controls',async()=>{
     const {page}=await open();
     const css=await fs.readFile(new URL('../src/prototype.css',import.meta.url),'utf8');
     // Edge has no iOS safe-area environment: substitute synthetic numbers in
     // the actual stylesheet, rather than claiming this is a Duo measurement.
     await page.addStyleTag({content:css.replace(/env\(safe-area-inset-(left|right|top|bottom)\)/g,(_,side)=>({left:'10px',right:'70px',top:'0px',bottom:'0px'}[side]))});
     const pads=await page.locator('.on-device').evaluate(el=>{const s=getComputedStyle(el);return {left:parseFloat(s.paddingLeft),right:parseFloat(s.paddingRight),gutter:parseFloat(s.getPropertyValue('--cw-gutter'))};});
     assert.equal(pads.left,pads.gutter+10);assert.equal(pads.right,pads.gutter+70);
     await page.getByRole('button',{name:'Filtros',exact:true}).click();
     const sheet=await page.locator('.native-sheet').evaluate(el=>{const s=getComputedStyle(el);return [parseFloat(s.paddingLeft),parseFloat(s.paddingRight)];});
     assert.deepEqual(sheet,[10,70]);
     await page.screenshot({path:path.join(output,'asymmetric-sheet.png')});
   });
   for(const [name,width,height,language] of [
     ['se',375,667,'es'],['mini',375,812,'en'],['max',440,956,'de'],
     ['wide-short-stress',890,626,'es'],['split-stress',360,626,'ar'],['narrow-stress',320,568,'ja']]) {
     await check(`layout fixture: ${name}`,async()=>{
       const {page,errors}=await open({language},{width,height});
       await page.screenshot({path:path.join(output,`${name}-session.png`)});
       assert.deepEqual(errors,[]);
       const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
       assert.equal(overflow,false,'document has horizontal overflow');
       if(language==='es') {
         await discard(page); await review(page); await page.screenshot({path:path.join(output,`${name}-review.png`)});
         await page.getByRole('button',{name:'Cerrar',exact:true}).click();
         await page.getByRole('button',{name:'Filtros',exact:true}).click();
         await page.screenshot({path:path.join(output,`${name}-filters.png`)});
       }
     });
   }
   await check('onboarding: four compact captures and reachable next control',async()=>{
     const {page,errors}=await open({onboarded:false},{width:375,height:667});
     for(let i=1;i<=4;i++) {
       await page.waitForTimeout(450);
       await page.screenshot({path:path.join(output,`se-onboarding-${i}.png`)});
       if(i<4)await page.getByRole('button',{name:'Continuar',exact:true}).click();
     }
     assert.deepEqual(errors,[]);
   });
 }
} finally {
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),boundary:'Edge + synthetic Capacitor bridge; not iOS or physical-device QA',results},null,2)+'\n');
 await Promise.all(contexts.map(c=>c.close())); await browser.close();
}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
