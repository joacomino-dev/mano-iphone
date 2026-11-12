// Real React + native MediaStore/system dialogs on an owned CI fixture library.
// DOM invokes visible, enabled app controls; this is not physical touch/VoiceOver QA.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {adb,run,sleep,guardEmulator,connect,PKG} from './android-lab.mjs';
import {ownedProcesses} from './android-process-scope.mjs';
const OUT=process.env.COCO_NATIVE_CYCLES_OUTPUT??'build/android-startup', rows=[],report={boundary:'Hosted emulator, generated library only. PSS/counters are measured on Android, not Node. Renderer attribution must be reviewed before memory acceptance.',status:'NOT TESTED',rows};
await fs.mkdir(OUT,{recursive:true});let lab;const ownedIds=new Set();
async function wait(expression,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(await lab.page(`return !!(${expression});`))return;await sleep(200);}throw Error('UI timeout: '+expression);}
async function click(selector){await wait(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'&&b.getBoundingClientRect().width>0;})()`);await lab.page(`document.querySelector(${JSON.stringify(selector)}).click();return true;`);}
const stored=()=>lab.page(`return JSON.parse(localStorage.getItem('cocowash-library-session-v1'));`);
const favorites=()=>lab.page(`return JSON.parse(localStorage.getItem('cocowash-android-favorites-v1')||'{}');`);
async function queueFavorite(){
 assert.equal(Object.keys(await favorites()).length,0,'Clean fixture queue required');
 await click('.bar-heart');await wait(`Object.keys(JSON.parse(localStorage.getItem('cocowash-android-favorites-v1')||'{}')).length===1`);
 const [id]=Object.keys(await favorites());assert.ok(ownedIds.has(id));assert.equal((await favorites())[id],true);report.lastQueuedFavorite=id;
 assert.equal((await lab.call('assets')).assets.find(a=>a.id===id)?.favorite,false,'Queueing must not mutate gallery before confirmation');return id;
}
async function favoriteRefreshAndUndo(){
 const before=(await stored()).record.favorites,id=await queueFavorite();
 await adb('shell','input','keyevent','3');await sleep(1000);await adb('shell','am','start','-W','-n',PKG+'/.MainActivity');await sleep(2000);
 assert.ok((await stored()).record.favorites.includes(id),'Foreground refresh must retain pending favorite');
 await click('.archive-tools button:first-child');await wait(`Object.keys(JSON.parse(localStorage.getItem('cocowash-android-favorites-v1')||'{}')).length===0`);
 await wait(`JSON.stringify(JSON.parse(localStorage.getItem('cocowash-library-session-v1')).record.favorites)===${JSON.stringify(JSON.stringify(before))}`);
 assert.equal((await lab.call('assets')).assets.find(a=>a.id===id)?.favorite,false);report.favoriteRefreshAndUndo=true;
}
async function pendingSurvivesTermination(){
 const before=(await lab.call('assets')).assets.map(a=>a.id).sort();await click('.bar-discard');await wait(`JSON.parse(localStorage.getItem('cocowash-library-session-v1'))?.record.pending.length===1`);
 await wait(`(()=>{const b=document.querySelector('#review-trigger');return b&&!b.disabled&&b.getAttribute('aria-disabled')==='false'&&b.querySelector('.finish-count')?.textContent.trim()==='1';})()`);
 const pending=(await stored()).record.pending;assert.ok(pending.every(id=>ownedIds.has(id)));lab.close();
 await adb('shell','am','force-stop',PKG);await adb('shell','am','start','-W','-n',PKG+'/.MainActivity');await sleep(4000);lab=await connect();
 await wait(`!!document.querySelector('.photo-card.front')`,60000);assert.deepEqual((await stored()).record.pending,pending,'Persisted queue must survive actual process termination');
 assert.deepEqual((await lab.call('assets')).assets.map(a=>a.id).sort(),before);await click('#review-trigger');await click('.recover-all');await wait(`JSON.parse(localStorage.getItem('cocowash-library-session-v1'))?.record.pending.length===0`);await click('.native-sheet header button');report.pendingSurvivesTermination=true;
}
async function inlineFullscreen(){
 const before=(await lab.call('assets')).assets.map(a=>a.id).sort();
 await click('#filter-trigger');await click('.sheet-tabs button:first-child');
 await click('.filter-chips.lead-row button:nth-child(3)');
 await click('.filter-apply button');await wait(`!!document.querySelector('.photo-card.front video')`,45000);
 await click('.photo-card.front .zoom-access');await wait(`!!document.querySelector('.inspection video')`,30000);
 await wait(`document.querySelector('.inspection video')?.readyState>=2`,30000);
 await lab.page(`const v=document.querySelector('.inspection video');if(v.paused)document.querySelector('.inspection .video-controls button').click();return true;`);
 await wait(`(()=>{const v=document.querySelector('.inspection video');return v&&!v.paused&&v.currentTime>0;})()`,15000);
 const original=await lab.page(`const v=document.querySelector('.inspection video');window.cocoFullscreenProbe=v;return {src:v.currentSrc,time:v.currentTime,muted:v.muted,volume:v.volume};`);
 const point=await lab.page(`const b=document.querySelector('.inspection .video-controls button:last-child');if(!b||b.disabled)throw Error('Fullscreen control unavailable');const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};`);
 // Trusted WebView input, not a JavaScript override of requestFullscreen.
 await lab.cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await lab.cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await wait(`!!document.fullscreenElement`,15000);await shot('video-fullscreen-native');
 // Establish the native input precondition before sending Back. The previous
 // test sent it immediately after tapping immersive education; neither the
 // Activity's key handler nor its fullscreen callback received that event.
 const education=async()=>{
  await adb('shell','uiautomator','dump','/sdcard/coco-fullscreen.xml');
  const xml=await adb('shell','cat','/sdcard/coco-fullscreen.xml');
  return [...xml.matchAll(/<node [^>]*>/g)].map(m=>m[0]).find(n=>/package="(?:com\.android\.systemui|android)"/.test(n)&&/text="(?:Got it|Entendido)"/.test(n)&&/clickable="true"/.test(n));
 };
 const notice=await education(),bounds=notice&&/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(notice);
 if(bounds){
  await adb('shell','input','tap',String((+bounds[1]+ +bounds[3])>>1),String((+bounds[2]+ +bounds[4])>>1));
  const deadline=Date.now()+15000;let visible;
  do{visible=await education();if(visible)await sleep(250);}while(visible&&Date.now()<deadline);
  assert.equal(visible,undefined,'Immersive education must actually close before Back');report.fullscreenEducationDismissed=true;
 }
 const focusDeadline=Date.now()+15000;let windowState,focused=false;
 do{windowState=await adb('shell','dumpsys','window');focused=/mCurrentFocus=.*work\.joaquin\.mano\/(?:work\.joaquin\.mano)?\.MainActivity\b/.test(windowState);if(!focused)await sleep(250);}while(!focused&&Date.now()<focusDeadline);
 await fs.writeFile(`${OUT}/fullscreen-before-back-window.txt`,windowState);
 assert.ok(focused,'Back requires CocoWash to own the focused Android window');
 assert.equal(await lab.page(`return !!document.fullscreenElement;`),true,'Fullscreen must still be active before the tested Back');
 report.fullscreenBackPrecondition={focusedActivity:true,educationClosed:true};
 await adb('shell','input','keyevent','4');
 await fs.writeFile(`${OUT}/fullscreen-after-back-window.txt`,await adb('shell','dumpsys','window'));
 await wait(`!document.fullscreenElement&&!!document.querySelector('.inspection video')`,15000);
 const returned=await lab.page(`const v=document.querySelector('.inspection video');return {same:v===window.cocoFullscreenProbe,src:v.currentSrc,time:v.currentTime,muted:v.muted,volume:v.volume};`);
 assert.equal(returned.same,true,'Back must retain the original inline player');assert.equal(returned.src,original.src);assert.ok(returned.time>=original.time-.25,'Fullscreen must not restart the inline clip');
 assert.equal(returned.muted,original.muted,'Leaving fullscreen must preserve the sound setting');assert.equal(returned.volume,original.volume);
 await adb('shell','input','keyevent','4');await wait(`!document.querySelector('.inspection')`,15000);
 assert.deepEqual((await lab.call('assets')).assets.map(a=>a.id).sort(),before,'Fullscreen must not mutate MediaStore');
 await click('#filter-trigger');await click('.sheet-tabs button:first-child');
 await click('.filter-chips.lead-row button:first-child');
 await click('.filter-apply button');await wait(`!!document.querySelector('.photo-card.front')`,30000);
 report.inlineFullscreen={playingBeforeFullscreen:true,samePlayer:true,backReturnsToInspector:true,soundPreserved:true,galleryUnchanged:true};
}
async function shot(name){await run('adb',['exec-out','screencap','-p'],{encoding:'buffer',timeout:30000,maxBuffer:12<<20}).then(r=>fs.writeFile(`${OUT}/${name}.png`,r.stdout));}
async function systemAllow(allow=true,completed){
 const timeout=15000,label=allow?/text="(?:Allow|ALLOW|Permitir|PERMITIR)"/:/text="(?:Deny|DENY|Cancel|CANCEL|Don.t allow|Denegar|Cancelar)"/;
 const buttons=xml=>[...xml.matchAll(/<node [^>]*>/g)].map(m=>m[0]).filter(n=>label.test(n)&&/package="(?:com\.google\.android\.providers\.media\.module|com\.android\.providers\.media(?:\.module)?|com\.google\.android\.permissioncontroller|com\.android\.permissioncontroller)"/.test(n));
 // Bound wall time, not the number of dumps: uiautomator can itself be slow.
 const command=(deadline,...args)=>run('adb',args,{timeout:Math.max(1,Math.ceil(deadline-performance.now())),maxBuffer:16<<20}).then(r=>r.stdout.trim());
 const dump=async deadline=>{await command(deadline,'shell','uiautomator','dump','/sdcard/coco-cycle.xml');return command(deadline,'shell','cat','/sdcard/coco-cycle.xml');};
 const offeredBy=performance.now()+timeout;let bounds,lastError;
 while(performance.now()<offeredBy){
  if(completed&&await completed())return 'system-completed-before-observation';
  try{
   const node=buttons(await dump(offeredBy)).find(n=>/clickable="true"/.test(n)&&!/enabled="false"/.test(n));
   bounds=node&&/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
   if(bounds&&+bounds[3]>+bounds[1]&&+bounds[4]>+bounds[2])break;
   bounds=undefined;
  }catch(error){lastError=error.message;}
  await sleep(Math.min(250,Math.max(0,offeredBy-performance.now())));
 }
 if(!bounds)throw Error(`Android ${allow?'Allow':'Cancel'} confirmation did not appear within ${timeout} ms${lastError?': '+lastError:''}`);
 const dismissedBy=performance.now()+timeout;
 await command(dismissedBy,'shell','input','tap',String((+bounds[1]+ +bounds[3])>>1),String((+bounds[2]+ +bounds[4])>>1));
 while(performance.now()<dismissedBy){
  // A disabled button still means the dialog is present. Only a successful
  // fresh dump without that system button proves the tap closed the dialog.
  try{if(buttons(await dump(dismissedBy)).length===0)return 'system-dialog';}catch(error){lastError=error.message;}
  await sleep(Math.min(250,Math.max(0,dismissedBy-performance.now())));
 }
 throw Error(`Android ${allow?'Allow':'Cancel'} confirmation remained visible after tapping (${timeout} ms)${lastError?': '+lastError:''}`);
}
async function processSnapshot(){
 const scope=await adb('shell','dumpsys','activity','processes');await fs.writeFile(`${OUT}/cycle-${rows.length}-scope.txt`,scope);const owned=ownedProcesses(scope,PKG,lab.pid);
 const listing=await adb('shell','ps','-A','-o','PID,PPID,NAME,ARGS');const candidates=listing.split('\n').slice(1).map(l=>l.trim().split(/\s+/)).filter(p=>owned.has(p[0]));
 // --local reads PSS without asking ActivityThread to dump its heap. The
 // ordinary dump explicitly calls runtime.gc(), polluting this CPU interval.
 const processes=[];for(const p of candidates){const pid=p[0],info=await adb('shell','dumpsys','meminfo','--local',pid),m=/TOTAL PSS:\s*(\d+)/.exec(info)||/^\s*TOTAL\s+(\d+)/m.exec(info);assert.ok(m,'Missing measured PSS for '+pid);await fs.writeFile(`${OUT}/cycle-${rows.length}-mem-${pid}.txt`,info);let ticks=null;try{const stat=await adb('shell','cat',`/proc/${pid}/stat`);const cols=stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/);ticks=Number(cols[11])+Number(cols[12]);}catch{}processes.push({pid,...owned.get(pid),name:p.slice(2,3).join(''),pssKiB:Number(m[1]),cpuTicks:ticks,sampleMonotonicMs:performance.now()});}
 assert.ok(processes.some(p=>p.role==='app'));return processes;
}
async function appTicks(){const stat=await adb('shell','cat',`/proc/${lab.pid}/stat`);const cols=stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/);return Number(cols[11])+Number(cols[12]);}
async function sample(cycle){
 const hz=Number(await adb('shell','getconf','CLK_TCK'));assert.ok(hz>0,'CPU clock tick frequency unavailable');
 // Idle means quiet: after a round the app may still be finishing its work
 // (MediaStore re-query, previews). Probe 1 s windows until the app is under 10 %
 // CPU, up to 8 probes; a process that never quiets is recorded as unsettled and
 // fails the budget (evaluate-native-cycles.py). Thresholds are unchanged.
 await sleep(3000);let settleProbes=0,quiet=false;
 for(;settleProbes<8;settleProbes++){const a=await appTicks(),t=performance.now();await sleep(1000);const b=await appTicks();if(100*(b-a)/(hz*(performance.now()-t)/1000)<10){quiet=true;break;}}
 const before=await processSnapshot(),start=performance.now();await sleep(2000);const after=await processSnapshot(),seconds=(performance.now()-start)/1000;
 const cpu=after.map(p=>{const prior=before.find(b=>b.pid===p.pid),window=prior?(p.sampleMonotonicMs-prior.sampleMonotonicMs)/1000:null;return prior&&prior.cpuTicks!==null&&p.cpuTicks!==null?{pid:p.pid,windowSeconds:window,percent:100*(p.cpuTicks-prior.cpuTicks)/(hz*window)}:{pid:p.pid,percent:null};});
 rows.push({cycle,beforeProcesses:before,processes:after,combinedPssKiB:after.reduce((n,p)=>n+p.pssKiB,0),idleCpuWindowSeconds:seconds,cpu,settleProbes,settled:quiet});
 await fs.writeFile(`${OUT}/native-cycles.json`,JSON.stringify(report,null,2));
}
async function round(queuedFavorite,cancelFirst=false){
 const beforeAssets=(await lab.call('assets')).assets,previousRemoved=new Set((await stored()).record.removed);assert.ok(beforeAssets.every(a=>ownedIds.has(a.id)),'Refused: library gained unowned media');await click('.bar-discard');await wait(`JSON.parse(localStorage.getItem('cocowash-library-session-v1'))?.record.pending.length===1`);assert.ok((await stored()).record.pending.every(id=>ownedIds.has(id)),'Refused: pending selection is not generated media');
 await click('#review-trigger');await click('.review-primary .danger');
 if(cancelFirst){
  const pendingBefore=(await stored()).record.pending;
  await systemAllow(false);await wait(`!!document.querySelector('.review-primary .danger:not(:disabled)')`);
  assert.deepEqual((await stored()).record.pending,pendingBefore,'Canceled system deletion must retain exact pending items');
  assert.deepEqual((await lab.call('assets')).assets.map(a=>a.id).sort(),beforeAssets.map(a=>a.id).sort(),'Cancel must remove no MediaStore item');
  assert.deepEqual((await stored()).record.removed,[...previousRemoved],'Cancel must not record deletion success');report.cancelledDeleteRetained=true;
  await click('.review-primary .danger');
 }
 await systemAllow();
 await wait(`!!document.querySelector('.status-actions .primary-empty')`,45000);
 if(queuedFavorite){
  report.favoriteConfirmation=await systemAllow(true,async()=>Object.keys(await favorites()).length===0&&(await lab.call('assets')).assets.find(a=>a.id===queuedFavorite)?.favorite===true);
  await wait(`Object.keys(JSON.parse(localStorage.getItem('cocowash-android-favorites-v1')||'{}')).length===0`);
  assert.equal((await lab.call('assets')).assets.find(a=>a.id===queuedFavorite)?.favorite,true,'System-confirmed favorite must exist in MediaStore');assert.ok((await stored()).record.favorites.includes(queuedFavorite));
  const transcript=await adb('logcat','-d','-s','CocoWash:I');await fs.writeFile(`${OUT}/system-request-log.txt`,transcript);
  assert.match(transcript,/COCOWASH_SYSTEM_LAUNCH method=favorite /);assert.match(transcript,/COCOWASH_SYSTEM_RESULT method=favorite code=-1/,'Real native favorite callback must confirm success');
  report.favoriteNativeFlush=true;
 }
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
 report.developerControlsVisible=true;await adb('shell','input','keyevent','4');await wait(`!document.querySelector('.native-sheet')`);report.nativeBackClosesSheet=true;
 await favoriteRefreshAndUndo();
 await inlineFullscreen();
 await sleep(20000);await sample(0);
 for(let cycle=1;cycle<=10;cycle++){const favorite=cycle===10?await queueFavorite():null;await round(favorite,cycle===1);report.functionalCycles=cycle;await sample(cycle);if(cycle===5||cycle===10)await shot('native-cycle-'+cycle);}
 report.functionalCycles=10;
 // Independent safety cases execute before the already-known crash-persistence
 // failure. That assertion stays mandatory and still fails the complete gate.
 for(let trial=1;trial<=5;trial++){await pendingSurvivesTermination();report.pendingPersistenceTrials=trial;}
 report.status='PASS';report.performanceAcceptance='PENDING: inspect renderer ownership and evaluate baseline/trend; collecting numbers alone is not P0 closure';
}catch(error){report.status='FAIL';report.error=error.stack;if(report.fixtureOwnershipVerified){
 await shot('native-cycle-failure').catch(()=>{});
 report.failureFavorites=await favorites().catch(()=>null);
 report.failureInFlight=await lab.page(`return JSON.parse(localStorage.getItem('cocowash-android-favorites-inflight-v1')||'{}');`).catch(()=>null);
 report.failureNativeFavorite=await lab.call('assets').then(r=>r.assets.find(a=>a.id===report.lastQueuedFavorite)?.favorite??null).catch(()=>null);
 await fs.writeFile(`${OUT}/system-request-log.txt`,await adb('logcat','-d','-s','CocoWash:I')).catch(()=>{});
 await adb('shell','uiautomator','dump','/sdcard/coco-failure.xml').then(()=>adb('shell','cat','/sdcard/coco-failure.xml')).then(r=>fs.writeFile(`${OUT}/failure-ui.xml`,r)).catch(()=>{});
 }process.exitCode=1;}
finally{
 if(report.fixtureOwnershipVerified){
  // Retain only existing debug method names/timestamps to investigate the
  // observed CPU failure. No payloads, IDs, new collector or changed budget.
  const raw=await adb('logcat','-d','-s','Capacitor/Plugin:V').catch(()=>'');
  const names=raw.split('\n').flatMap(line=>{const m=line.match(/^(\d\d-\d\d \S+).*pluginId: (\w+), methodName: (\w+)/);return m?[`${m[1]} ${m[2]}.${m[3]}`]:[];});
  await fs.writeFile(`${OUT}/native-method-names.txt`,names.join('\n'));
 }
 await fs.writeFile(`${OUT}/native-cycles.json`,JSON.stringify(report,null,2));lab?.close();
}
console.log('ANDROID_NATIVE_CYCLES_'+report.status,JSON.stringify({functionalCycles:report.functionalCycles??Math.max(0,rows.length-1),samples:rows.length,error:report.error}));
