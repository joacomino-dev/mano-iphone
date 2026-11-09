// Anchored view (user, 2026-11-08): only «Cerrar» in the dock; dragging the photo
// away closes it, a short drag springs back. Edge + synthetic bridge, not iPhone.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {installAppleFixture} from './apple-fixture.mjs';
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});let failed=false;
async function run(name,body){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  await context.addInitScript(installAppleFixture,{});
  const page=await context.newPage();page.setDefaultTimeout(12000);await page.goto(url);
  await page.locator('.photo-card.front').waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
  await page.locator('.photo-card.front').getByRole('button',{name:'Anclar',exact:true}).dispatchEvent('click');
  await page.locator('.inspection.is-pinned .inspection-photo').waitFor();
  await body(page);console.log('PASS',name);
 }catch(e){failed=true;console.log('FAIL',name,e.message);}finally{await context.close();}
}
async function drag(page,dy){const box=await page.locator('.inspection-photo').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
 await page.mouse.move(x,y);await page.mouse.down();for(let i=1;i<=8;i++){await page.mouse.move(x,y+dy*i/8);await page.waitForTimeout(16);}await page.mouse.up();}
try{
 await run('dock shows only «Cerrar»',async page=>{
  const dock=page.locator('.inspection-dock.is-pinned');assert.equal(await dock.getByRole('button',{name:'Cerrar'}).count(),1);
  assert.equal(await dock.getByText('Anclada').count(),0);
 });
 await run('a long drag closes the anchored photo',async page=>{
  await drag(page,220);await page.waitForFunction(()=>!document.querySelector('.inspection.is-pinned'));
 });
 await run('a short drag springs back and stays anchored',async page=>{
  await drag(page,30);await page.waitForTimeout(700);assert.equal(await page.locator('.inspection.is-pinned').count(),1);
 });
}finally{await browser.close();}
if(failed)process.exitCode=1;
