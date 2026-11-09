// R-00 resume rule (user, 2026-11-08): returning to the app re-reads the whole
// library only when Photos reported a change, the permission changed, access is
// limited or nothing is loaded. Edge + synthetic bridge; not iPhone evidence.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {installAppleFixture} from './apple-fixture.mjs';
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});let failed=false;
async function run(name,options,body){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  await context.addInitScript(installAppleFixture,options);
  await context.addInitScript(()=>{window.appleFixture.version=7;});
  const page=await context.newPage();page.setDefaultTimeout(12000);await page.goto(url);
  await page.locator('.photo-card.front').waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
  await body(page);console.log('PASS',name);
 }catch(e){failed=true;console.log('FAIL',name,e.message);}finally{await context.close();}
}
const resume=page=>page.evaluate(()=>{appleFixture.calls.length=0;document.dispatchEvent(new Event('visibilitychange'));});
const enumerations=page=>page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='assets').length);
try{
 await run('unchanged library: resuming does not enumerate it again',{},async page=>{
  for(let i=0;i<5;i++){await resume(page);await page.waitForTimeout(250);}
  assert.equal(await enumerations(page),0,'no full-library work on an unchanged resume');
 });
 await run('Photos reported a change: one resume enumerates once, the next does not',{},async page=>{
  await page.evaluate(()=>{appleFixture.version=8;appleFixture.assets=appleFixture.assets.slice(1);});
  await resume(page);await page.waitForFunction(()=>appleFixture.calls.some(c=>c.method==='assets'));
  await page.waitForTimeout(300);await resume(page);await page.waitForTimeout(300);
  assert.equal(await enumerations(page),0,'the counter was recorded with the new enumeration');
 });
 await run('limited access always refreshes (the selection may have changed)',{status:'limited'},async page=>{
  await resume(page);await page.waitForFunction(()=>appleFixture.calls.some(c=>c.method==='assets'));
 });
}finally{await browser.close();}
if(failed)process.exitCode=1;
