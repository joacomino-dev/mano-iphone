import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage();
 await page.addInitScript(()=>{
  const state={available:true,consent:false,running:false,processed:0,total:100,remaining:100,waiting:0,groups:[]};
  window.fixtureCalls=[];window.CapacitorCustomPlatform={name:'ios'};
  window.Capacitor={PluginHeaders:[{name:'People',methods:[{name:'command',rtype:'promise'},{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]}],
   nativeCallback:(_p,_m,o,callback)=>{if(o.eventName==='libraryChanged')window.fixtureEmit=callback;return 'fixture-listener';},
   nativePromise:async(_p,method,o)=>{
    if(method==='removeListener')return {};
    window.fixtureCalls.push(o.action);await new Promise(r=>setTimeout(r,30));
    if(o.action==='portrait')return {path:'/assets/demo/postcard-2.svg'};
    if(o.action==='person')return {ids:['first'],items:[]};
    if(o.action==='pause')state.running=false;
    if(o.action==='consent'){state.consent=true;state.running=true;state.groups=[{id:'one',name:'Persona 1',count:1,representative:'first'}];}
    if(o.action==='scan'){state.processed+=4;state.remaining-=4;}
    return {...state};
   }
  };
 });
 await page.goto(`${process.env.COCOWASH_QA_URL??'http://127.0.0.1:4311'}/tests/people-ui.html?hook`);
 await page.waitForTimeout(100);await page.locator('#activate').click();
 await page.waitForFunction(()=>document.querySelector('#member-count').textContent==='1');
 await page.evaluate(()=>{window.memberChanges=[];new MutationObserver(()=>window.memberChanges.push(document.querySelector('#member-count').textContent)).observe(document.querySelector('#member-count'),{childList:true,subtree:true,characterData:true});});
 await page.waitForFunction(()=>window.fixtureCalls.filter(a=>a==='scan').length>=2);
 assert.equal(await page.evaluate(()=>window.memberChanges.includes('0')),false);
 assert.equal(await page.locator('#running').textContent(),'true');
 const calls=await page.evaluate(()=>window.fixtureCalls);assert.equal(calls.includes('refresh'),false);
 await page.locator('#pause-index').click();await page.waitForFunction(()=>document.querySelector('#running').textContent==='false');
 const processed=await page.locator('#processed').textContent();await page.waitForTimeout(1400);assert.equal(await page.locator('#processed').textContent(),processed);
 await page.evaluate(()=>window.fixtureEmit({}));await page.waitForFunction(()=>document.querySelector('#library-changes').textContent==='1');
 assert.equal(await page.locator('#hook-error').textContent(),'');
 await page.goto(`${process.env.COCOWASH_QA_URL??'http://127.0.0.1:4311'}/tests/people-ui.html?panel`);
 await page.getByText('Corregir este grupo',{exact:true}).click();
 await page.getByLabel('Nombre opcional').fill('Nombre de prueba');await page.getByRole('button',{name:'Guardar nombre',exact:true}).click();
 assert.equal(JSON.parse(await page.locator('#panel-action').textContent()).operation,'rename');
 await page.getByLabel('Rostro 1',{exact:true}).check();await page.getByRole('button',{name:'Separar en otra persona',exact:true}).click();
 assert.deepEqual(JSON.parse(await page.locator('#panel-action').textContent()).faces,['face-1']);
 await page.screenshot({path:'../work/qa-972/people-panel.png',fullPage:true});
 console.log(JSON.stringify({nativeInputWithoutPreviewProvider:true,faceCorrectionControls:true,mockBridgeOnly:true,consentStartsIndex:true,noMembershipFlicker:true,pauseStopsWork:true,libraryChangeReceived:true}));
}finally{await browser.close();}
