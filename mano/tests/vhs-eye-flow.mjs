// R-68: the eye remains usable with VHS off. Synthetic assets only.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {installAppleFixture} from './apple-fixture.mjs';
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const out=process.env.VHS_EYE_OUT||'../work/vhs-eye';
const platform=process.env.VHS_EYE_PLATFORM||'ios';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});
let failures=0;
for(const reducedMotion of ['no-preference','reduce']){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion});
 try{
  await context.addInitScript(installAppleFixture,{video:true,resetStorage:false});
  if(platform==='android')await context.addInitScript(()=>{window.androidBridge={postMessage(){throw new Error('Real Android bridge forbidden');}};});
  await context.addInitScript(()=>{if(!localStorage.getItem('cocowash-display-v1'))localStorage.setItem('cocowash-display-v1',JSON.stringify({video:{osd:false}}));});
  const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(url);
  assert.equal(await page.evaluate(async()=>(await import('/src/locales/android.ts')).onAndroid()),platform==='android');
  await page.waitForFunction(()=>{const v=document.querySelector('.photo-card.front video');return v&&!v.paused&&v.currentTime>0&&!document.querySelector('.splash-lockup');});
  const card=page.locator('.photo-card.front');
  const eye=()=>card.getByRole('button',{name:/^(Mostrar|Ocultar) letras VHS$/});
  async function checkEye(on){
   assert.equal(await eye().isVisible(),true,'eye must be visible');
   assert.equal(await eye().getAttribute('aria-label'),on?'Ocultar letras VHS':'Mostrar letras VHS');
   assert.equal(await eye().getAttribute('aria-pressed'),String(on));
   const b=await eye().boundingBox(),c=await card.boundingBox();
   assert.ok(b&&c&&b.width>0&&b.height>0&&b.x>=c.x&&b.y>=c.y&&b.x+b.width<=c.x+c.width&&b.y+b.height<=c.y+c.height,'eye must be inside card');
   assert.equal(await eye().evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'eye must not be covered');
   await page.waitForFunction(on=>!!document.querySelector('.photo-card.front .vhs-osd')===on,on);
  }
  await checkEye(false);await page.screenshot({path:`${out}/${reducedMotion}-off.png`});
  await page.evaluate(()=>{const v=document.querySelector('.photo-card.front video');window.eyeVideo=v;window.eyeEvents={pauses:0,plays:0,seeks:0,assignments:0,loads:0,muted:v.muted};v.addEventListener('pause',()=>eyeEvents.pauses++);v.addEventListener('seeking',()=>eyeEvents.seeks++);v.addEventListener('emptied',()=>eyeEvents.loads++);const play=v.play.bind(v);v.play=()=>{eyeEvents.plays++;return play();};const time=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');Object.defineProperty(v,'currentTime',{get(){return time.get.call(v);},set(value){eyeEvents.assignments++;time.set.call(v,value);},configurable:true});});
  await eye().click();await checkEye(true);await page.screenshot({path:`${out}/${reducedMotion}-on.png`});
  await eye().click();await checkEye(false);
  const playback=await page.evaluate(()=>({same:eyeVideo===document.querySelector('.photo-card.front video'),paused:eyeVideo.paused,muted:eyeVideo.muted,...eyeEvents}));
  assert.equal(playback.same,true);assert.equal(playback.paused,false);
  assert.equal(playback.pauses,0);assert.equal(playback.plays,0);assert.equal(playback.loads,0);
  // A natural loop emits seeking; only application assignments indicate a reset.
  assert.equal(playback.assignments,0);
  assert.equal(await page.evaluate(()=>eyeVideo.muted),playback.muted);
  await page.getByRole('button',{name:'Filtros',exact:true}).click();
  await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  const settings=page.locator('.settings-section').filter({has:page.getByRole('heading',{name:'Vídeos',exact:true})});
  const toggle=settings.getByRole('switch',{name:'Letras VHS',exact:true});
  assert.equal(await toggle.isChecked(),false);
  for(const name of ['Fecha','Hora','Ubicación','Duración'])assert.equal(await settings.getByRole('switch',{name,exact:true}).count(),1);
  assert.equal(await settings.getByRole('switch',{name:/^Peso/}).count(),1);
  assert.equal(await settings.getByRole('group',{name:'Tamaño de las letras',exact:true}).count(),0);
  await toggle.check();
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();await checkEye(true);
  await page.reload();await page.waitForFunction(()=>!document.querySelector('.splash-lockup')&&!!document.querySelector('.photo-card.front video'));
  await checkEye(true);
  console.log('PASS VHS eye',platform,reducedMotion,JSON.stringify(playback));
 }catch(e){failures++;console.error('FAIL VHS eye',reducedMotion,e.stack);}finally{await context.close();}
}
await browser.close();if(failures)process.exitCode=1;
