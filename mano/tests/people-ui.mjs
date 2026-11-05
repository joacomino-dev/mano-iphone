import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.COCOWASH_QA_URL ?? 'http://127.0.0.1:4311';
const browser = await chromium.launch({channel:'msedge',headless:true});
const result = { fixtureOnly:true, checks:[] };
try {
 for (const reduced of [false,true]) {
  const page = await browser.newPage({viewport:{width:430,height:932},reducedMotion:reduced?'reduce':'no-preference'}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.fixtureCalls=[];
   window.Capacitor={PluginHeaders:[{name:'People',methods:[{name:'command',rtype:'promise'}]}],nativePromise:async(_plugin,_method,options)=>{
    window.fixtureCalls.push(options);
    await new Promise(r=>setTimeout(r,options.id==='first'?500:60));
    if(options.id==='unknown')throw new Error('Test: uncertain identity');
    return {path:`/assets/demo/postcard-2.svg?protected=${options.id}`};
   }};
  });
  await page.goto(`${base}/tests/people-ui.html`);
  const finish=page.locator('#review-trigger');await finish.waitFor();
  // aria-disabled announces unavailability; physical taps still give feedback.
  const pressEmpty=async()=>{const b=await finish.boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
  await pressEmpty();assert.equal(await page.locator('.empty-finish-message').count(),0);
  await pressEmpty();await pressEmpty();await page.locator('.empty-finish-message').waitFor();
  assert.equal(await page.locator('#finished').textContent(),'0');
  await page.locator('#add-pending').click();await finish.click();assert.equal(await page.locator('#finished').textContent(),'1');
  // Retained component, new asset: a late first result must never appear on second.
  await page.reload();await page.locator('#next').click();
  await page.waitForFunction(()=>document.querySelector('#protected img')?.getAttribute('src')?.includes('protected=second'));
  await page.waitForTimeout(650);assert.match(await page.locator('#protected img').getAttribute('src'),/protected=second/);
  await page.locator('#hidden-mode').click();assert.equal(await page.locator('#protected img').count(),0);
  const requests=await page.evaluate(()=>window.fixtureCalls.length);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.fixtureCalls.length),requests);
  await page.getByRole('button',{name:'Revelar durante 3 segundos'}).click();await page.locator('#protected img').waitFor();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.locator('#protected img').count(),0);
  // Cancel a reveal before its async thumbnail result can commit.
  await page.evaluate(()=>{document.querySelector('#protected button').click();window.dispatchEvent(new Event('blur'));});
  await page.waitForTimeout(100);assert.equal(await page.locator('#protected img').count(),0);
  await page.locator('#face-mode').click();await page.locator('#unknown').click();await page.waitForTimeout(200);assert.equal(await page.locator('#protected img').count(),0);
  const retry=page.getByRole('button',{name:'Reintentar censura'});await retry.waitFor();
  await retry.click();await page.waitForFunction(()=>window.fixtureCalls.some(c=>c.id==='unknown'&&c.refresh===true));
  assert.equal(await page.locator('#protected img').count(),0);
  const transforms=await page.locator('.cloud-ring').evaluate(el=>[...el.children].map(svg=>({ring:svg.classList.contains('cloud-progress-ring'),transform:getComputedStyle(svg).transform})));
  assert.equal(transforms.find(t=>!t.ring).transform,'none');assert.notEqual(transforms.find(t=>t.ring).transform,'none');
  assert.deepEqual(errors,[]);result.checks.push({reducedMotion:reduced,emptyFinish:true,positiveFinish:true,staleRedactionRejected:true,hiddenWithoutRequests:true,revealCancelledOnInterruption:true,uncertaintyCovered:true,retryBypassesNativeCache:true,cloudIconUpright:true,errors});
  await page.close();
 }
 console.log(JSON.stringify(result));
 if(process.env.COCOWASH_QA_REPORT)fs.writeFileSync(process.env.COCOWASH_QA_REPORT,JSON.stringify(result,null,2));
} finally { await browser.close(); }
