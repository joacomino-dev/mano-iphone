// UI behavior with CocoWash's synthetic postcard/video, not an actual Live Photo.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {installAppleFixture} from './apple-fixture.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
const out=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/cx022/live');await fs.mkdir(out,{recursive:true});
async function run(name,reducedMotion,test){const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion});
 try{await context.addInitScript(installAppleFixture,{});await context.addInitScript(()=>{appleFixture.assets=[{...appleFixture.assets[0],kind:'live',width:1500,height:1000}];});const page=await context.newPage();page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html');await page.locator('.photo-card').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
 await test(page);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>appleFixture.calls.some(c=>c.method==='preview')),false,'Live Photo must never open a separate native player');results.push({name,status:'PASS'});
 }catch(e){results.push({name,status:'FAIL',error:e.stack});}finally{await context.close();}console.log(results.at(-1).status,name,results.at(-1).error??'');}
try{
 for(const reduce of ['reduce','no-preference'])await run(`Live card explicit play/loop/pause key photo (${reduce})`,reduce,async page=>{
  await page.waitForTimeout(250);assert.equal(await page.locator('video').count(),0,'No preparation/player before explicit play');
  await page.getByRole('button',{name:'Reproducir Live Photo',exact:true}).click();const video=page.locator('.photo-card video');await video.waitFor();
  await page.waitForFunction(()=>{const v=document.querySelector('.photo-card video');return v&&!v.paused&&v.currentTime>0;});
  assert.equal(await video.evaluate(v=>v.loop),true);await page.getByRole('button',{name:'Pausar',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.photo-card video')?.paused===true);
  assert.equal(await page.locator('.photo-card .inline-media.is-started').count(),0,'Card pause must show the still/key photo, not a frozen motion frame');
  await page.screenshot({path:path.join(out,`card-${reduce}.png`)});
 });
 await run('pause during preparation stays paused after ready and foreground', 'reduce',async page=>{
  await page.getByRole('button',{name:'Reproducir Live Photo',exact:true}).click();
  await page.getByRole('button',{name:'Pausar',exact:true}).click();await page.locator('.photo-card video').waitFor();
  await page.waitForTimeout(300);assert.equal(await page.locator('.photo-card video').evaluate(v=>v.paused),true);
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(300);assert.equal(await page.locator('.photo-card video').evaluate(v=>v.paused),true);
  assert.equal(await page.locator('.photo-card .inline-media.is-started').count(),0);
 });
 await run('anchored Live Photo has in-place controls, timeline pause and photo pinch', 'reduce',async page=>{
  await page.getByRole('button',{name:'Anclar',exact:true}).focus();await page.keyboard.press('Enter');const inspector=page.locator('.inspection.is-pinned');await inspector.waitFor();
  assert.equal(await inspector.locator('video').count(),0);
  await inspector.getByRole('button',{name:'Reproducir',exact:true}).click();await inspector.locator('video').waitFor();
  try{await page.waitForFunction(()=>{const v=document.querySelector('.inspection video');return v&&!v.paused&&v.duration>0;});}catch(e){console.log(await inspector.evaluate(el=>({text:el.innerText,video:[...el.querySelectorAll('video')].map(v=>({src:v.src,paused:v.paused,time:v.currentTime,duration:v.duration,error:v.error?.message})),calls:appleFixture.calls})));throw e;}
  const slider=inspector.getByRole('slider',{name:'Posición del vídeo',exact:true});await slider.fill('1');
  await page.waitForFunction(()=>{const v=document.querySelector('.inspection video');return v?.paused&&Math.abs(v.currentTime-1)<.1;});
  assert.equal(await inspector.getByRole('button',{name:'Pantalla completa',exact:true}).count(),0);
  const frame=inspector.locator('.inspection-photo'),box=await frame.boundingBox(),cdp=await page.context().newCDPSession(page);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-40,y,id:1},{x:x+40,y,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-40,y,id:1},{x:x+110,y,id:2}]});
  const style=await inspector.locator('video').getAttribute('style');assert.ok(Number(/scale\(([^)]+)/.exec(style)?.[1])>1.2,style);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.screenshot({path:path.join(out,'anchor.png')});await inspector.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('button',{name:'Conservar',exact:true}).click();await page.waitForTimeout(400);assert.equal(await page.locator('video').count(),0,'Decoded media must leave with its card');
 });
}finally{await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify({boundary:'Browser + synthetic postcard/video only. Native paired resource, Apple-selected key photo and iCloud require Apple QA.',results},null,2)+'\n');}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
