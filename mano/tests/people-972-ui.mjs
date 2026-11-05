import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:430,height:932}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('cocowash-onboarding-v2','done');
  const assets=Array.from({length:12},(_,i)=>({id:`demo-${i+1}`,kind:'photo',date:1700000000000+i*86400000,width:1000,height:1500,duration:0,demo:true}));
  let complete=localStorage.getItem('fixture-complete')==='true';
  Object.defineProperty(window,'fixtureComplete',{get:()=>complete,set:value=>{complete=value;localStorage.setItem('fixture-complete',String(value));}});
  window.fixtureCalls=[];
  const state={available:true,consent:true,running:!complete,phase:complete?'ready':'indexing',hasPublication:complete,revision:complete?1:0,minimumPhotos:5,protectionRevision:0,
   processed:0,total:100,remaining:100,waiting:0,aliases:{},groups:[{id:'one',name:'Persona 1',count:6,representative:'demo-1',portraits:assets.slice(0,4).map((a,i)=>({id:a.id,face:`face-${i}`}))}]};
  const libraryMethods=['permissionStatus','assets','sizes','classify','cancelClassify','analyze','cancelAnalysis','diagnostic','haptic','place','releasePreparedVideos','authorize','albums'];
  const headers=name=>({name,methods:[...(name==='People'?['command']:libraryMethods).map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]});
  window.CapacitorCustomPlatform={name:'ios'};
  window.Capacitor={PluginHeaders:[headers('People'),headers('PhotoLibrary')],
   nativeCallback:()=> 'fixture-listener',nativePromise:async(plugin,method,o={})=>{
    window.fixtureCalls.push({plugin,method,...o});
    if(method==='removeListener')return {};
    if(plugin==='PhotoLibrary'){
     if(method==='permissionStatus'||method==='authorize')return {status:'authorized'};
     if(method==='assets')return {status:'authorized',assets};
     if(method==='sizes')return {sizes:{}};
     if(method==='classify')return {results:{},skipped:0,cancelled:false};
     if(method==='analyze')return {groups:[],skipped:0,cancelled:false};
     if(method==='albums')return {albums:[]};
     return {};
    }
    if(o.action==='portrait'){await new Promise(r=>setTimeout(r,50));return {path:`/assets/demo/postcard-2.svg?portrait=${o.face}`};}
    if(o.action==='redact'){await new Promise(r=>setTimeout(r,100));return {path:`/assets/demo/postcard-3.svg?protected=${o.style}&id=${o.id}`};}
    if(o.action==='person')return {ids:assets.slice(0,6).map(a=>a.id),items:[]};
    if(o.action==='pause')state.running=false;
    if(o.action==='refresh')state.running=!complete;
    if(o.action==='scan'&&!complete){state.processed+=4;state.remaining-=4;}
    if(o.action==='scan'&&complete){state.running=false;state.phase='ready';state.hasPublication=true;state.revision=1;}
    return {...state};
   }
  };
 });
 const url=`${process.env.COCOWASH_QA_URL??'http://127.0.0.1:4311'}/tests/people-ui.html?application`;
 await page.goto(url);await page.locator('.hand-space article.front').waitFor();await page.waitForTimeout(1700);
 await page.locator('#filter-trigger').click();await page.locator('#people-entry').waitFor();
 assert.equal(await page.locator('.people-groups').count(),0);
 await page.locator('#people-entry').click();await page.locator('#people-view').waitFor();
 assert.equal(await page.locator('.people-groups>button').count(),0);
 assert.match(await page.locator('.people-analysis').textContent(),/Buscando caras conocidas|Análisis en espera/);
 await page.waitForFunction(()=>Number(document.querySelector('.people-analysis progress')?.value)>0);
 await page.screenshot({path:'../work/qa-972/people-progress.png'});
 await page.getByRole('button',{name:'Volver a filtros',exact:false}).click();await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.getByRole('button',{name:'Dejar para más tarde',exact:true}).click();
 await page.locator('#filter-trigger').click();await page.locator('#people-entry').click();
 await page.evaluate(()=>window.fixtureComplete=true);
 await page.locator('.people-groups>button').first().waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.person-mosaic img').length===4);
 const portraitCalls=await page.evaluate(()=>window.fixtureCalls.filter(c=>c.action==='portrait'));
 assert.equal(new Set(portraitCalls.map(c=>c.face)).size,4);
 await page.getByRole('button',{name:/Persona 1/}).click();
 await page.getByRole('button',{name:'Ajustar Breakup Mode',exact:true}).click();
 const modes=page.getByRole('group',{name:'Modo de Breakup',exact:true});assert.equal(await modes.getByRole('button').count(),2);
 await modes.getByRole('button',{name:'Rostro censurado',exact:true}).click();
 const styles=page.getByRole('group',{name:'Estilo de censura',exact:true});assert.equal(await styles.getByRole('button').count(),2);
 await styles.getByRole('button',{name:'Barra sobre los ojos',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')??'null')?.filter.censorStyle==='eyes');
 await page.getByRole('button',{name:'Cerrar',exact:true}).click();await page.locator('.breakup-mark').first().waitFor();
 await page.waitForFunction(()=>document.querySelector('.photo-window img')?.getAttribute('src')?.includes('protected=eyes'));
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')).context.handIds);
 await page.reload();await page.locator('.breakup-mark').first().waitFor();
 await page.waitForFunction(()=>document.querySelector('.photo-window img')?.getAttribute('src')?.includes('protected=eyes'));
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('cocowash-library-session-v1')).context.handIds),before);
 await page.locator('#filter-trigger').click();await page.locator('#people-entry').click();
 assert.equal(await page.locator('.person-mosaic img').count(),0);
 await page.getByRole('button',{name:'Ajustar Breakup Mode',exact:true}).click();
 await page.getByRole('group',{name:'Modo de Breakup',exact:true}).getByRole('button',{name:'Normal',exact:true}).click();
 await page.getByRole('button',{name:'Cerrar',exact:true}).click();assert.equal(await page.locator('.breakup-mark').count(),0);
 assert.deepEqual(errors,[]);
 const result={mockBridgeOnly:true,independentPeopleView:true,noProvisionalGroups:true,realProgressCounters:true,organizingDuringAnalysis:true,fourFaceSpecificRequests:true,twoModesTwoStyles:true,brokenHeartAutomatic:true,styleAndSessionRestored:true,portraitsCoveredInBreakup:true,errors};
 fs.writeFileSync('../work/qa-972/application-ui.json',JSON.stringify(result,null,2));await page.screenshot({path:'../work/qa-972/application-ui.png'});console.log(JSON.stringify(result));
} finally {await browser.close();}
