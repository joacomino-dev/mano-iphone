// JS/native-label contract only, with a synthetic SDK response. No native ad or ad fill claim.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {installAppleFixture} from './apple-fixture.mjs';
const out=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/r47-labels');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{
 for(const language of ['es','ar']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
   await context.addInitScript(installAppleFixture,{language});
   await context.addInitScript(()=>{
    window.androidBridge={postMessage(){throw Error('Real Android bridge forbidden');}};
    appleFixture.adFree=false;appleFixture.adReady=true;
    localStorage.setItem('cocowash-ad-active-ms-v1','60000');
   });
   const page=await context.newPage();await page.goto(process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html');
   await page.locator('.photo-card.front').waitFor();
   await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
   await page.locator('.bar-discard').click();await page.locator('#review-trigger').click();
   await page.waitForFunction(()=>appleFixture.calls.some(c=>c.plugin==='CocoMonetization'&&c.method==='show'),{},{timeout:20000});
   const shown=await page.evaluate(()=>appleFixture.calls.find(c=>c.plugin==='CocoMonetization'&&c.method==='show').args);
   assert.equal(shown.labels.direction,language==='ar'?'rtl':'ltr');
   assert.equal(shown.labels.stamp,language==='ar'?'إعلان':'Publicidad');
   assert.equal(await page.locator('html').getAttribute('dir'),language==='ar'?'rtl':'ltr');
   results.push({language,status:'PASS',direction:shown.labels.direction});
  }catch(e){results.push({language,status:'FAIL',error:e.stack});}finally{await context.close();}
  console.log(results.at(-1).status,language,results.at(-1).error??'');
 }
}finally{await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify({boundary:'Windows Edge, synthetic ad SDK; not a native font/layout/ad-fill test',results},null,2));}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
