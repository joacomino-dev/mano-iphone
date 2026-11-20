// CocoWash's explainer before Apple's tracking alert (1.1): shown once the first ad is prepared while
// Apple has not asked yet; it only goes away through «Continuar», which asks Apple, and then ads
// prepare again. Synthetic plugin (apple-fixture); no real ATT alert, ad SDK or fill.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {installAppleFixture} from './apple-fixture.mjs';
const out=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/tracking-ask');await fs.mkdir(out,{recursive:true});
const url=process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html';
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
const cases=[['es',{width:390,height:844},'notDetermined'],['en',{width:375,height:667},'notDetermined'],['es',{width:390,height:844},'denied']];
try{
 for(const [language,viewport,tracking] of cases){
  const name=`${language}-${viewport.width}-${tracking}`;
  const context=await browser.newContext({viewport,deviceScaleFactor:2,reducedMotion:'reduce'});
  try{
   await context.addInitScript(installAppleFixture,{language});
   await context.addInitScript(tracking=>{
    window.androidBridge={postMessage(){throw Error('Real Android bridge forbidden');}};
    appleFixture.adFree=false;appleFixture.adReady=true;appleFixture.trackingStatus=tracking;appleFixture.trackingAnswer='authorized';
    localStorage.setItem('cocowash-ad-active-ms-v1','60000');
    localStorage.setItem('cocowash-tips-v1','{"seen":["stack","zoom","anchor","album"]}');
   },tracking);
   const page=await context.newPage();await page.goto(url);
   await page.locator('.photo-card.front').waitFor();
   await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));
   const calls=method=>page.evaluate(m=>appleFixture.calls.filter(c=>c.plugin==='CocoMonetization'&&c.method===m).length,method);
   const dialog=page.getByRole('dialog');
   if(tracking!=='notDetermined'){
    // Apple already answered: no explainer, ads prepare as before.
    await page.waitForFunction(()=>appleFixture.calls.some(c=>c.method==='prepare'),{},{timeout:15000});
    await page.waitForTimeout(800);
    assert.equal(await dialog.count(),0,'explainer shown after Apple already asked');
    assert.equal(await calls('askTracking'),0);
    results.push({name,status:'PASS'});console.log('PASS',name);continue;
   }
   await dialog.waitFor({timeout:15000});
   const title=language==='es'?'CocoWash es gratis gracias a los anuncios':'CocoWash is free thanks to ads';
   assert.equal(await dialog.getAttribute('aria-modal'),'true');
   assert.equal(await page.locator('#tracking-ask-title').textContent(),title);
   // One way on: a single button, no close; Escape and a tap outside the card keep it.
   assert.equal(await dialog.getByRole('button').count(),1);
   await page.keyboard.press('Escape');await page.mouse.click(viewport.width/2,8);await page.waitForTimeout(300);
   assert.equal(await dialog.count(),1,'explainer was dismissed without Apple');
   assert.equal(await calls('askTracking'),0,'Apple asked before «Continuar»');
   // Fits the screen: card fully visible, Coqui not clipped at the top.
   const box=await page.locator('.tracking-ask-card').boundingBox(),coqui=await page.locator('.tracking-ask-coqui').boundingBox();
   assert.ok(box.y+box.height<=viewport.height&&coqui.y>=0,`card off screen ${JSON.stringify({box,coqui})}`);
   await page.screenshot({path:path.join(out,`${name}.png`)});
   const prepares=await calls('prepare');
   await dialog.getByRole('button',{name:language==='es'?'Continuar':'Continue'}).click();
   await dialog.waitFor({state:'detached'});
   assert.equal(await calls('askTracking'),1);
   await page.waitForFunction(n=>appleFixture.calls.filter(c=>c.method==='prepare').length>n,prepares,{timeout:5000});
   await page.waitForTimeout(500);
   assert.equal(await dialog.count(),0,'explainer came back after Apple answered');
   results.push({name,status:'PASS'});console.log('PASS',name);
  }catch(e){results.push({name,status:'FAIL',error:e.stack});console.log('FAIL',name,e.stack);}finally{await context.close();}
 }
}finally{await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify({boundary:'Windows Edge, synthetic monetization plugin; not the real ATT alert',results},null,2));}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
