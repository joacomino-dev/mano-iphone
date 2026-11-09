// Muting/unmuting a playing video must not pause or restart it (user, 2026-11-09):
// the sound toggle behaves like the VHS «eye» toggle. Edge + synthetic bridge.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {installAppleFixture} from './apple-fixture.mjs';
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
try{
 await context.addInitScript(installAppleFixture,{video:true});
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(url);
 await page.waitForFunction(()=>{const v=document.querySelector('.photo-card.front video');return v&&!v.paused&&v.currentTime>0;});
 await page.evaluate(()=>{const v=document.querySelector('.photo-card.front video');window.pauses=0;window.playCalls=0;v.addEventListener('pause',()=>window.pauses++);const play=v.play.bind(v);v.play=()=>{window.playCalls++;return play();};});
 for(const label of ['Activar sonido','Silenciar','Activar sonido']){
  await page.locator('.photo-card.front').getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(300);
 }
 const r=await page.evaluate(()=>{const v=document.querySelector('.photo-card.front video');return {pauses:window.pauses,playCalls:window.playCalls,paused:v.paused,muted:v.muted};});
 assert.equal(r.pauses,0,'toggling sound must never pause the video');assert.equal(r.playCalls,0,'toggling sound must not restart playback');
 assert.equal(r.paused,false);assert.equal(r.muted,false,'sound is on after the last toggle');
 console.log('PASS mute and unmute never pause or restart a playing video',JSON.stringify(r));
}catch(e){console.log('FAIL mute flow',e.message);process.exitCode=1;}finally{await browser.close();}
