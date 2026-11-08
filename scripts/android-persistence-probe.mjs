// Diagnostic only. Never restores app state from the experimental DB or changes
// the application to report success. No delete confirmations in these cases.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {adb,run,sleep,guardEmulator,connect,PKG} from '../mano/scripts/android-lab.mjs';
const OUT='build/android-startup',key='cocowash-library-session-v1',report={status:'NOT TESTED',boundary:'Owned hosted emulator only; synthetic library. Separate IndexedDB experiment is not a product fix.',cases:[]};let lab;
const stored=()=>lab.page(`return JSON.parse(localStorage.getItem('${key}'));`);
async function wait(expression,timeout=60000){let end=Date.now()+timeout;while(Date.now()<end){if(await lab.page(`return !!(${expression});`))return;await sleep(150);}throw Error('UI timeout: '+expression);}
async function click(selector){await wait(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&e.getBoundingClientRect().width>0;})()`);await lab.page(`document.querySelector(${JSON.stringify(selector)}).click();return true;`);}
async function resetPending(){if((await stored())?.record.pending.length){await click('#review-trigger');await click('.recover-all');await wait(`JSON.parse(localStorage.getItem('${key}')).record.pending.length===0`);await click('.native-sheet header button');}}
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function strictSnapshot(){return lab.page(`
const open=indexedDB.open('cocowash-ci-durability-probe',1);
const db=await new Promise((resolve,reject)=>{open.onupgradeneeded=()=>open.result.createObjectStore('snapshots');open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
const transaction=db.transaction(['snapshots'],'readwrite',{durability:'strict'}),durability=transaction.durability,start=performance.now();
transaction.objectStore('snapshots').put(localStorage.getItem('${key}'),'candidate');
await new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);});db.close();
return {durability,commitMs:performance.now()-start};`);}
async function strictRead(){return lab.page(`const open=indexedDB.open('cocowash-ci-durability-probe',1);const db=await new Promise((resolve,reject)=>{open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});const read=db.transaction(['snapshots'],'readonly').objectStore('snapshots').get('candidate');const value=await new Promise((resolve,reject)=>{read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);});db.close();return value?JSON.parse(value):null;`);}
async function scenario(mode){
 await resetPending();const nativeBefore=(await lab.call('assets')).assets.map(a=>a.id).sort();await click('.bar-discard');await wait(`JSON.parse(localStorage.getItem('${key}'))?.record.pending.length===1`);
 const before=await stored(),row={mode,beforePending:before.record.pending.length,beforeRecordSha256:hash(before.record)};
 if(mode==='strict-journal-experiment'){row.journal=await strictSnapshot();assert.equal(row.journal.durability,'strict','Engine must actually expose strict durability');}
 if(mode==='background-six-seconds'){await adb('shell','input','keyevent','3');await sleep(6000);}
 lab.close();await adb('shell','am','force-stop',PKG);await adb('shell','am','start','-W','-n',PKG+'/.MainActivity');await sleep(3000);lab=await connect();
 await wait(`!!document.querySelector('.photo-card.front')`);
 const boot=await lab.page(`return window.__COCO_BOOT_STORAGE??null;`);assert.ok(boot,'Missing read-only before-React observer');
 const bootEnvelope=boot.canonical?JSON.parse(boot.canonical):null,after=await stored();row.bootPending=bootEnvelope?.record?.pending.length??null;row.afterPending=after?.record.pending.length??null;row.bootRecordSha256=hash(bootEnvelope?.record);row.afterRecordSha256=hash(after.record);row.applicationRetained=JSON.stringify(after.record.pending)===JSON.stringify(before.record.pending);
 assert.deepEqual((await lab.call('assets')).assets.map(a=>a.id).sort(),nativeBefore,'Diagnostic must not mutate MediaStore');
 if(mode==='strict-journal-experiment'){const journal=await strictRead();row.experimentalJournalRetained=JSON.stringify(journal?.record.pending)===JSON.stringify(before.record.pending);}
 report.cases.push(row);await fs.writeFile(`${OUT}/persistence-probe.json`,JSON.stringify(report,null,2));
}
try{
 await guardEmulator();lab=await connect();const assets=(await lab.call('assets')).assets;assert.ok(assets.length>=40);
 for(const asset of assets){const metadata=await lab.call('metadata',{id:asset.id});assert.match(metadata.filename??'',/^(cocowash-test-\d+\.png|Screenshot_cocowash-test\.png|cocowash-test\.mp4|e2e\.png|ad\.png)$/i);}
 for(let i=0;i<10&&await lab.page(`return !!document.querySelector('.ob-next');`);i++){await click('.ob-next');await sleep(1200);}
 await wait(`!!document.querySelector('.photo-card.front')`);await sleep(8000);
 for(const mode of ['immediate-force-stop','background-six-seconds','strict-journal-experiment'])await scenario(mode);
 report.status=report.cases.every(r=>r.applicationRetained)?'PASS':'FAIL';report.diagnosticsExecuted=true;
}catch(error){report.status='FAIL';report.error=String(error.stack);}
finally{lab?.close();await fs.writeFile(`${OUT}/persistence-probe.json`,JSON.stringify(report,null,2));}
console.log('NATIVE_PERSISTENCE_APPLICATION_'+report.status,JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1;
