// Real React + native MediaStore/system dialogs on an owned CI fixture library.
// DOM invokes visible, enabled app controls; this is not physical touch/VoiceOver QA.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {adb,run,sleep,guardEmulator,connect,PKG} from './android-lab.mjs';
const OUT=process.env.COCO_NATIVE_CYCLES_OUTPUT??'build/android-startup', rows=[],report={boundary:'Hosted emulator, generated library only. PSS/counters are measured on Android, not Node. Renderer attribution must be reviewed before memory acceptance.',status:'NOT TESTED',rows};
await fs.mkdir(OUT,{recursive:true});let lab;const ownedIds=new Set();
async function wait(expression,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(await lab.page(`return !!(${expression});`))return;await sleep(200);}throw Error('UI timeout: '+expression);}
async function click(selector){await wait(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'&&b.getBoundingClientRect().width>0;})()`);await lab.page(`document.querySelector(${JSON.stringify(selector)}).click();return true;`);}
const stored=()=>lab.page(`return JSON.parse(localStorage.getItem('cocowash-library-session-v1'));`);
async function shot(name){await run('adb',['exec-out','screencap','-p'],{encoding:'buffer',timeout:30000,maxBuffer:12<<20}).then(r=>fs.writeFile(`${OUT}/${name}.png`,r.stdout));}
async function systemAllow(){
 for(let i=0;i<20;i++){await sleep(500);await adb('shell','uiautomator','dump','/sdcard/coco-cycle.xml');const xml=await adb('shell','cat','/sdcard/coco-cycle.xml');
 const node=[...xml.matchAll(/<node [^>]*>/g)].map(m=>m[0]).find(n=>/text="(?:Allow|ALLOW|Permitir|PERMITIR)"/.test(n)&&/clickable="true"/.test(n)&&/package="(?:com\.google\.android\.providers\.media\.module|com\.android\.providers\.media(?:\.module)?|com\.google\.android\.permissioncontroller|com\.android\.permissioncontroller)"/.test(n));
 const b=node&&/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);if(b){await adb('shell','input','tap',String((+b[1]+ +b[3])>>1),String((+b[2]+ +b[4])>>1));return;}}
 throw Error('Expected real Android confirmation was not offered');
}
async function processSnapshot(){
 const listing=await adb('shell','ps','-A','-o','PID,PPID,NAME,ARGS');const candidates=listing.split('\n').slice(1).map(l=>l.trim().split(/\s+/)).filter(p=>p[0]===lab.pid||/sandboxed_process|SandboxedProcessService/.test(p.slice(2).join(' ')));
 const processes=[];for(const p of candidates){const pid=p[0],info=await adb('shell','dumpsys','meminfo',pid),m=/TOTAL PSS:\s*(\d+)/.exec(info)||/^\s*TOTAL\s+(\d+)/m.exec(info);assert.ok(m,'Missing measured PSS for '+pid);await fs.writeFile(`${OUT}/cycle-${rows.length}-mem-${pid}.txt`,info);let ticks=null;try{const stat=await adb('shell','cat',`/proc/${pid}/stat`);const cols=stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/);ticks=Number(cols[11])+Number(cols[12]);}catch{}processes.push({pid,role:pid===lab.pid?'app':'renderer-candidate',name:p.slice(2,3).join(''),pssKiB:Number(m[1]),cpuTicks:ticks,sampleMonotonicMs:performance.now()});}
 assert.ok(processes.some(p=>p.role==='app'));return processes;
}
async function sample(cycle){
 await sleep(3000);const before=await processSnapshot(),start=performance.now();await sleep(2000);const after=await processSnapshot(),seconds=(performance.now()-start)/1000;
 const hz=Number(await adb('shell','getconf','CLK_TCK'));assert.ok(hz>0,'CPU clock tick frequency unavailable');
 const cpu=after.map(p=>{const prior=before.find(b=>b.pid===p.pid),window=prior?(p.sampleMonotonicMs-prior.sampleMonotonicMs)/1000:null;return prior&&prior.cpuTicks!==null&&p.cpuTicks!==null?{pid:p.pid,windowSeconds:window,percent:100*(p.cpuTicks-prior.cpuTicks)/(hz*window)}:{pid:p.pid,percent:null};});
 rows.push({cycle,processes:after,combinedPssKiB:after.reduce((n,p)=>n+p.pssKiB,0),idleCpuWindowSeconds:seconds,cpu});
 await fs.writeFile(`${OUT}/native-cycles.json`,JSON.stringify(report,null,2));
}
async function round(){
 const beforeAssets=(await lab.call('assets')).assets,previousRemoved=new Set((await stored()).record.removed);assert.ok(beforeAssets.every(a=>ownedIds.has(a.id)),'Refused: library gained unowned media');await click('.bar-discard');await wait(`JSON.parse(localStorage.getItem('cocowash-library-session-v1'))?.record.pending.length===1`);assert.ok((await stored()).record.pending.every(id=>ownedIds.has(id)),'Refused: pending selection is not generated media');
 await click('#review-trigger');await click('.review-primary .danger');await systemAllow();
 await wait(`!!document.querySelector('.status-actions .primary-empty')`,45000);
 const fresh=(await lab.call('assets')).assets;assert.equal(fresh.length,beforeAssets.length-1,'Confirmed UI deletion must remove exactly the generated item');
 await wait(`JSON.parse(localStorage.getItem('cocowash-library-session-v1'))?.record.pending.length===0`);const state=await stored(),freshIds=new Set(fresh.map(a=>a.id)),gone=beforeAssets.filter(a=>!freshIds.has(a.id)).map(a=>a.id),recorded=state.record.removed.filter(id=>!previousRemoved.has(id));assert.ok(gone.length===1&&recorded.length===1&&gone[0]===recorded[0],'UI removal must equal the exact fixture confirmed absent from MediaStore');
 await adb('shell','input','keyevent','3');await sleep(1000);await adb('shell','am','start','-W','-n',PKG+'/.MainActivity');await sleep(1000);
 await click('.status-actions .primary-empty');await wait(`!!document.querySelector('.photo-card.front')`,45000);
}
try{
 await guardEmulator();
 // Root adbd is used only on this disposable userdebug emulator for /proc CPU
 // counters, never on a user's device and never as an app permission bypass.
 report.adbdRoot=await adb('root').catch(e=>String(e.message));await adb('wait-for-device');lab=await connect();
 const assets=(await lab.call('assets')).assets;assert.ok(assets.length>=40,'Need a sizeable generated fixture library');
 for(const asset of assets){const meta=await lab.call('metadata',{id:asset.id});assert.match(meta.filename??'',/^(cocowash-test-\d+\.png|Screenshot_cocowash-test\.png|cocowash-test\.mp4|e2e\.png|ad\.png)$/i,'Refused: unknown library ownership');ownedIds.add(asset.id);}
 report.initialAssetCount=assets.length;report.fixtureOwnershipVerified=true;
 await fs.writeFile(`${OUT}/native-cycle-processes.txt`,await adb('shell','dumpsys','activity','processes'));
 for(let i=0;i<10&&await lab.page(`return !!document.querySelector('.ob-next');`);i++){await click('.ob-next');await sleep(1200);}
 await wait(`!!document.querySelector('.photo-card.front')`,60000);
 // Prove R-44 on the actual debug APK without enabling synthetic test mode.
 await click('#filter-trigger');await click('.sheet-tabs button:nth-child(2)');await wait(`!!document.querySelector('.test-mode-field')`);await shot('developer-channel-native');
 report.developerControlsVisible=true;await click('.native-sheet header button');
 await sleep(20000);await sample(0);
 for(let cycle=1;cycle<=10;cycle++){await round();await sample(cycle);if(cycle===5||cycle===10)await shot('native-cycle-'+cycle);}
 report.status='PASS';report.functionalCycles=10;report.performanceAcceptance='PENDING: inspect renderer ownership and evaluate baseline/trend; collecting numbers alone is not P0 closure';
}catch(error){report.status='FAIL';report.error=error.stack;if(report.fixtureOwnershipVerified)await shot('native-cycle-failure').catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(`${OUT}/native-cycles.json`,JSON.stringify(report,null,2));lab?.close();}
console.log('ANDROID_NATIVE_CYCLES_'+report.status,JSON.stringify({cycles:report.functionalCycles??rows.length,error:report.error}));
