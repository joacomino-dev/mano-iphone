import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const scenario of ['initial-error','scan-error','suspend-race']){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(scenario=>{
   const state={available:true,consent:true,running:true,phase:'indexing',hasPublication:false,processed:0,total:10,remaining:10,waiting:0,groups:[]};
   let failed=false,first=true;window.calls=[];window.nativeEvents={};
   let hidden=false;Object.defineProperty(document,'hidden',{get:()=>hidden});window.hide=value=>{hidden=value;document.dispatchEvent(new Event('visibilitychange'));};
   window.CapacitorCustomPlatform={name:'ios'};
   window.Capacitor={PluginHeaders:[{name:'People',methods:[{name:'command',rtype:'promise'},{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]}],
    nativeCallback:(_p,_m,o,callback)=>{window.nativeEvents[o.eventName]=callback;return 'listener';},
    nativePromise:async(_p,method,o)=>{
     if(method==='removeListener')return {};window.calls.push(o.action);
     if(o.action==='person')return {ids:['first'],items:[]};
     if(o.action==='status'&&scenario==='initial-error'&&!failed){failed=true;throw new Error('Stored index unreadable');}
     if(o.action==='pause')state.running=false;
     if(o.action==='status'&&!hidden)state.running=true;
     if(o.action==='consent')state.running=true;
     if(o.action==='scan'){
      if(scenario==='scan-error'&&!failed){failed=true;throw new Error('SDK failure');}
      if(scenario==='suspend-race'&&first){first=false;window.pendingScan=true;await new Promise((_r,reject)=>{window.finishOldScan=()=>reject(new Error('Cancelled old scan'));});}
      state.processed+=4;
     }
     return {...state};
    }};
  },scenario);
  await page.goto(`${process.env.COCOWASH_QA_URL??'http://127.0.0.1:4311'}/tests/people-ui.html?hook`);
  if(scenario==='suspend-race'){
   await page.waitForFunction(()=>window.pendingScan);
   await page.evaluate(()=>window.hide(true));await page.waitForFunction(()=>document.querySelector('#running').textContent==='false');
   await page.evaluate(()=>{window.hide(false);window.finishOldScan();});
   await page.waitForFunction(()=>window.calls.filter(a=>a==='scan').length>=2);
   assert.equal(await page.locator('#hook-error').textContent(),'');assert.equal(await page.locator('#running').textContent(),'true');
  }else{
   await page.waitForFunction(()=>document.querySelector('#hook-error').textContent.length>0);
   assert.equal(await page.locator('#running').textContent(),'false');await page.locator('#activate').click();
   await page.waitForFunction(()=>document.querySelector('#running').textContent==='true');assert.equal(await page.locator('#hook-error').textContent(),'');
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log(JSON.stringify({mockBridgeOnly:true,startupErrorRecoverable:true,scanErrorStopsSpinner:true,staleCancellationCannotPauseResumedAnalysis:true,errors:[]}));
}finally{await browser.close();}
