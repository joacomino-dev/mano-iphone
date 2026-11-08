// Actual React/Capacitor proxy with synthetic media. Not PhotoKit/Vision hardware evidence.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {installAppleFixture} from './apple-fixture.mjs';
const browser=await chromium.launch({channel:process.env.APPLE_BROWSER_CHANNEL||'msedge',headless:true});const results=[];
const out=path.resolve(process.env.APPLE_AUDIT_OUTPUT||'../work/apple-readiness/cx021/similarity');await fs.mkdir(out,{recursive:true});
const calls=page=>page.evaluate(()=>appleFixture.calls.filter(c=>c.method==='analyze').length);
const refresh=page=>page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
const waitPass=page=>page.waitForFunction(()=>!!localStorage.getItem('mano-analysis-complete-v1'));
async function scenario(name,options,run){const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{await ctx.addInitScript(installAppleFixture,{measured:true});await ctx.addInitScript(options=>Object.assign(appleFixture,options),options);const page=await ctx.newPage();page.setDefaultTimeout(10000);
 await page.goto(process.env.APPLE_AUDIT_URL||'http://127.0.0.1:4186/native.html');await page.locator('.photo-card').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.splash-lockup'));await run(page);results.push({name,status:'PASS'});
 }catch(e){results.push({name,status:'FAIL',error:e.message});}finally{await ctx.close();}console.log(results.at(-1).status,name,results.at(-1).error??'');}
try{
 await scenario('unchanged refresh retained; additions and edits trigger a new pass',{},async page=>{
  await waitPass(page);assert.equal(await calls(page),1);await refresh(page);await page.waitForTimeout(300);assert.equal(await calls(page),1);
  await page.evaluate(()=>appleFixture.assets.push({...appleFixture.assets[0],id:'new-photo'}));await refresh(page);await page.waitForFunction(()=>appleFixture.calls.filter(c=>c.method==='analyze').length===2);await waitPass(page);
  await page.evaluate(()=>appleFixture.assets[0].modified=123);await refresh(page);await page.waitForFunction(()=>appleFixture.calls.filter(c=>c.method==='analyze').length===3);
 });
 await scenario('metadata edits outside the legacy fingerprint cannot hydrate an old marker again',{},async page=>{
  await waitPass(page);await page.evaluate(()=>appleFixture.assets[0].width+=10);await refresh(page);
  await page.waitForFunction(()=>appleFixture.calls.filter(c=>c.method==='analyze').length===2);
 });
 await scenario('partial pass is not complete; narrowing alone does not repeat failed media', {analysisResult:{groups:[],skipped:1,cancelled:false}},async page=>{
  await page.waitForTimeout(300);assert.equal(await calls(page),1);assert.equal(await page.evaluate(()=>localStorage.getItem('mano-analysis-complete-v1')),null);
  await page.evaluate(()=>{appleFixture.status='limited';appleFixture.assets=appleFixture.assets.slice(1);});await refresh(page);await page.waitForTimeout(400);
  assert.equal(await calls(page),1);assert.equal(await page.evaluate(()=>localStorage.getItem('mano-analysis-complete-v1')),null);
 });
 await scenario('late old analysis cannot overwrite an added photo set',{holdAnalysis:true,analysisResult:{groups:[['fixture-0','fixture-1']],skipped:0,cancelled:false}},async page=>{
  await page.waitForFunction(()=>appleFixture.pendingAnalyses?.length===1);
  await page.evaluate(()=>appleFixture.assets.push({...appleFixture.assets[0],id:'new-photo'}));await refresh(page);await page.waitForTimeout(250);
  await page.evaluate(()=>{appleFixture.holdAnalysis=false;appleFixture.analysisResult={groups:[],skipped:0,cancelled:false};appleFixture.pendingAnalyses.splice(0).forEach(resolve=>resolve());});
  await page.waitForFunction(()=>appleFixture.calls.filter(c=>c.method==='analyze').length===2);await waitPass(page);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mano-similarity-v1'))),{});
 });
 await scenario('revocation invalidates a pending analysis even if its result later succeeds',{holdAnalysis:true,analysisResult:{groups:[['fixture-0','fixture-1']],skipped:0,cancelled:false}},async page=>{
  await page.waitForFunction(()=>appleFixture.pendingAnalyses?.length===1);await page.evaluate(()=>appleFixture.status='denied');await refresh(page);
  await page.waitForFunction(()=>!document.querySelector('.photo-card'));await page.evaluate(()=>{appleFixture.holdAnalysis=false;appleFixture.pendingAnalyses.splice(0).forEach(resolve=>resolve());});await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>localStorage.getItem('mano-analysis-complete-v1')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('mano-similarity-v1')),null);
  await page.evaluate(()=>{appleFixture.status='authorized';appleFixture.analysisResult={groups:[],skipped:0,cancelled:false};});await refresh(page);await waitPass(page);assert.equal(await calls(page),2);
 });
}finally{await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify({boundary:'Edge + synthetic bridge; not iPhone, PhotoKit, Vision or native memory',results},null,2)+'\n');}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
