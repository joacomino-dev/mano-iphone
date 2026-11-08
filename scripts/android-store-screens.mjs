// Real native WebView screenshots, synthetic MediaStore only. No DOM fixtures,
// simulated device chrome, photo deletion, fake purchases or screenshot resizing.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {chromium} from '../mano/node_modules/playwright/index.mjs';
import {adb,run,sleep,guardEmulator,connect,PKG} from '../mano/scripts/android-lab.mjs';
const OUT='build/store-screens',NAMES={es:'Español',en:'English',fr:'Français',de:'Deutsch',it:'Italiano',ar:'العربية',ja:'日本語'};
const report={status:'NOT TESTED',boundary:'Executed Android app, store frontend, debug/test-ad native configuration. No real ads or purchase/account QA. Not physical-device or VoiceOver acceptance.',screens:[]};let lab;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function wait(expression,timeout=60000){const end=Date.now()+timeout;while(Date.now()<end){if(await lab.page(`return !!(${expression});`))return;await sleep(150);}throw Error('UI timeout: '+expression);}
async function click(selector){await wait(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true';})()`);await lab.page(`const b=document.querySelector(${JSON.stringify(selector)});b.scrollIntoView({block:'center'});b.click();return true;`);}
async function reconnect(){lab?.close();for(let i=0;i<20;i++){try{lab=await connect();return;}catch{await sleep(500);}}throw Error('Native app unavailable after language reload');}
async function shot(lang,screen){
 await wait(`document.documentElement.lang===${JSON.stringify(lang)}`);await lab.page(`await document.fonts.ready;return true;`);await sleep(1000);
 const layout=await lab.page(`const critical=[...document.querySelectorAll('.decision-bar button,.archive-tools button,.review-primary button')].filter(e=>e.getBoundingClientRect().width>0);return {lang:document.documentElement.lang,dir:document.documentElement.dir,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},critical:critical.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label')||e.textContent,width:r.width,height:r.height,inViewport:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1};}),errors:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent).filter(Boolean)};`);
 assert.equal(layout.dir,lang==='ar'?'rtl':'ltr');assert.equal(layout.errors.length,0,'Visible app error');assert.ok(layout.critical.every(c=>c.inViewport),'Critical controls must remain reachable');
 const name=`${lang}-${screen}`,raw=(await run('adb',['exec-out','screencap','-p'],{encoding:'buffer',timeout:30000,maxBuffer:12<<20})).stdout;
 assert.equal(raw.toString('hex',0,8),'89504e470d0a1a0a');const width=raw.readUInt32BE(16),height=raw.readUInt32BE(20);assert.equal(width,1080);assert.equal(height,1920);
 await fs.writeFile(`${OUT}/${name}-raw.png`,raw);
 // Encoding only: RGB24/no alpha, no crop, overlay, scale or device frame.
 await run('ffmpeg',['-loglevel','error','-y','-i',`${OUT}/${name}-raw.png`,'-pix_fmt','rgb24',`${OUT}/${name}.png`],{timeout:30000});const png=await fs.readFile(`${OUT}/${name}.png`);assert.equal(png[25],2,'PNG RGB24 required');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
 report.screens.push({lang,screen,width,height,rawSha256:hash(raw),sha256:hash(png),layout});await fs.writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
}
try{
 await guardEmulator();await fs.mkdir(OUT,{recursive:true});report.sourceSha=(await run('git',['rev-parse','HEAD'])).stdout.trim();report.wmSize=await adb('shell','wm','size');
 // Rasterize the existing approved demo postcards as media fixtures, not UI.
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',args:['--no-sandbox']});
 try {const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
  for(let i=1;i<=8;i++){const svg=await fs.readFile(`public/assets/demo/postcard-${i}.svg`,'utf8');await page.setContent(`<style>html,body{margin:0;width:1200px;height:800px}svg{display:block;width:100%;height:100%}</style>${svg}`);const file=`${OUT}/cocowash-store-${i}.png`;await page.screenshot({path:file});await adb('push',path.resolve(file),`/sdcard/DCIM/Camera/cocowash-store-${i}.png`);}
 }finally{await browser.close();}
 await adb('shell','content','call','--uri','content://media','--method','scan_volume','--arg','external_primary');await sleep(3000);
 for(const permission of ['READ_MEDIA_IMAGES','READ_MEDIA_VIDEO','ACCESS_MEDIA_LOCATION'])await adb('shell','pm','grant',PKG,'android.permission.'+permission);
 await adb('shell','am','start','-W','-n',PKG+'/.MainActivity');await sleep(3000);await reconnect();
 const assets=(await lab.call('assets')).assets;assert.equal(assets.length,8,'Exactly the owned synthetic library is required');
 for(const asset of assets){const meta=await lab.call('metadata',{id:asset.id});assert.match(meta.filename,/^cocowash-store-[1-8]\.png$/);}
 report.fixtureOwnershipVerified=true;
 for(let i=0;i<8&&await lab.page(`return !!document.querySelector('.ob-next');`);i++){await click('.ob-next');await sleep(1200);}
 await wait(`!!document.querySelector('.photo-card.front')`);
 for(const [lang,name] of Object.entries(NAMES)){
  await click('#filter-trigger');await click('.sheet-tabs button:nth-child(2)');
  const selector=await lab.page(`const buttons=[...document.querySelectorAll('.settings-panel .filter-chips button')];const b=buttons.find(e=>e.textContent===${JSON.stringify(name)});if(!b)throw Error('Language control missing');b.setAttribute('data-coco-capture-target','');return '[data-coco-capture-target]';`);
  // The data attribute identifies an existing real control only; never changes
  // its value, enabled state or handler. Actual app language action reloads it.
  try{await click(selector);}catch(e){if(!String(e).includes('context'))throw e;}
  await sleep(2000);await reconnect();await wait(`!!document.querySelector('.photo-card.front')`);await shot(lang,'01-cards');
  await click('.bar-discard');await sleep(500);await click('#review-trigger');await shot(lang,'02-review');await click('.recover-all');await click('.native-sheet header button');
  await click('#filter-trigger');await click('.sheet-tabs button:first-child');await shot(lang,'03-filters');await click('.sheet-tabs button:nth-child(2)');await shot(lang,'04-settings');await click('.native-sheet header button');
 }
 assert.equal(report.screens.length,28);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack);process.exitCode=1;}
finally{lab?.close();await fs.writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));}
console.log('NATIVE_STORE_SCREENS_'+report.status,JSON.stringify({count:report.screens.length,error:report.error}));
